/**
 * Time utility functions for the agenda domain.
 *
 * Internal calculations use integer minutes-from-midnight.
 * Domain/persisted values remain human-readable `HH:mm`.
 */

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/**
 * Convert `HH:mm` string to minutes from midnight.
 * Returns `null` for invalid input.
 */
export function timeToMinutes(time: string): number | null {
  const match = TIME_REGEX.exec(time);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours * 60 + minutes;
}

/**
 * Convert minutes from midnight to `HH:mm` string.
 * Clamps to valid range [0, 1439].
 */
export function minutesToTime(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(1439, Math.round(totalMinutes)));
  const hours = Math.floor(clamped / 60);
  const minutes = clamped % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/** Validate that a string matches `HH:mm` 24-hour format. */
export function isValidTime(time: string): boolean {
  return TIME_REGEX.test(time);
}

/** Validate that a string matches `YYYY-MM-DD` format. */
export function isValidDate(date: string): boolean {
  if (!DATE_REGEX.test(date)) return false;
  // Check that the date actually exists (e.g. reject 2024-02-30)
  const parsed = new Date(date + 'T00:00:00');
  if (isNaN(parsed.getTime())) return false;
  const [year, month, day] = date.split('-').map(Number);
  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() + 1 === month &&
    parsed.getDate() === day
  );
}

/**
 * Calculate the duration in minutes between two `HH:mm` times.
 * Returns `null` if either time is invalid.
 */
export function durationMinutes(startTime: string, endTime: string): number | null {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (start === null || end === null) return null;
  return end - start;
}
