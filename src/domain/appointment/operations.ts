/**
 * Pure appointment document operations.
 *
 * Immutably manages collections of appointments.
 * No React or browser dependencies.
 */

import type { Appointment, AppointmentDocument } from './types';
import {
  durationMinutes,
  timeToMinutes,
  minutesToTime,
} from '@/lib/date/time-utils';

/**
 * Adds an appointment to the document without mutating the original array.
 */
export function createAppointmentInDoc(
  doc: AppointmentDocument,
  appointment: Appointment
): AppointmentDocument {
  return [...doc, appointment];
}

/**
 * Updates an existing appointment in the document matching by `id`.
 * If the appointment does not exist, returns the document unchanged.
 */
export function updateAppointmentInDoc(
  doc: AppointmentDocument,
  updated: Appointment
): AppointmentDocument {
  const index = doc.findIndex((a) => a.id === updated.id);
  if (index === -1) {
    return doc;
  }

  return doc.map((a) => (a.id === updated.id ? updated : a));
}

/**
 * Removes an appointment from the document matching by `id`.
 * If the appointment is not found, returns the document unchanged.
 */
export function deleteAppointmentFromDoc(
  doc: AppointmentDocument,
  id: string
): AppointmentDocument {
  const exists = doc.some((a) => a.id === id);
  if (!exists) {
    return doc;
  }

  return doc.filter((a) => a.id !== id);
}

/**
 * Moves an appointment to a new date and optionally new start time.
 * If newStartTime is provided, the original duration is preserved.
 * All other fields (id, title, professional, status) remain unchanged.
 */
export function moveAppointment(
  appointment: Appointment,
  newDate: string,
  newStartTime?: string
): Appointment {
  if (!newStartTime || newStartTime === appointment.startTime) {
    if (newDate === appointment.date) return appointment;
    return { ...appointment, date: newDate };
  }

  const duration = durationMinutes(appointment.startTime, appointment.endTime) ?? 60;
  const newStartMin = timeToMinutes(newStartTime);
  if (newStartMin === null) {
    return { ...appointment, date: newDate, startTime: newStartTime };
  }

  const newEndMin = Math.min(1439, newStartMin + Math.max(1, duration));
  return {
    ...appointment,
    date: newDate,
    startTime: newStartTime,
    endTime: minutesToTime(newEndMin),
  };
}

/**
 * Changes appointment interval (start and end times) without modifying
 * unrelated fields (id, title, date, professional, status).
 */
export function rescheduleAppointment(
  appointment: Appointment,
  newStartTime: string,
  newEndTime: string
): Appointment {
  if (appointment.startTime === newStartTime && appointment.endTime === newEndTime) {
    return appointment;
  }
  return {
    ...appointment,
    startTime: newStartTime,
    endTime: newEndTime,
  };
}

/**
 * Changes duration in minutes while preserving start time and unrelated fields.
 */
export function changeAppointmentDuration(
  appointment: Appointment,
  newDurationMinutes: number
): Appointment {
  if (newDurationMinutes <= 0) return appointment;
  const startMin = timeToMinutes(appointment.startTime);
  if (startMin === null) return appointment;
  const newEndMin = Math.min(1439, startMin + newDurationMinutes);
  const newEndTime = minutesToTime(newEndMin);

  if (appointment.endTime === newEndTime) return appointment;
  return {
    ...appointment,
    endTime: newEndTime,
  };
}

/**
 * Checks deep structural equality between two appointment documents
 * to enable no-op protection in history transactions.
 */
export function areAppointmentsEqual(
  a: AppointmentDocument,
  b: AppointmentDocument
): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;

  for (let i = 0; i < a.length; i++) {
    const itemA = a[i];
    const itemB = b[i];
    if (!itemA || !itemB) return false;

    if (
      itemA.id !== itemB.id ||
      itemA.title !== itemB.title ||
      itemA.date !== itemB.date ||
      itemA.startTime !== itemB.startTime ||
      itemA.endTime !== itemB.endTime ||
      itemA.professional !== itemB.professional ||
      itemA.status !== itemB.status
    ) {
      return false;
    }
  }

  return true;
}
