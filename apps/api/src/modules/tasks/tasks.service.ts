import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { TenantContext } from '../../common/context/tenant-context.js';
import { MailService } from '../mail/mail.service.js';
import { WhatsappService } from '../whatsapp/whatsapp.service.js';
import { TASK_QUEUE, type TaskQueue } from './task-queue.interface.js';
import type {
  EmailDispatchDto,
  WhatsappDispatchDto,
} from './dto/dispatch-task.dto.js';

/** Falhas que retry não resolve — marcar FAILED e responder 200. */
export class PermanentDispatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PermanentDispatchError';
  }
}

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly whatsappService: WhatsappService,
    @Inject(TASK_QUEUE) private readonly taskQueue: TaskQueue,
  ) {}

  async handleEmailDispatch(
    dto: EmailDispatchDto,
  ): Promise<{ status: string }> {
    return TenantContext.run(dto.tenantId, async () => {
      const qs = await this.prisma.quotationSupplier.findFirst({
        where: {
          id: dto.quotationSupplierId,
          quotation: { tenantId: dto.tenantId },
        },
        include: {
          supplier: { select: { email: true } },
          quotation: { select: { status: true, tenantId: true } },
        },
      });

      if (!qs) {
        this.logger.warn(
          `Email dispatch skipped: QuotationSupplier ${dto.quotationSupplierId} not found`,
        );
        return { status: 'ignored' };
      }

      if (qs.dispatchStatus === 'SENT') {
        return { status: 'already_sent' };
      }

      if (qs.quotation.status !== 'OPEN') {
        await this.markEmailFailed(qs.id, 'QUOTATION_NOT_OPEN');
        return { status: 'failed' };
      }

      if (!qs.supplier.email?.trim()) {
        await this.markEmailFailed(qs.id, 'SUPPLIER_WITHOUT_EMAIL');
        return { status: 'failed' };
      }

      try {
        await this.mailService.sendEmail(qs.id, dto.kind ?? 'invite');
        return { status: 'sent' };
      } catch (error) {
        if (this.isPermanentMailError(error)) {
          await this.markEmailFailed(
            qs.id,
            error instanceof Error ? error.message : 'EMAIL_PERMANENT_FAILURE',
          );
          return { status: 'failed' };
        }

        throw new InternalServerErrorException(
          error instanceof Error ? error.message : 'EMAIL_TRANSIENT_FAILURE',
        );
      }
    });
  }

  async handleWhatsappDispatch(
    dto: WhatsappDispatchDto,
  ): Promise<{ status: string; sent: number; fallback: number }> {
    return TenantContext.run(dto.tenantId, async () => {
      const pendingIds = await this.resolvePendingWhatsappIds(dto);
      if (pendingIds.length === 0) {
        return { status: 'already_sent', sent: 0, fallback: 0 };
      }

      let result: { sentIds: string[]; fallbackToEmail: string[] };
      try {
        result = await this.whatsappService.sendQuotationMessages(
          dto.tenantId,
          dto.quotationId,
          pendingIds,
          dto.kind ?? 'invite',
        );
      } catch (error) {
        if (this.isPermanentWhatsappError(error)) {
          for (const id of pendingIds) {
            await this.enqueueEmailFallback(
              dto.tenantId,
              id,
              dto.correlationId,
              dto.kind ?? 'invite',
            );
          }
          return {
            status: 'fallback',
            sent: 0,
            fallback: pendingIds.length,
          };
        }

        throw new InternalServerErrorException(
          error instanceof Error ? error.message : 'WHATSAPP_TRANSIENT_FAILURE',
        );
      }

      for (const id of result.fallbackToEmail) {
        await this.enqueueEmailFallback(
          dto.tenantId,
          id,
          dto.correlationId,
          dto.kind ?? 'invite',
        );
      }

      return {
        status: 'processed',
        sent: result.sentIds.length,
        fallback: result.fallbackToEmail.length,
      };
    });
  }

  private async resolvePendingWhatsappIds(
    dto: WhatsappDispatchDto,
  ): Promise<string[]> {
    const suppliers = await this.prisma.quotationSupplier.findMany({
      where: {
        quotationId: dto.quotationId,
        quotation: { tenantId: dto.tenantId },
        id: { in: dto.quotationSupplierIds },
        channel: 'WHATSAPP',
      },
      select: {
        id: true,
        whatsappSentAt: true,
        dispatchStatus: true,
      },
    });

    return suppliers
      .filter((qs) => !qs.whatsappSentAt && qs.dispatchStatus !== 'SENT')
      .map((qs) => qs.id);
  }

  private async enqueueEmailFallback(
    tenantId: string,
    quotationSupplierId: string,
    correlationId?: string,
    kind: EmailDispatchDto['kind'] = 'invite',
  ): Promise<void> {
    await this.prisma.quotationSupplier.update({
      where: { id: quotationSupplierId },
      data: {
        dispatchStatus: 'QUEUED',
        emailError: null,
      },
    });

    await this.taskQueue.enqueue(
      'email-dispatch',
      {
        tenantId,
        quotationSupplierId,
        correlationId,
        kind,
      },
      {
        dedupeKey: `email-fallback:${quotationSupplierId}:${correlationId ?? 'na'}`,
      },
    );
  }

  private async markEmailFailed(
    quotationSupplierId: string,
    reason: string,
  ): Promise<void> {
    await this.prisma.quotationSupplier.update({
      where: { id: quotationSupplierId },
      data: {
        dispatchStatus: 'FAILED',
        emailError: reason,
      },
    });
  }

  private isPermanentMailError(error: unknown): boolean {
    if (error instanceof PermanentDispatchError) {
      return true;
    }

    const message = error instanceof Error ? error.message : String(error);
    return (
      message.includes('not found') ||
      message.includes('MagicLink') ||
      message.includes('QUOTATION_NOT_OPEN') ||
      message.includes('SUPPLIER_WITHOUT_EMAIL')
    );
  }

  private isPermanentWhatsappError(error: unknown): boolean {
    if (error instanceof PermanentDispatchError) {
      return true;
    }

    const message = error instanceof Error ? error.message : String(error);
    return (
      message.includes('WHATSAPP_MAGIC_LINK_NOT_FOUND') ||
      message.includes('WHATSAPP_INVALID_PHONE') ||
      message.includes('WHATSAPP_NUMBER_NOT_FOUND')
    );
  }
}
