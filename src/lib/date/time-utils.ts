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

/**
 * Formats a duration in minutes into a human-readable string in Portuguese.
 * Examples: 15 -> "15 min", 60 -> "1 hora", 90 -> "1h 30min", 120 -> "2 horas"
 */
export function formatDuration(minutes: number): string {
  if (minutes <= 0) return '0 min';

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return `${mins} min`;
  }

  if (mins === 0) {
    return hours === 1 ? '1 hora' : `${hours} horas`;
  }

  return `${hours}h ${mins}min`;
}

/**
 * Adds an offset in minutes to an `HH:mm` time string.
 * Returns null if input time is invalid. Clamps result to [00:00, 23:59].
 */
export function addMinutesToTime(time: string, minutesToAdd: number): string | null {
  const startMin = timeToMinutes(time);
  if (startMin === null) return null;
  const target = Math.max(0, Math.min(1439, startMin + minutesToAdd));
  return minutesToTime(target);
}

/**
 * Calculates a new end time given a start time and a duration in minutes.
 * Returns null if start time is invalid or duration <= 0.
 */
export function calculateEndTime(startTime: string, durationMin: number): string | null {
  if (durationMin <= 0) return null;
  const startMin = timeToMinutes(startTime);
  if (startMin === null) return null;
  const target = Math.min(1439, startMin + durationMin);
  return minutesToTime(target);
}

