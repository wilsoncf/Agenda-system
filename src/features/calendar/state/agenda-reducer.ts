import type { AppointmentDocument } from '@/domain/appointment';
import {
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
import {
  createHistory,
  commit,
  undo,
  redo,
  canUndo,
  canRedo,
} from '@/domain/history';
import type { AgendaState, AgendaAction } from './agenda-actions';

/**
 * Creates the initial AgendaState with a clean history rooted at initialAppointments.
 */
export function createInitialAgendaState(
  initialAppointments: AppointmentDocument,
  initialWeekStart?: string
): AgendaState {
  const history = createHistory<AppointmentDocument>(initialAppointments);
  return {
    history,
    appointments: history.present,
    selectedAppointmentId: null,
    currentWeekStart: initialWeekStart ?? FIXTURE_WEEK_START,
    canUndo: canUndo(history),
    canRedo: canRedo(history),
  };
}

function warnInvalidAction(type: string, reason: string, details?: unknown): void {
  if (process.env.NODE_ENV !== 'production') {
    if (details !== undefined) {
      console.warn(`[agendaReducer] Ignored ${type}: ${reason}`, details);
    } else {
      console.warn(`[agendaReducer] Ignored ${type}: ${reason}`);
    }
  }
}

/**
 * Pure state reducer for the Agenda.
 * Manages appointment document mutations, history transactions, and UI view state (week, selection).
 */
export function agendaReducer(state: AgendaState, action: AgendaAction): AgendaState {
  switch (action.type) {
    case 'CREATE_APPOINTMENT': {
      const validation = validateAppointment(action.payload);
      if (!validation.valid) {
        warnInvalidAction('CREATE_APPOINTMENT', 'Validation failed', validation.errors);
        return state;
      }
      if (!isUniqueId(action.payload.id, state.history.present)) {
        warnInvalidAction('CREATE_APPOINTMENT', `Duplicate appointment id "${action.payload.id}"`);
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
        warnInvalidAction('UPDATE_APPOINTMENT', 'Validation failed', validation.errors);
        return state;
      }
      const exists = state.history.present.some((a) => a.id === action.payload.id);
      if (!exists) {
        warnInvalidAction('UPDATE_APPOINTMENT', `Appointment "${action.payload.id}" does not exist`);
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
        warnInvalidAction('MOVE_APPOINTMENT', `Appointment "${action.payload.id}" does not exist`);
        return state;
      }
      const moved = moveAppointment(
        current,
        action.payload.date,
        action.payload.startTime
      );
      const validation = validateAppointment(moved);
      if (!validation.valid) {
        warnInvalidAction('MOVE_APPOINTMENT', 'Validation failed for moved appointment', validation.errors);
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
        warnInvalidAction('RESIZE_APPOINTMENT', `Appointment "${action.payload.id}" does not exist`);
        return state;
      }
      const resized = rescheduleAppointment(
        current,
        action.payload.startTime,
        action.payload.endTime
      );
      const validation = validateAppointment(resized);
      if (!validation.valid) {
        warnInvalidAction('RESIZE_APPOINTMENT', 'Validation failed for resized appointment', validation.errors);
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
      const exists = state.history.present.some((a) => a.id === action.payload);
      if (!exists) {
        warnInvalidAction('DELETE_APPOINTMENT', `Appointment "${action.payload}" does not exist`);
        return state;
      }
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

    default: {
      const unknownAction = action as { type?: unknown };
      warnInvalidAction(
        typeof unknownAction?.type === 'string' ? unknownAction.type : 'UNKNOWN_ACTION',
        'Unrecognized action type'
      );
      return state;
    }
  }
}
