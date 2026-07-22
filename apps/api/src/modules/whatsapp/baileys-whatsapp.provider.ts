import { Injectable, Logger } from '@nestjs/common';
import makeWASocket, {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  type AuthenticationState,
  type WASocket,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import type { Logger as PinoLogger } from 'pino';
import { PrismaService } from '../../prisma/prisma.service.js';
import { makePrismaAuthState } from './prisma-auth-state.js';
import type {
  WhatsappProvider,
  WhatsappSocket,
} from './whatsapp-provider.interface.js';

function getConnectTimeoutMs(): number {
  const raw = process.env['WHATSAPP_CONNECT_TIMEOUT_MS'];
  const parsed = raw ? Number.parseInt(raw, 10) : 15000;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 15000;
}

function getPairTimeoutMs(): number {
  const raw = process.env['WHATSAPP_PAIR_TIMEOUT_MS'];
  const parsed = raw ? Number.parseInt(raw, 10) : 120000;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 120000;
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function extractConnectedNumber(sock: WASocket): string {
  const jid = sock.user?.id || '';
  const normalized = jid.split(':')[0]?.split('@')[0] || '';
  return normalized ? `+${normalized}` : '';
}

function getDisconnectStatusCode(lastDisconnect: unknown): number | undefined {
  return (lastDisconnect as { error?: Boom } | undefined)?.error?.output
    ?.statusCode;
}

const PAIR_RECONNECT_CODES = new Set<number>([
  DisconnectReason.restartRequired,
  DisconnectReason.connectionClosed,
  DisconnectReason.connectionLost,
  DisconnectReason.timedOut,
]);

function isPairReconnectCode(statusCode: number | undefined): boolean {
  return statusCode !== undefined && PAIR_RECONNECT_CODES.has(statusCode);
}

function pairReconnectDelayMs(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 1500));
}

const PAIR_FATAL_CODES = new Set<number>([
  DisconnectReason.loggedOut,
  DisconnectReason.connectionReplaced,
  DisconnectReason.multideviceMismatch,
  DisconnectReason.forbidden,
  DisconnectReason.badSession,
]);

function shouldPairReconnect(
  statusCode: number | undefined,
  qrScanned: boolean,
): boolean {
  if (statusCode !== undefined && PAIR_FATAL_CODES.has(statusCode)) {
    return false;
  }
  if (qrScanned) {
    return true;
  }
  return isPairReconnectCode(statusCode);
}

function getDisconnectErrorMessage(
  lastDisconnect: unknown,
): string | undefined {
  return (lastDisconnect as { error?: Boom } | undefined)?.error?.message;
}

function buildSocketConfig(
  version: [number, number, number],
  auth: AuthenticationState,
  logger: PinoLogger,
) {
  return {
    version,
    auth,
    logger,
    printQRInTerminal: false,
    browser: Browsers.macOS('Chrome'),
    syncFullHistory: false,
    markOnlineOnConnect: false,
    connectTimeoutMs: 20000,
    defaultQueryTimeoutMs: 60000,
    getMessage: () => Promise.resolve(undefined),
  };
}

@Injectable()
export class BaileysWhatsappProvider implements WhatsappProvider {
  private readonly logger = new Logger(BaileysWhatsappProvider.name);
  private readonly baileysLogger = pino({ level: 'silent' });
  private readonly tenantLocks = new Map<string, Promise<unknown>>();
  private readonly inFlightPairAbort = new Map<string, AbortController>();

  constructor(private readonly prisma: PrismaService) {}

  async pair(
    tenantId: string,
    onQr: (qrBase64: string) => void,
    onReconnecting?: () => void,
    abortSignal?: AbortSignal,
  ): Promise<{ connectedNumber: string }> {
    this.cancelInFlightPair(tenantId);

    const pairAbort = new AbortController();
    this.inFlightPairAbort.set(tenantId, pairAbort);

    const relayAbort = (): void => pairAbort.abort();
    abortSignal?.addEventListener('abort', relayAbort, { once: true });

    try {
      return await this.withTenantLock(tenantId, () =>
        this.runPair(tenantId, onQr, onReconnecting, pairAbort.signal),
      );
    } finally {
      abortSignal?.removeEventListener('abort', relayAbort);
      if (this.inFlightPairAbort.get(tenantId) === pairAbort) {
        this.inFlightPairAbort.delete(tenantId);
      }
    }
  }

  async withConnection<T>(
    tenantId: string,
    fn: (sock: WhatsappSocket) => Promise<T>,
  ): Promise<T> {
    return this.withTenantLock(tenantId, () =>
      this.runWithConnection(tenantId, fn),
    );
  }

  async disconnect(tenantId: string): Promise<void> {
    return this.withTenantLock(tenantId, async () => {
      const session = await this.prisma.whatsappSession.findUnique({
        where: { tenantId },
      });

      if (session?.creds) {
        try {
          await this.runWithConnection(tenantId, async (sock) => {
            await sock.logout();
          });
        } catch {
          // Sessão pode já estar inválida — segue limpando credenciais locais.
        }
      }

      await this.clearSession(tenantId);
    });
  }

  private cancelInFlightPair(tenantId: string): void {
    this.inFlightPairAbort.get(tenantId)?.abort();
  }

  private async runPair(
    tenantId: string,
    onQr: (qrBase64: string) => void,
    onReconnecting?: () => void,
    abortSignal?: AbortSignal,
  ): Promise<{ connectedNumber: string }> {
    if (abortSignal?.aborted) {
      throw new Error('WHATSAPP_PAIR_CANCELLED');
    }

    this.logger.log(`Starting WhatsApp pair for tenant ${tenantId}`);

    const versionPromise = fetchLatestBaileysVersion();
    abortSignal?.addEventListener(
      'abort',
      () => {
        void versionPromise.catch(() => undefined);
      },
      { once: true },
    );

    const { version } = await versionPromise;

    if (abortSignal?.aborted) {
      throw new Error('WHATSAPP_PAIR_CANCELLED');
    }

    const deadline = Date.now() + getPairTimeoutMs();
    const auth = await makePrismaAuthState(
      tenantId,
      this.prisma,
      this.baileysLogger,
    );
    let credsSaveChain = Promise.resolve();

    return new Promise<{ connectedNumber: string }>((resolve, reject) => {
      let settled = false;
      let currentSock: WASocket | null = null;
      let qrEmitted = false;
      let postScanReconnects = 0;
      const maxPostScanReconnects = 15;

      const queueSaveCreds = (): void => {
        credsSaveChain = credsSaveChain.then(() => auth.saveCreds());
      };

      const saveAuthState = async (): Promise<void> => {
        queueSaveCreds();
        await credsSaveChain;
        await auth.flushPendingWrites();
      };

      const persistBeforeReconnect = async (): Promise<void> => {
        await saveAuthState();
        await pairReconnectDelayMs();
      };

      const cleanupCurrentSocket = (): void => {
        if (!currentSock) return;
        currentSock.ev.removeAllListeners('connection.update');
        currentSock.ev.removeAllListeners('creds.update');
        void currentSock.ws?.close?.();
        currentSock = null;
      };

      const fail = (error: Error): void => {
        if (settled) return;
        settled = true;
        cleanupCurrentSocket();
        reject(error);
      };

      const ensureNotAborted = (): boolean => {
        if (abortSignal?.aborted) {
          fail(new Error('WHATSAPP_PAIR_CANCELLED'));
          return true;
        }
        return false;
      };

      abortSignal?.addEventListener(
        'abort',
        () => fail(new Error('WHATSAPP_PAIR_CANCELLED')),
        { once: true },
      );

      const startSocket = (): void => {
        if (settled || ensureNotAborted()) return;

        if (Date.now() > deadline) {
          fail(new Error('WHATSAPP_PAIR_TIMEOUT'));
          return;
        }

        cleanupCurrentSocket();

        const sock = makeWASocket(
          buildSocketConfig(version, auth.state, this.baileysLogger),
        );
        currentSock = sock;

        sock.ev.on('creds.update', queueSaveCreds);

        sock.ev.on('connection.update', (update) => {
          void (async () => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
              try {
                const QRCode = await import('qrcode');
                const qrBase64 = await QRCode.toDataURL(qr, {
                  margin: 2,
                  width: 280,
                });
                if (!qrEmitted) {
                  qrEmitted = true;
                  this.logger.log(
                    `WhatsApp QR generated for tenant ${tenantId}`,
                  );
                } else {
                  this.logger.warn(
                    `WhatsApp emitted a new QR after scan for tenant ${tenantId}`,
                  );
                }
                onQr(qrBase64);
              } catch (error) {
                this.logger.error(
                  'Failed to generate QR code image',
                  error instanceof Error ? error.stack : String(error),
                );
              }
            }

            if (connection === 'open') {
              if (settled) return;
              settled = true;
              try {
                await saveAuthState();
                const connectedNumber = extractConnectedNumber(sock);
                cleanupCurrentSocket();
                this.logger.log(
                  `WhatsApp pair completed for tenant ${tenantId} (${connectedNumber})`,
                );
                resolve({ connectedNumber });
              } catch (error) {
                fail(toError(error));
              }
            }

            if (connection === 'close') {
              if (settled) return;

              const statusCode = getDisconnectStatusCode(lastDisconnect);
              const reason = getDisconnectErrorMessage(lastDisconnect);
              this.logger.warn(
                `WhatsApp pair connection closed (code: ${statusCode ?? 'unknown'}, reason: ${reason ?? 'n/a'}, qrScanned: ${qrEmitted})`,
              );

              if (statusCode === DisconnectReason.loggedOut) {
                fail(new Error('WHATSAPP_LOGGED_OUT'));
                return;
              }

              if (statusCode === DisconnectReason.connectionReplaced) {
                fail(new Error('WHATSAPP_CONNECTION_REPLACED'));
                return;
              }

              if (statusCode === DisconnectReason.multideviceMismatch) {
                fail(new Error('WHATSAPP_MULTIDEVICE_MISMATCH'));
                return;
              }

              if (shouldPairReconnect(statusCode, qrEmitted)) {
                if (ensureNotAborted()) return;

                postScanReconnects += 1;
                if (postScanReconnects > maxPostScanReconnects) {
                  fail(new Error('WHATSAPP_PAIR_RECONNECT_LIMIT'));
                  return;
                }

                this.logger.log(
                  `WhatsApp pair reconnecting for tenant ${tenantId} (attempt ${postScanReconnects})`,
                );
                await persistBeforeReconnect();
                onReconnecting?.();
                startSocket();
                return;
              }

              fail(new Error('WHATSAPP_CONNECTION_CLOSED'));
            }
          })();
        });
      };

      startSocket();
    });
  }

  private async runWithConnection<T>(
    tenantId: string,
    fn: (sock: WhatsappSocket) => Promise<T>,
  ): Promise<T> {
    const session = await this.prisma.whatsappSession.findUnique({
      where: { tenantId },
    });

    if (!session?.creds) {
      throw new Error('WHATSAPP_NOT_CONNECTED');
    }

    const { version } = await fetchLatestBaileysVersion();
    const deadline = Date.now() + getConnectTimeoutMs();

    return new Promise<T>((resolve, reject) => {
      let settled = false;
      let currentSock: WASocket | null = null;

      const cleanupCurrentSocket = (): void => {
        if (!currentSock) return;
        currentSock.ev.removeAllListeners('connection.update');
        currentSock.ev.removeAllListeners('creds.update');
        void currentSock.ws?.close?.();
        currentSock = null;
      };

      const fail = (error: Error): void => {
        if (settled) return;
        settled = true;
        cleanupCurrentSocket();
        reject(error);
      };

      const startSocket = (): void => {
        void (async () => {
          if (settled) return;

          if (Date.now() > deadline) {
            fail(new Error('WHATSAPP_CONNECT_TIMEOUT'));
            return;
          }

          cleanupCurrentSocket();

          const { state, saveCreds, flushPendingWrites } =
            await makePrismaAuthState(
              tenantId,
              this.prisma,
              this.baileysLogger,
            );

          const sock = makeWASocket(
            buildSocketConfig(version, state, this.baileysLogger),
          );
          currentSock = sock;

          sock.ev.on('creds.update', () => {
            void saveCreds();
          });

          sock.ev.on('connection.update', (update) => {
            void (async () => {
              const { connection, lastDisconnect } = update;

              if (connection === 'open') {
                try {
                  const result = await fn(sock);
                  await saveCreds();
                  await flushPendingWrites();
                  if (!settled) {
                    settled = true;
                    cleanupCurrentSocket();
                    resolve(result);
                  }
                } catch (error) {
                  fail(toError(error));
                }
              }

              if (connection === 'close') {
                if (settled) return;

                const statusCode = getDisconnectStatusCode(lastDisconnect);

                if (statusCode === DisconnectReason.loggedOut) {
                  await this.clearSession(tenantId);
                  fail(new Error('WHATSAPP_LOGGED_OUT'));
                  return;
                }

                if (statusCode === DisconnectReason.restartRequired) {
                  await saveCreds();
                  await flushPendingWrites();
                  await pairReconnectDelayMs();
                  startSocket();
                  return;
                }

                fail(new Error('WHATSAPP_CONNECTION_CLOSED'));
              }
            })();
          });
        })();
      };

      startSocket();
    });
  }

  private async clearSession(tenantId: string): Promise<void> {
    await this.prisma.whatsappAuthKey.deleteMany({ where: { tenantId } });
    await this.prisma.whatsappSession.updateMany({
      where: { tenantId },
      data: {
        state: 'DISCONNECTED',
        creds: null,
        connectedNumber: null,
        lastConnectedAt: null,
      },
    });
  }

  private async withTenantLock<T>(
    tenantId: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    const existing = this.tenantLocks.get(tenantId);
    if (existing) {
      await existing.catch(() => undefined);
    }

    const task = fn();
    this.tenantLocks.set(tenantId, task);

    try {
      return await task;
    } finally {
      if (this.tenantLocks.get(tenantId) === task) {
        this.tenantLocks.delete(tenantId);
      }
    }
  }
}
