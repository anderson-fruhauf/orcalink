/** Fuso padrão do sistema (Brasília). IANA: America/Sao_Paulo — UTC−03:00 fixo desde 2019. */
const SYSTEM_OFFSET = '-03:00';

export const SYSTEM_TIME_ZONE = 'America/Sao_Paulo';

/**
 * Retorna a data civil (YYYY-MM-DD) de `date` no fuso padrão do sistema.
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SYSTEM_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Interpreta meia-noite (início do dia) da data civil `ymd` no fuso do sistema como Instant UTC.
 */
export function startOfDay(ymd: string): Date {
  return new Date(`${ymd}T00:00:00.000${SYSTEM_OFFSET}`);
}

/**
 * Soma `days` a uma data civil YYYY-MM-DD (calendário gregoriano).
 */
export function addCalendarDays(ymd: string, days: number): string {
  const [year, month, day] = ymd.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  const y = utc.getUTCFullYear();
  const m = String(utc.getUTCMonth() + 1).padStart(2, '0');
  const d = String(utc.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Janela [início, fim) do dia civil de amanhã no fuso do sistema, em UTC.
 */
export function getTomorrowBounds(now: Date = new Date()): {
  start: Date;
  end: Date;
  dateKey: string;
} {
  const todayKey = formatDate(now);
  const dateKey = addCalendarDays(todayKey, 1);
  const dayAfter = addCalendarDays(dateKey, 1);
  return {
    start: startOfDay(dateKey),
    end: startOfDay(dayAfter),
    dateKey,
  };
}

/**
 * True se o deadline cai na data civil de amanhã (fuso padrão do sistema).
 */
export function isDeadlineTomorrow(
  deadline: Date,
  now: Date = new Date(),
): boolean {
  const { dateKey } = getTomorrowBounds(now);
  return formatDate(deadline) === dateKey;
}
