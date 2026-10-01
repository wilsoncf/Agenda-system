'use client';

/**
 * Agenda state provider.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useReducer,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import type {
  Appointment,
  AppointmentDocument,
  ValidationError,
} from '@/domain/appointment';
import {
  SEED_APPOINTMENTS,
  FIXTURE_WEEK_START,
  validateAppointment,
  isUniqueId,
  createAppointmentInDoc,
  updateAppointmentInDoc,
  deleteAppointmentFromDoc,
  moveAppointment,
  rescheduleAppointment,
  areAppointmentsEqual,
} from '@/domain/appointment';
import type { HistoryState } from '@/domain/history';
import {
  createHistory,
  commit,
  undo,
  redo,
  canUndo,
  canRedo,
} from '@/domain/history';
import {
  APPOINTMENTS_STORAGE_KEY,
  loadFromStorage,
  saveToStorage,
} from '@/lib/storage/appointment-storage';

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

export type AgendaState = {
  readonly history: HistoryState<AppointmentDocument>;
  /** Convenience shortcut to history.present */
  readonly appointments: AppointmentDocument;
  readonly selectedAppointmentId: string | null;
  readonly currentWeekStart: string; // YYYY-MM-DD (Monday)
  readonly canUndo: boolean;
  readonly canRedo: boolean;
};

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

type CreateAppointmentAction = {
  readonly type: 'CREATE_APPOINTMENT';
  readonly payload: Appointment;
};

type UpdateAppointmentAction = {
  readonly type: 'UPDATE_APPOINTMENT';
  readonly payload: Appointment;
};

type DeleteAppointmentAction = {
  readonly type: 'DELETE_APPOINTMENT';
  readonly payload: string; // id
};

type MoveAppointmentAction = {
  readonly type: 'MOVE_APPOINTMENT';
  readonly payload: {
    readonly id: string;
    readonly date: string;
    readonly startTime?: string;
  };
};

type ResizeAppointmentAction = {
  readonly type: 'RESIZE_APPOINTMENT';
  readonly payload: {
    readonly id: string;
    readonly startTime: string;
    readonly endTime: string;
  };
};

type UndoAction = {
  readonly type: 'UNDO';
};

type RedoAction = {
  readonly type: 'REDO';
};

type SelectAction = {
  readonly type: 'SELECT_APPOINTMENT';
  readonly payload: string | null;
};

type SetWeekAction = {
  readonly type: 'SET_WEEK';
  readonly payload: string; // YYYY-MM-DD (Monday)
};

type SetAppointmentsAction = {
  readonly type: 'SET_APPOINTMENTS';
  readonly payload: AppointmentDocument;
};

type HydrateAppointmentsAction = {
  readonly type: 'HYDRATE_APPOINTMENTS';
  readonly payload: AppointmentDocument;
};

export type AgendaAction =
  | CreateAppointmentAction
  | UpdateAppointmentAction
  | DeleteAppointmentAction
  | MoveAppointmentAction
  | ResizeAppointmentAction
  | UndoAction
  | RedoAction
  | SelectAction
  | SetWeekAction
  | SetAppointmentsAction
  | HydrateAppointmentsAction;

function agendaReducer(state: AgendaState, action: AgendaAction): AgendaState {
  switch (action.type) {
    case 'CREATE_APPOINTMENT': {
      const validation = validateAppointment(action.payload);
      if (!validation.valid) {
        return state;
      }
      const nextDoc = createAppointmentInDoc(state.history.present, action.payload);
      const nextHistory = commit(state.history, nextDoc, areAppointmentsEqual);

      return {
        ...state,
        history: nextHistory,
        appointments: nextHistory.present,
        canUndo: canUndo(nextHistory),
        canRedo: canRedo(nextHistory),
      };
    }

    case 'UPDATE_APPOINTMENT': {
      const validation = validateAppointment(action.payload);
      if (!validation.valid) {
        return state;
      }
      const nextDoc = updateAppointmentInDoc(state.history.present, action.payload);
      const nextHistory = commit(state.history, nextDoc, areAppointmentsEqual);

      return {
        ...state,
        history: nextHistory,
        appointments: nextHistory.present,
        canUndo: canUndo(nextHistory),
        canRedo: canRedo(nextHistory),
      };
    }

    case 'MOVE_APPOINTMENT': {
      const current = state.history.present.find((a) => a.id === action.payload.id);
      if (!current) {
        return state;
      }
      const moved = moveAppointment(
        current,
        action.payload.date,
        action.payload.startTime
      );
      const validation = validateAppointment(moved);
      if (!validation.valid) {
        return state;
      }
      const nextDoc = updateAppointmentInDoc(state.history.present, moved);
      const nextHistory = commit(state.history, nextDoc, areAppointmentsEqual);

      return {
        ...state,
        history: nextHistory,
        appointments: nextHistory.present,
        canUndo: canUndo(nextHistory),
        canRedo: canRedo(nextHistory),
      };
    }

    case 'RESIZE_APPOINTMENT': {
      const current = state.history.present.find((a) => a.id === action.payload.id);
      if (!current) {
        return state;
      }
      const resized = rescheduleAppointment(
        current,
        action.payload.startTime,
        action.payload.endTime
      );
      const validation = validateAppointment(resized);
      if (!validation.valid) {
        return state;
      }
      const nextDoc = updateAppointmentInDoc(state.history.present, resized);
      const nextHistory = commit(state.history, nextDoc, areAppointmentsEqual);

      return {
        ...state,
        history: nextHistory,
        appointments: nextHistory.present,
        canUndo: canUndo(nextHistory),
        canRedo: canRedo(nextHistory),
      };
    }

    case 'DELETE_APPOINTMENT': {
      const nextDoc = deleteAppointmentFromDoc(state.history.present, action.payload);
      const nextHistory = commit(state.history, nextDoc, areAppointmentsEqual);

      return {
        ...state,
        history: nextHistory,
        appointments: nextHistory.present,
        selectedAppointmentId:
          state.selectedAppointmentId === action.payload
            ? null
            : state.selectedAppointmentId,
        canUndo: canUndo(nextHistory),
        canRedo: canRedo(nextHistory),
      };
    }

    case 'UNDO': {
      const nextHistory = undo(state.history);
      const selectedStillExists = state.selectedAppointmentId
        ? nextHistory.present.some((a) => a.id === state.selectedAppointmentId)
        : false;

      return {
        ...state,
        history: nextHistory,
        appointments: nextHistory.present,
        selectedAppointmentId: selectedStillExists ? state.selectedAppointmentId : null,
        canUndo: canUndo(nextHistory),
        canRedo: canRedo(nextHistory),
      };
    }

    case 'REDO': {
      const nextHistory = redo(state.history);
      const selectedStillExists = state.selectedAppointmentId
        ? nextHistory.present.some((a) => a.id === state.selectedAppointmentId)
        : false;

      return {
        ...state,
        history: nextHistory,
        appointments: nextHistory.present,
        selectedAppointmentId: selectedStillExists ? state.selectedAppointmentId : null,
        canUndo: canUndo(nextHistory),
        canRedo: canRedo(nextHistory),
      };
    }

    case 'SELECT_APPOINTMENT':
      // UI-only state: does NOT alter history past/future or undo/redo availability
      return { ...state, selectedAppointmentId: action.payload };

    case 'SET_WEEK':
      // UI-only state: does NOT alter history past/future or undo/redo availability
      return { ...state, currentWeekStart: action.payload };

    case 'SET_APPOINTMENTS': {
      const nextHistory = commit(state.history, action.payload, areAppointmentsEqual);
      return {
        ...state,
        history: nextHistory,
        appointments: nextHistory.present,
        canUndo: canUndo(nextHistory),
        canRedo: canRedo(nextHistory),
      };
    }

    case 'HYDRATE_APPOINTMENTS': {
      const history = createHistory<AppointmentDocument>(action.payload);
      return {
        ...state,
        history,
        appointments: history.present,
        selectedAppointmentId: null,
        canUndo: false,
        canRedo: false,
      };
    }

    default:
      return state;
  }
}

export type CommandResult =
  | { readonly success: true }
  | { readonly success: false; readonly errors: ReadonlyArray<ValidationError> };

export type AgendaContextValue = {
  readonly state: AgendaState;
  readonly dispatch: React.Dispatch<AgendaAction>;
  /** Application command: validate and commit appointment creation */
  readonly createAppointment: (appointment: Appointment) => CommandResult;
  /** Application command: validate and commit appointment update */
  readonly updateAppointment: (appointment: Appointment) => CommandResult;
  /** Application command: move appointment to a new date and optional start time, preserving duration */
  readonly moveAppointment: (id: string, date: string, startTime?: string) => CommandResult;
  /** Application command: update appointment start and end time (duration/interval) */
  readonly resizeAppointment: (id: string, startTime: string, endTime: string) => CommandResult;
  /** Application command: commit appointment deletion */
  readonly deleteAppointment: (id: string) => void;
  /** UI command: update current selection */
  readonly selectAppointment: (id: string | null) => void;
  /** UI command: update visible week */
  readonly setWeek: (weekMonday: string) => void;
  /** History command: undo */
  readonly undoAction: () => void;
  /** History command: redo */
  readonly redoAction: () => void;
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
    (initialList): AgendaState => {
      const history = createHistory<AppointmentDocument>(initialList);
      return {
        history,
        appointments: history.present,
        selectedAppointmentId: null,
        currentWeekStart: initialWeekStart ?? FIXTURE_WEEK_START,
        canUndo: canUndo(history),
        canRedo: canRedo(history),
      };
    }
  );

  const shouldPersist =
    enablePersistence ??
    (typeof window !== 'undefined' &&
      typeof process !== 'undefined' &&
      process.env.NODE_ENV !== 'test' &&
      initialAppointments === SEED_APPOINTMENTS);

  const hasHydratedRef = useRef(false);

  // 1. Initial hydration from storage on client mount
  useEffect(() => {
    if (!shouldPersist) return;
    const loaded = loadFromStorage(storageKey, storage);
    if (loaded && loaded.length > 0) {
      dispatch({ type: 'HYDRATE_APPOINTMENTS', payload: loaded });
    }
    hasHydratedRef.current = true;
  }, [shouldPersist, storageKey, storage]);

  // 2. Debounced persistence on appointments change
  useEffect(() => {
    if (!shouldPersist) return;
    if (!hasHydratedRef.current) return;

    const timeoutId = setTimeout(() => {
      saveToStorage(state.appointments, storageKey, storage);
    }, 400);

    const handleBeforeUnload = () => {
      saveToStorage(state.appointments, storageKey, storage);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [state.appointments, shouldPersist, storageKey, storage]);

  const createAppointment = useCallback(
    (appointment: Appointment): CommandResult => {
      const validation = validateAppointment(appointment);
      if (!validation.valid) {
        return { success: false, errors: validation.errors };
      }

      if (!isUniqueId(appointment.id, state.history.present)) {
        return {
          success: false,
          errors: [{ field: 'id', message: 'ID já existente' }],
        };
      }

      dispatch({ type: 'CREATE_APPOINTMENT', payload: appointment });
      return { success: true };
    },
    [state.history.present]
  );

  const updateAppointment = useCallback(
    (appointment: Appointment): CommandResult => {
      const validation = validateAppointment(appointment);
      if (!validation.valid) {
        return { success: false, errors: validation.errors };
      }

      if (!isUniqueId(appointment.id, state.history.present, appointment.id)) {
        return {
          success: false,
          errors: [{ field: 'id', message: 'ID já existente' }],
        };
      }

      dispatch({ type: 'UPDATE_APPOINTMENT', payload: appointment });
      return { success: true };
    },
    [state.history.present]
  );

  const moveAppointmentCommand = useCallback(
    (id: string, date: string, startTime?: string): CommandResult => {
      const current = state.history.present.find((a) => a.id === id);
      if (!current) {
        return {
          success: false,
          errors: [{ field: 'id', message: 'Compromisso não encontrado' }],
        };
      }

      const moved = moveAppointment(current, date, startTime);
      const validation = validateAppointment(moved);
      if (!validation.valid) {
        return { success: false, errors: validation.errors };
      }

      dispatch({ type: 'MOVE_APPOINTMENT', payload: { id, date, startTime } });
      return { success: true };
    },
    [state.history.present]
  );

  const resizeAppointmentCommand = useCallback(
    (id: string, startTime: string, endTime: string): CommandResult => {
      const current = state.history.present.find((a) => a.id === id);
      if (!current) {
        return {
          success: false,
          errors: [{ field: 'id', message: 'Compromisso não encontrado' }],
        };
      }

      const resized = rescheduleAppointment(current, startTime, endTime);
      const validation = validateAppointment(resized);
      if (!validation.valid) {
        return { success: false, errors: validation.errors };
      }

      dispatch({ type: 'RESIZE_APPOINTMENT', payload: { id, startTime, endTime } });
      return { success: true };
    },
    [state.history.present]
  );

  const deleteAppointment = useCallback((id: string) => {
    dispatch({ type: 'DELETE_APPOINTMENT', payload: id });
  }, []);

  const selectAppointment = useCallback((id: string | null) => {
    dispatch({ type: 'SELECT_APPOINTMENT', payload: id });
  }, []);

  const setWeek = useCallback((weekMonday: string) => {
    dispatch({ type: 'SET_WEEK', payload: weekMonday });
  }, []);

  const undoAction = useCallback(() => {
    dispatch({ type: 'UNDO' });
  }, []);

  const redoAction = useCallback(() => {
    dispatch({ type: 'REDO' });
  }, []);

  const value: AgendaContextValue = {
    state,
    dispatch,
    createAppointment,
    updateAppointment,
    moveAppointment: moveAppointmentCommand,
    resizeAppointment: resizeAppointmentCommand,
    deleteAppointment,
    selectAppointment,
    setWeek,
    undoAction,
    redoAction,
  };

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
