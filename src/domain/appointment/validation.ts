/**
 * Appointment validation.
 */

import type { Appointment } from './types';
import { isAppointmentStatus } from './types';
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
    errors.push({ field: 'id', message: 'ID não pode ser vazio' });
  }

  if (!appointment.title || appointment.title.trim().length === 0) {
    errors.push({ field: 'title', message: 'Título não pode ficar em branco' });
  }

  if (!appointment.professional || appointment.professional.trim().length === 0) {
    errors.push({ field: 'professional', message: 'Profissional não pode ficar em branco' });
  }

  if (!isValidDate(appointment.date)) {
    errors.push({ field: 'date', message: 'Data deve ser válida no formato AAAA-MM-DD' });
  }

  if (!isValidTime(appointment.startTime)) {
    errors.push({ field: 'startTime', message: 'Horário de início deve ser válido no formato HH:mm' });
  }

  if (!isValidTime(appointment.endTime)) {
    errors.push({ field: 'endTime', message: 'Horário de término deve ser válido no formato HH:mm' });
  }

  if (!isAppointmentStatus(appointment.status)) {
    errors.push({ field: 'status', message: 'Status inválido' });
  }

  // Only check time ordering if both times are individually valid
  if (isValidTime(appointment.startTime) && isValidTime(appointment.endTime)) {
    const startMinutes = timeToMinutes(appointment.startTime);
    const endMinutes = timeToMinutes(appointment.endTime);
    if (startMinutes !== null && endMinutes !== null && endMinutes <= startMinutes) {
      errors.push({
        field: 'endTime',
        message: 'O horário de término deve ser posterior ao horário de início.',
      });
      errors.push({
        field: 'startTime',
        message: 'O horário de início deve ser anterior ao horário de término.',
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
