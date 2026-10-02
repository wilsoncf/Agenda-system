import { useEffect, useRef, type Dispatch } from 'react';
import type { AppointmentDocument } from '@/domain/appointment';
import {
  APPOINTMENTS_STORAGE_KEY,
  loadFromStorage,
  saveToStorage,
} from '@/lib/storage/appointment-storage';
import type { AgendaAction } from './agenda-actions';

export type AgendaPersistenceOptions = {
  readonly appointments: AppointmentDocument;
  readonly dispatch: Dispatch<AgendaAction>;
  readonly enablePersistence?: boolean;
  readonly storageKey?: string;
  readonly storage?: Storage;
};

/**
 * Encapsulates client-side storage hydration and debounced autosave.
 * Guarantees that autosave does not fire until initial mount hydration finishes.
 */
export function useAgendaPersistence({
  appointments,
  dispatch,
  enablePersistence,
  storageKey = APPOINTMENTS_STORAGE_KEY,
  storage,
}: AgendaPersistenceOptions): void {
  const shouldPersist =
    enablePersistence ??
    (typeof window !== 'undefined' &&
      typeof process !== 'undefined' &&
      process.env.NODE_ENV !== 'test');

  const hasHydratedRef = useRef(false);

  // Initial hydration from storage on client mount
  useEffect(() => {
    if (!shouldPersist) return;
    const loaded = loadFromStorage(storageKey, storage);
    if (loaded !== null) {
      dispatch({ type: 'HYDRATE_APPOINTMENTS', payload: loaded });
    }
    hasHydratedRef.current = true;
  }, [shouldPersist, storageKey, storage, dispatch]);

  // Debounced persistence on appointments change
  useEffect(() => {
    if (!shouldPersist) return;
    if (!hasHydratedRef.current) return;

    const timeoutId = setTimeout(() => {
      saveToStorage(appointments, storageKey, storage);
    }, 400);

    const handleBeforeUnload = () => {
      saveToStorage(appointments, storageKey, storage);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [appointments, shouldPersist, storageKey, storage]);
}
