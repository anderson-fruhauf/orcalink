/** Normaliza telefone brasileiro para JID do Baileys (`55DDDNUMERO@s.whatsapp.net`). */
export function normalizePhoneToJid(
  phone: string | null | undefined,
): string | null {
  if (!phone) return null;

  let digits = phone.replace(/\D/g, '');
  if (!digits) return null;

  if (digits.startsWith('0')) {
    digits = digits.replace(/^0+/, '');
  }

  if (digits.length <= 11) {
    digits = `55${digits}`;
  }

  if (digits.length < 12 || digits.length > 15) {
    return null;
  }

  return `${digits}@s.whatsapp.net`;
}

export function maskPhoneForLog(phone: string | null | undefined): string {
  if (!phone) return '***';
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 4) return '***';
  return `***${digits.slice(-4)}`;
}
