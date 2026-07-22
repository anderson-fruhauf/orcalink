import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service.js';
import { TenantContext } from '../../common/context/tenant-context.js';
import {
  NOT_FOUND_MESSAGE,
  PLAN_LIMIT_MESSAGE,
  WHATSAPP_DISABLED_MESSAGE,
} from '../../common/constants/error-messages.js';
import { isWhatsappCryptoConfigured } from './whatsapp-crypto.js';
import {
  WHATSAPP_PROVIDER,
  type WhatsappProvider,
  type WhatsappSocket,
} from './whatsapp-provider.interface.js';
import { maskPhoneForLog, normalizePhoneToJid } from './whatsapp-phone.js';

function getSendThrottleMs(): number {
  const raw = process.env['WHATSAPP_SEND_THROTTLE_MS'];
  const parsed = raw ? Number.parseInt(raw, 10) : 2000;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 2000;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mapPairErrorMessage(error: unknown): string {
  if (
    error instanceof ServiceUnavailableException ||
    error instanceof ForbiddenException
  ) {
    return error.message;
  }

  if (error instanceof Error) {
    switch (error.message) {
      case 'WHATSAPP_PAIR_TIMEOUT':
        return 'Tempo esgotado. Escaneie o QR Code antes que ele expire e tente novamente.';
      case 'WHATSAPP_CONNECTION_CLOSED':
        return 'A conexão com o WhatsApp foi encerrada. Tente novamente.';
      case 'WHATSAPP_LOGGED_OUT':
        return 'Sessão invalidada. Escaneie um novo QR Code para reconectar.';
      case 'WHATSAPP_CONNECTION_REPLACED':
        return 'Outra conexão substituiu esta sessão. Feche o modal e tente novamente.';
      case 'WHATSAPP_MULTIDEVICE_MISMATCH':
        return 'Não foi possível vincular este aparelho. Remova dispositivos antigos no WhatsApp e tente novamente.';
      case 'WHATSAPP_PAIR_RECONNECT_LIMIT':
        return 'Não foi possível confirmar o pareamento. Tente gerar um novo QR Code.';
      default:
        break;
    }
  }

  return 'Não foi possível conectar o WhatsApp. Tente novamente em instantes.';
}

export interface WhatsappSendResult {
  sentIds: string[];
  fallbackToEmail: string[];
}

export interface WhatsappStatusResponse {
  state: 'DISCONNECTED' | 'QR_PENDING' | 'CONNECTED' | 'ERROR';
  connectedNumber: string | null;
  lastConnectedAt: string | null;
}

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(WHATSAPP_PROVIDER)
    private readonly provider: WhatsappProvider,
  ) {}

  connect(
    tenantId: string,
    abortSignal?: AbortSignal,
  ): Observable<MessageEvent> {
    return new Observable((subscriber) => {
      void this.runConnect(tenantId, subscriber, abortSignal);
    });
  }

  async getStatus(tenantId: string): Promise<WhatsappStatusResponse> {
    await this.assertWhatsappAccess(tenantId);

    const session = await this.prisma.whatsappSession.findUnique({
      where: { tenantId },
    });

    if (!session) {
      return {
        state: 'DISCONNECTED',
        connectedNumber: null,
        lastConnectedAt: null,
      };
    }

    return {
      state: session.state,
      connectedNumber: session.connectedNumber,
      lastConnectedAt: session.lastConnectedAt?.toISOString() ?? null,
    };
  }

  async disconnect(tenantId: string): Promise<WhatsappStatusResponse> {
    await this.assertWhatsappAccess(tenantId);

    await this.provider.disconnect(tenantId);

    return {
      state: 'DISCONNECTED',
      connectedNumber: null,
      lastConnectedAt: null,
    };
  }

  async sendQuotationMessages(
    tenantId: string,
    quotationId: string,
    quotationSupplierIds?: string[],
  ): Promise<WhatsappSendResult> {
    return TenantContext.run(tenantId, () =>
      this.runSendQuotationMessages(
        tenantId,
        quotationId,
        quotationSupplierIds,
      ),
    );
  }

  private async runSendQuotationMessages(
    tenantId: string,
    quotationId: string,
    quotationSupplierIds?: string[],
  ): Promise<WhatsappSendResult> {
    const sentIds: string[] = [];
    const fallbackToEmail: string[] = [];

    const canSend = await this.canSendWhatsapp(tenantId);
    if (!canSend) {
      const unavailable = await this.loadWhatsappSuppliers(
        quotationId,
        quotationSupplierIds,
      );
      for (const qs of unavailable) {
        await this.markWhatsappFailure(qs.id, 'WHATSAPP_NOT_CONNECTED');
        fallbackToEmail.push(qs.id);
      }
      return { sentIds, fallbackToEmail };
    }

    const suppliers = await this.loadWhatsappSuppliers(
      quotationId,
      quotationSupplierIds,
    );

    if (suppliers.length === 0) {
      return { sentIds, fallbackToEmail };
    }

    const validTargets: Array<{
      qsId: string;
      jid: string;
      message: string;
      maskedPhone: string;
    }> = [];

    for (const qs of suppliers) {
      const jid = normalizePhoneToJid(qs.supplier.phone);
      if (!jid) {
        this.logger.warn(
          `WhatsApp fallback: invalid phone for supplier ${qs.supplierId}`,
        );
        await this.markWhatsappFailure(qs.id, 'WHATSAPP_INVALID_PHONE');
        fallbackToEmail.push(qs.id);
        continue;
      }

      try {
        const message = await this.buildQuotationMessage(qs);
        validTargets.push({
          qsId: qs.id,
          jid,
          message,
          maskedPhone: maskPhoneForLog(qs.supplier.phone),
        });
      } catch (error) {
        const reason =
          error instanceof Error
            ? error.message
            : 'WHATSAPP_MESSAGE_BUILD_FAILED';
        await this.markWhatsappFailure(qs.id, reason);
        fallbackToEmail.push(qs.id);
      }
    }

    if (validTargets.length === 0) {
      return { sentIds, fallbackToEmail };
    }

    try {
      await this.provider.withConnection(tenantId, async (sock) => {
        for (let index = 0; index < validTargets.length; index += 1) {
          const target = validTargets[index];
          try {
            await this.sendMessageWithRetry(sock, target.jid, target.message);
            await this.prisma.quotationSupplier.update({
              where: { id: target.qsId },
              data: {
                whatsappSentAt: new Date(),
                whatsappError: null,
                sentAt: new Date(),
              },
            });
            sentIds.push(target.qsId);
            this.logger.log(
              `WhatsApp message sent for quotation supplier ${target.qsId} (${target.maskedPhone})`,
            );
          } catch (error) {
            const reason =
              error instanceof Error ? error.message : 'WHATSAPP_SEND_FAILED';
            this.logger.warn(
              `WhatsApp send failed for quotation supplier ${target.qsId}: ${reason}`,
            );
            await this.markWhatsappFailure(target.qsId, reason);
            fallbackToEmail.push(target.qsId);
          }

          if (index < validTargets.length - 1) {
            await sleep(getSendThrottleMs());
          }
        }
      });
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : 'WHATSAPP_CONNECTION_FAILED';
      this.logger.warn(
        `WhatsApp connection failed for quotation ${quotationId}: ${reason}`,
      );

      for (const target of validTargets) {
        if (sentIds.includes(target.qsId)) continue;
        await this.markWhatsappFailure(target.qsId, reason);
        if (!fallbackToEmail.includes(target.qsId)) {
          fallbackToEmail.push(target.qsId);
        }
      }
    }

    return { sentIds, fallbackToEmail };
  }

  private async canSendWhatsapp(tenantId: string): Promise<boolean> {
    if (process.env['WHATSAPP_ENABLED'] !== 'true') {
      return false;
    }

    if (!isWhatsappCryptoConfigured()) {
      return false;
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true },
    });

    if (!tenant || tenant.plan === 'FREE') {
      return false;
    }

    const session = await this.prisma.whatsappSession.findUnique({
      where: { tenantId },
    });

    return session?.state === 'CONNECTED' && !!session.creds;
  }

  private loadWhatsappSuppliers(
    quotationId: string,
    quotationSupplierIds?: string[],
  ) {
    return this.prisma.quotationSupplier.findMany({
      where: {
        quotationId,
        channel: 'WHATSAPP',
        ...(quotationSupplierIds?.length
          ? { id: { in: quotationSupplierIds } }
          : {}),
      },
      include: {
        supplier: true,
        quotation: {
          include: {
            tenant: true,
          },
        },
      },
    });
  }

  private async buildQuotationMessage(qs: {
    supplierId: string;
    quotationId: string;
    supplier: {
      contactName: string | null;
      name: string;
    };
    quotation: {
      title: string;
      deadline: Date;
      tenant: { name: string };
    };
  }): Promise<string> {
    const magicLink = await this.prisma.magicLink.findFirst({
      where: {
        quotationId: qs.quotationId,
        supplierId: qs.supplierId,
        active: true,
      },
    });

    if (!magicLink) {
      throw new Error('WHATSAPP_MAGIC_LINK_NOT_FOUND');
    }

    const appUrl = process.env['APP_URL'] || 'http://localhost:5173';
    const magicLinkUrl = `${appUrl}/v/${magicLink.token}`;
    const contact = qs.supplier.contactName || qs.supplier.name;
    const deadlineStr = new Date(qs.quotation.deadline).toLocaleDateString(
      'pt-BR',
      {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      },
    );

    return [
      `Olá, ${contact}! 👋`,
      `A empresa *${qs.quotation.tenant.name}* solicita uma cotação de preços.`,
      '',
      `*${qs.quotation.title}*`,
      `Prazo: ${deadlineStr}`,
      '',
      'Preencha sua proposta pelo link:',
      magicLinkUrl,
    ].join('\n');
  }

  private async sendMessageWithRetry(
    sock: WhatsappSocket,
    jid: string,
    text: string,
  ): Promise<void> {
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const onWhatsApp = await sock.onWhatsApp(jid);
        if (!onWhatsApp[0]?.exists) {
          throw new Error('WHATSAPP_NUMBER_NOT_FOUND');
        }

        await sock.sendMessage(jid, { text });
        return;
      } catch (error) {
        if (attempt === maxAttempts) {
          throw error;
        }
        await sleep(1000);
      }
    }
  }

  private async markWhatsappFailure(
    quotationSupplierId: string,
    reason: string,
  ): Promise<void> {
    await this.prisma.quotationSupplier.update({
      where: { id: quotationSupplierId },
      data: { whatsappError: reason },
    });
  }

  private async runConnect(
    tenantId: string,
    subscriber: {
      next: (value: MessageEvent) => void;
      error: (err: unknown) => void;
      complete: () => void;
    },
    abortSignal?: AbortSignal,
  ): Promise<void> {
    try {
      if (abortSignal?.aborted) {
        subscriber.complete();
        return;
      }

      await this.assertWhatsappAccess(tenantId);

      // Limpa credenciais parciais para forçar novo pareamento via QR.
      await this.prisma.whatsappAuthKey.deleteMany({ where: { tenantId } });
      await this.prisma.whatsappSession.upsert({
        where: { tenantId },
        create: { tenantId, state: 'QR_PENDING' },
        update: {
          state: 'QR_PENDING',
          creds: null,
          connectedNumber: null,
          lastConnectedAt: null,
        },
      });

      subscriber.next({
        data: JSON.stringify({ type: 'STATUS', state: 'QR_PENDING' }),
      });

      const { connectedNumber } = await this.provider.pair(
        tenantId,
        (qrBase64) => {
          subscriber.next({
            data: JSON.stringify({ type: 'QR', qrBase64 }),
          });
        },
        () => {
          subscriber.next({
            data: JSON.stringify({ type: 'STATUS', state: 'RECONNECTING' }),
          });
        },
        abortSignal,
      );

      await this.prisma.whatsappSession.update({
        where: { tenantId },
        data: {
          state: 'CONNECTED',
          connectedNumber,
          lastConnectedAt: new Date(),
        },
      });

      subscriber.next({
        data: JSON.stringify({
          type: 'CONNECTED',
          connectedNumber,
        }),
      });
      subscriber.complete();
    } catch (error) {
      if (
        abortSignal?.aborted ||
        (error instanceof Error && error.message === 'WHATSAPP_PAIR_CANCELLED')
      ) {
        subscriber.complete();
        return;
      }

      this.logger.error(
        'WhatsApp pairing failed',
        error instanceof Error ? error.stack : String(error),
      );

      if (this.prisma.whatsappSession) {
        await this.prisma.whatsappSession
          .update({
            where: { tenantId },
            data: { state: 'ERROR' },
          })
          .catch(() => undefined);
      }

      const message = mapPairErrorMessage(error);

      subscriber.next({
        data: JSON.stringify({
          type: 'ERROR',
          message,
        }),
      });
      subscriber.complete();
    }
  }

  private async assertWhatsappAccess(tenantId: string): Promise<void> {
    if (process.env['WHATSAPP_ENABLED'] !== 'true') {
      this.logger.warn(
        `WhatsApp unavailable: WHATSAPP_ENABLED=${process.env['WHATSAPP_ENABLED'] ?? '(unset)'}`,
      );
      throw new ServiceUnavailableException(WHATSAPP_DISABLED_MESSAGE);
    }

    if (!isWhatsappCryptoConfigured()) {
      this.logger.warn(
        'WhatsApp unavailable: WHATSAPP_CREDENTIALS_ENCRYPTION_KEY is not configured',
      );
      throw new ServiceUnavailableException(WHATSAPP_DISABLED_MESSAGE);
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true },
    });

    if (!tenant) {
      throw new ForbiddenException(NOT_FOUND_MESSAGE);
    }

    if (tenant.plan === 'FREE') {
      throw new ForbiddenException(PLAN_LIMIT_MESSAGE);
    }
  }
}
