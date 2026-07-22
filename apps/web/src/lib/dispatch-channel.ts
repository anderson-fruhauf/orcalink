import type { WhatsappStatus } from './whatsapp.js';

export type DispatchChannel = 'EMAIL' | 'WHATSAPP';

export type WhatsappDisableReason = 'plan' | 'session' | 'phone';

export function isValidSupplierPhone(phone?: string): boolean {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

export function getWhatsappDisableReason(
  isPro: boolean,
  whatsappStatus: WhatsappStatus | null,
  phone?: string,
): WhatsappDisableReason | null {
  if (!isPro) return 'plan';
  if (whatsappStatus?.state !== 'CONNECTED') return 'session';
  if (!isValidSupplierPhone(phone)) return 'phone';
  return null;
}

export function getWhatsappDisableMessage(
  reason: WhatsappDisableReason,
  supplierName: string,
): string {
  switch (reason) {
    case 'plan':
      return 'Disponível no plano Pro.';
    case 'session':
      return 'Conecte seu WhatsApp nas configurações ou pelo botão acima.';
    case 'phone':
      return `${supplierName} não possui telefone válido. Edite o cadastro do fornecedor.`;
    default:
      return '';
  }
}
