import {
  addCalendarDays,
  formatDate,
  getTomorrowBounds,
  isDeadlineTomorrow,
  startOfDay,
} from './date.js';

describe('date', () => {
  it('formatDate returns YYYY-MM-DD in the system time zone', () => {
    // 2026-08-07 23:30 UTC = 2026-08-07 20:30 BRT
    expect(formatDate(new Date('2026-08-07T23:30:00.000Z'))).toBe('2026-08-07');
    // 2026-08-08 02:00 UTC = 2026-08-07 23:00 BRT
    expect(formatDate(new Date('2026-08-08T02:00:00.000Z'))).toBe('2026-08-07');
    // 2026-08-08 03:00 UTC = 2026-08-08 00:00 BRT
    expect(formatDate(new Date('2026-08-08T03:00:00.000Z'))).toBe('2026-08-08');
  });

  it('addCalendarDays advances civil dates', () => {
    expect(addCalendarDays('2026-08-07', 1)).toBe('2026-08-08');
    expect(addCalendarDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('startOfDay maps to UTC instant at midnight in the system time zone', () => {
    expect(startOfDay('2026-08-08').toISOString()).toBe(
      '2026-08-08T03:00:00.000Z',
    );
  });

  it('getTomorrowBounds covers tomorrow civil day', () => {
    const now = new Date('2026-08-07T15:00:00.000Z'); // 12:00 BRT
    const { start, end, dateKey } = getTomorrowBounds(now);
    expect(dateKey).toBe('2026-08-08');
    expect(start.toISOString()).toBe('2026-08-08T03:00:00.000Z');
    expect(end.toISOString()).toBe('2026-08-09T03:00:00.000Z');
  });

  it('isDeadlineTomorrow matches civil date', () => {
    const now = new Date('2026-08-07T15:00:00.000Z');
    expect(
      isDeadlineTomorrow(new Date('2026-08-08T18:00:00.000Z'), now),
    ).toBe(true);
    expect(
      isDeadlineTomorrow(new Date('2026-08-07T18:00:00.000Z'), now),
    ).toBe(false);
    expect(
      isDeadlineTomorrow(new Date('2026-08-09T12:00:00.000Z'), now),
    ).toBe(false);
  });
});
