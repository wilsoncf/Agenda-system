/**
 * Appointment validation.
 */

import type { Appointment } from './types';
import { isValidDate, isValidTime, timeToMinutes } from '@/lib/date/time-utils';

/** Individual validation error for an appointment field. */
export type ValidationError = {
  readonly field: keyof Appointment;
  readonly message: string;
};

/** Result of validating an appointment. */
export type ValidationResult =
  | { readonly valid: true }
  | { readonly valid: false; readonly errors: ReadonlyArray<ValidationError> };

/**
 * Validate an appointment against all domain invariants.
 */
export function validateAppointment(appointment: Appointment): ValidationResult {
  const errors: ValidationError[] = [];

  if (!appointment.id || appointment.id.trim().length === 0) {
    errors.push({ field: 'id', message: 'ID must not be empty' });
  }

  if (!appointment.title || appointment.title.trim().length === 0) {
    errors.push({ field: 'title', message: 'Title must not be blank' });
  }

  if (!appointment.professional || appointment.professional.trim().length === 0) {
    errors.push({ field: 'professional', message: 'Professional must not be blank' });
  }

  if (!isValidDate(appointment.date)) {
    errors.push({ field: 'date', message: 'Date must be a valid YYYY-MM-DD string' });
  }

  if (!isValidTime(appointment.startTime)) {
    errors.push({ field: 'startTime', message: 'Start time must be a valid HH:mm string' });
  }

  if (!isValidTime(appointment.endTime)) {
    errors.push({ field: 'endTime', message: 'End time must be a valid HH:mm string' });
  }

  // Only check time ordering if both times are individually valid
  if (isValidTime(appointment.startTime) && isValidTime(appointment.endTime)) {
    const startMinutes = timeToMinutes(appointment.startTime);
    const endMinutes = timeToMinutes(appointment.endTime);
    if (startMinutes !== null && endMinutes !== null && endMinutes <= startMinutes) {
      errors.push({
        field: 'endTime',
        message: 'End time must be strictly later than start time',
      });
      errors.push({
        field: 'startTime',
        message: 'Start time must be strictly earlier than end time',
      });
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true };
}


export function isUniqueId(
  id: string,
  existingAppointments: ReadonlyArray<Appointment>,
  excludeId?: string
): boolean {
  return existingAppointments.every(
    (a) => a.id === excludeId || a.id !== id
  );
}
