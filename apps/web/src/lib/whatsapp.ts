import { auth } from './firebase.js';

export type WhatsappConnectionState =
  | 'DISCONNECTED'
  | 'QR_PENDING'
  | 'CONNECTED'
  | 'ERROR';

export interface WhatsappStatus {
  state: WhatsappConnectionState;
  connectedNumber: string | null;
  lastConnectedAt: string | null;
}

export type WhatsappConnectEvent =
  | { type: 'STATUS'; state: WhatsappConnectionState | 'RECONNECTING' }
  | { type: 'QR'; qrBase64: string }
  | { type: 'CONNECTED'; connectedNumber: string }
  | { type: 'ERROR'; message: string };

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export async function fetchWhatsappStatus(): Promise<WhatsappStatus> {
  const { default: api } = await import('./api.js');
  const response = await api.get<WhatsappStatus>('/whatsapp/status');
  return response.data;
}

export async function disconnectWhatsapp(): Promise<WhatsappStatus> {
  const { default: api } = await import('./api.js');
  const response = await api.post<WhatsappStatus>('/whatsapp/disconnect');
  return response.data;
}

export async function connectWhatsappStream(
  onEvent: (event: WhatsappConnectEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Usuário não autenticado.');
  }

  const token = await user.getIdToken();
  const response = await fetch(`${API_BASE}/whatsapp/connect`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'text/event-stream',
    },
    signal,
  });

  if (!response.ok) {
    let message = 'Não foi possível iniciar a conexão com o WhatsApp.';
    try {
      const body = await response.json();
      if (body?.message) {
        message = Array.isArray(body.message) ? body.message[0] : body.message;
      }
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  if (!response.body) {
    throw new Error('Resposta de conexão inválida.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let receivedProgress = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() ?? '';

    for (const chunk of chunks) {
      const dataLine = chunk
        .split('\n')
        .find((line) => line.startsWith('data:'));
      if (!dataLine) continue;

      const payload = dataLine.replace(/^data:\s*/, '').trim();
      if (!payload) continue;

      try {
        const event = JSON.parse(payload) as WhatsappConnectEvent;
        if (
          event.type === 'QR' ||
          event.type === 'CONNECTED' ||
          event.type === 'ERROR'
        ) {
          receivedProgress = true;
        }
        onEvent(event);
      } catch {
        // ignore malformed events
      }
    }
  }

  if (!receivedProgress && !signal?.aborted) {
    throw new Error('Conexão encerrada antes de gerar o QR Code.');
  }
}
