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
import type { AppointmentDocument } from '@/domain/appointment';
import { APPOINTMENTS_STORAGE_KEY } from '@/lib/storage/appointment-storage';
import {
  agendaReducer,
  createInitialAgendaState,
  useAgendaCommands,
  useAgendaPersistence,
} from '@/features/calendar/model';
import type {
  AgendaState,
  AgendaAction,
  CommandResult,
  AgendaContextValue,
} from '@/features/calendar/model';
import { getCurrentMonday } from '@/lib/date/calendar-utils';

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

export function AgendaProvider({
  children,
  initialAppointments = [],
  initialWeekStart,
  enablePersistence,
  storageKey = APPOINTMENTS_STORAGE_KEY,
  storage,
}: AgendaProviderProps) {
  const [state, dispatch] = useReducer(
    agendaReducer,
    initialAppointments,
    (initialList): AgendaState =>
      createInitialAgendaState(initialList, initialWeekStart ?? getCurrentMonday())
  );

  // Storage hydration & debounced persistence
  useAgendaPersistence({
    appointments: state.appointments,
    dispatch,
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
