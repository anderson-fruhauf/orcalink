import type { WASocket } from '@whiskeysockets/baileys';

export type WhatsappSocket = WASocket;

export interface WhatsappProvider {
  /** Abre conexão efêmera para pareamento e emite QR via callback (onboarding). */
  pair(
    tenantId: string,
    onQr: (qrBase64: string) => void,
    onReconnecting?: () => void,
    abortSignal?: AbortSignal,
  ): Promise<{ connectedNumber: string }>;

  /** Restaura credenciais salvas, conecta, executa `fn`, e fecha a conexão. */
  withConnection<T>(
    tenantId: string,
    fn: (sock: WhatsappSocket) => Promise<T>,
  ): Promise<T>;

  disconnect(tenantId: string): Promise<void>;
}

export const WHATSAPP_PROVIDER = Symbol('WHATSAPP_PROVIDER');
