/**
 * Pure utilities and constants for appointment forms.
 */

import type { Appointment, AppointmentStatus, ValidationError } from '@/domain/appointment';
import {
  isValidTime,
  timeToMinutes,
  minutesToTime,
} from '@/lib/date/time-utils';

export const DEFAULT_START_TIME = '09:00';
export const DEFAULT_END_TIME = '10:00';

export const DURATION_PRESETS = [
  { label: '15m', minutes: 15 },
  { label: '30m', minutes: 30 },
  { label: '45m', minutes: 45 },
  { label: '1h', minutes: 60 },
  { label: '1h30', minutes: 90 },
  { label: '2h', minutes: 120 },
] as const;

export const TIME_ORDER_ERROR_START =
  'O horário de início deve ser anterior ao horário de término.';
export const TIME_ORDER_ERROR_END =
  'O horário de término deve ser posterior ao horário de início.';

/**
 * Calculates auto-advanced end time when start time is moved to or past current end time.
 * Preserves the previous duration (or at least 30 minutes), clamped at 23:59 (1439 min).
 */
export function calculateAutoAdvancedEndTime(
  newStartTime: string,
  currentEndTime: string,
  previousStartTime: string
): string | null {
  if (!isValidTime(newStartTime) || !isValidTime(currentEndTime)) {
    return null;
  }

  const newStartMin = timeToMinutes(newStartTime);
  const currentEndMin = timeToMinutes(currentEndTime);

  if (newStartMin === null || currentEndMin === null) {
    return null;
  }

  if (newStartMin < currentEndMin) {
    return null;
  }

  const prevStartMin = isValidTime(previousStartTime)
    ? timeToMinutes(previousStartTime)
    : null;
  const prevDuration =
    prevStartMin !== null && currentEndMin > prevStartMin
      ? currentEndMin - prevStartMin
      : 60;

  const nextEndMin = Math.min(1439, newStartMin + Math.max(30, prevDuration));
  return minutesToTime(nextEndMin);
}

/**
 * Maps domain validation errors into field error messages,
 * ensuring Portuguese messages for time ordering.
 */
export function mapValidationErrorsToFieldErrors(
  errors: ReadonlyArray<ValidationError>
): Record<string, string> {
  const errorMap: Record<string, string> = {};
  for (const err of errors) {
    if (err.field === 'endTime' && err.message.includes('strictly later')) {
      errorMap[err.field] = TIME_ORDER_ERROR_END;
    } else if (err.field === 'startTime' && err.message.includes('strictly earlier')) {
      errorMap[err.field] = TIME_ORDER_ERROR_START;
    } else {
      errorMap[err.field] = err.message;
    }
  }
  return errorMap;
}

export type BuildAppointmentCandidateParams = {
  readonly id?: string;
  readonly title: string;
  readonly professional: string;
  readonly date: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly status: AppointmentStatus;
};

/**
 * Builds an Appointment candidate with trimmed strings and a generated id if none provided.
 */
export function buildAppointmentCandidate(
  params: BuildAppointmentCandidateParams
): Appointment {
  return {
    id: params.id ?? `apt-${Date.now()}`,
    title: params.title.trim(),
    professional: params.professional.trim(),
    date: params.date,
    startTime: params.startTime,
    endTime: params.endTime,
    status: params.status,
  };
}
