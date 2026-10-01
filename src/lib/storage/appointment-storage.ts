/**
 * Client-side persistence layer for appointments.
 */

import type { Appointment, AppointmentDocument } from '@/domain/appointment';
import { validateAppointment } from '@/domain/appointment';

export const STORAGE_VERSION = 1;
export const APPOINTMENTS_STORAGE_KEY = `agenda:appointments:v${STORAGE_VERSION}`;

export type StoredAgendaPayload = {
  readonly version: number;
  readonly updatedAt: string;
  readonly appointments: ReadonlyArray<Appointment>;
};

export type DeserializationResult =
  | { readonly success: true; readonly appointments: AppointmentDocument }
  | { readonly success: false; readonly reason: string };

/**
 * Serializes an appointment document into a versioned JSON string.
 */
export function serializeAppointments(
  appointments: AppointmentDocument,
  now: Date = new Date()
): string {
  const payload: StoredAgendaPayload = {
    version: STORAGE_VERSION,
    updatedAt: now.toISOString(),
    appointments,
  };
  return JSON.stringify(payload);
}

/**
 * Safely parses and validates a stored JSON string.
 * Returns valid AppointmentDocument or a descriptive error reason.
 */
export function deserializeAppointments(rawJson: string | null): DeserializationResult {
  if (!rawJson || rawJson.trim() === '') {
    return { success: false, reason: 'Empty or null payload' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch (err) {
    return {
      success: false,
      reason: `Malformed JSON: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return { success: false, reason: 'Payload must be a JSON object' };
  }

  const record = parsed as Record<string, unknown>;

  if (record.version !== STORAGE_VERSION) {
    return {
      success: false,
      reason: `Unsupported storage version: expected ${STORAGE_VERSION}, got ${String(
        record.version
      )}`,
    };
  }

  if (!Array.isArray(record.appointments)) {
    return { success: false, reason: 'Field "appointments" must be an array' };
  }

  const validAppointments: Appointment[] = [];
  const seenIds = new Set<string>();

  for (let i = 0; i < record.appointments.length; i++) {
    const item = record.appointments[i];
    if (typeof item !== 'object' || item === null) {
      return { success: false, reason: `Appointment at index ${i} is not an object` };
    }

    const candidate = item as Appointment;
    const validation = validateAppointment(candidate);
    if (!validation.valid) {
      return {
        success: false,
        reason: `Appointment at index ${i} failed validation: ${validation.errors
          .map((e) => `${e.field}: ${e.message}`)
          .join(', ')}`,
      };
    }

    if (seenIds.has(candidate.id)) {
      return {
        success: false,
        reason: `Duplicate appointment ID "${candidate.id}" found at index ${i}`,
      };
    }

    seenIds.add(candidate.id);
    validAppointments.push(candidate);
  }

  return {
    success: true,
    appointments: validAppointments,
  };
}

/**
 * Safely reads and validates appointments from localStorage.
 * Returns null if storage is empty, inaccessible, or corrupt.
 */
export function loadFromStorage(
  storageKey: string = APPOINTMENTS_STORAGE_KEY,
  storage?: Storage
): AppointmentDocument | null {
  try {
    const targetStorage =
      storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
    if (!targetStorage) return null;

    const raw = targetStorage.getItem(storageKey);
    const result = deserializeAppointments(raw);
    if (result.success) {
      return result.appointments;
    }
    return null;
  } catch (err) {
    console.warn('[Agenda Storage] Error accessing localStorage during read:', err);
    return null;
  }
}

/**
 * Safely writes appointments to localStorage.
 * Returns true if successful, false otherwise.
 */
export function saveToStorage(
  appointments: AppointmentDocument,
  storageKey: string = APPOINTMENTS_STORAGE_KEY,
  storage?: Storage
): boolean {
  try {
    const targetStorage =
      storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
    if (!targetStorage) return false;

    const serialized = serializeAppointments(appointments);
    targetStorage.setItem(storageKey, serialized);
    return true;
  } catch (err) {
    console.warn('[Agenda Storage] Error writing to localStorage:', err);
    return false;
  }
}

/**
 * Clears the persisted appointments key from storage.
 */
export function clearStorage(
  storageKey: string = APPOINTMENTS_STORAGE_KEY,
  storage?: Storage
): void {
  try {
    const targetStorage =
      storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
    if (!targetStorage) return;
    targetStorage.removeItem(storageKey);
  } catch (err) {
    console.warn('[Agenda Storage] Error clearing localStorage:', err);
  }
}
