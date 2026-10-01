'use client';

/**
 * Agenda state provider — composition root for agenda state, persistence, and commands.
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useMemo,
  type ReactNode,
} from 'react';
import type { Appointment, AppointmentDocument } from '@/domain/appointment';
import { SEED_APPOINTMENTS } from '@/domain/appointment';
import { APPOINTMENTS_STORAGE_KEY } from '@/lib/storage/appointment-storage';
import {
  agendaReducer,
  createInitialAgendaState,
  useAgendaCommands,
  useAgendaPersistence,
} from '@/features/calendar/state';
import type {
  AgendaState,
  AgendaAction,
  CommandResult,
  AgendaContextValue,
} from '@/features/calendar/state';

// Re-export state and action types for backwards compatibility
export type {
  AgendaState,
  AgendaAction,
  CommandResult,
  AgendaContextValue,
};

const AgendaContext = createContext<AgendaContextValue | null>(null);

export type AgendaProviderProps = {
  readonly children: ReactNode;
  /** Optional initial appointments for testing. Defaults to SEED_APPOINTMENTS. */
  readonly initialAppointments?: AppointmentDocument;
  /** Optional initial week start. Defaults to FIXTURE_WEEK_START. */
  readonly initialWeekStart?: string;
  /** Enable client-side local storage autosave & hydration. */
  readonly enablePersistence?: boolean;
  /** Custom storage key for isolation. Defaults to APPOINTMENTS_STORAGE_KEY. */
  readonly storageKey?: string;
  /** Custom storage engine (useful for tests). Defaults to window.localStorage. */
  readonly storage?: Storage;
};

export function getCurrentMonday(): string {
  const now = new Date();
  const day = now.getDay();
  // getDay() returns 0=Sun, 1=Mon, ..., 6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  const year = monday.getFullYear();
  const month = String(monday.getMonth() + 1).padStart(2, '0');
  const date = String(monday.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
}

export function AgendaProvider({
  children,
  initialAppointments = SEED_APPOINTMENTS as Appointment[],
  initialWeekStart,
  enablePersistence,
  storageKey = APPOINTMENTS_STORAGE_KEY,
  storage,
}: AgendaProviderProps) {
  const [state, dispatch] = useReducer(
    agendaReducer,
    initialAppointments,
    (initialList): AgendaState =>
      createInitialAgendaState(initialList, initialWeekStart)
  );

  // Storage hydration & debounced persistence
  useAgendaPersistence({
    appointments: state.appointments,
    dispatch,
    initialAppointments,
    enablePersistence,
    storageKey,
    storage,
  });

  // Application commands bound to state & dispatch
  const commands = useAgendaCommands(state, dispatch);

  const value: AgendaContextValue = useMemo(
    () => ({
      state,
      dispatch,
      ...commands,
    }),
    [state, dispatch, commands]
  );

  return (
    <AgendaContext value={value}>
      {children}
    </AgendaContext>
  );
}

export function useAgenda(): AgendaContextValue {
  const context = useContext(AgendaContext);
  if (context === null) {
    throw new Error('useAgenda must be used within an <AgendaProvider>');
  }
  return context;
}
