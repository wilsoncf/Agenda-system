import { useCallback, type Dispatch } from 'react';
import type { Appointment } from '@/domain/appointment';
import {
  validateAppointment,
  isUniqueId,
  moveAppointment,
  rescheduleAppointment,
} from '@/domain/appointment';
import type {
  AgendaState,
  AgendaAction,
  CommandResult,
} from './agenda-actions';

export type AgendaCommands = {
  readonly createAppointment: (appointment: Appointment) => CommandResult;
  readonly updateAppointment: (appointment: Appointment) => CommandResult;
  readonly moveAppointment: (id: string, date: string, startTime?: string) => CommandResult;
  readonly resizeAppointment: (id: string, startTime: string, endTime: string) => CommandResult;
  readonly deleteAppointment: (id: string) => void;
  readonly selectAppointment: (id: string | null) => void;
  readonly setWeek: (weekMonday: string) => void;
  readonly undoAction: () => void;
  readonly redoAction: () => void;
};

/**
 * Hook providing memoized application commands bound to state and dispatch.
 * Performs pre-dispatch validation and ID uniqueness checks.
 */
export function useAgendaCommands(
  state: AgendaState,
  dispatch: Dispatch<AgendaAction>
): AgendaCommands {
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
    [state.history.present, dispatch]
  );

  const updateAppointment = useCallback(
    (appointment: Appointment): CommandResult => {
      const validation = validateAppointment(appointment);
      if (!validation.valid) {
        return { success: false, errors: validation.errors };
      }

      const exists = state.history.present.some((a) => a.id === appointment.id);
      if (!exists) {
        return {
          success: false,
          errors: [{ field: 'id', message: 'Compromisso não encontrado' }],
        };
      }

      dispatch({ type: 'UPDATE_APPOINTMENT', payload: appointment });
      return { success: true };
    },
    [state.history.present, dispatch]
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
    [state.history.present, dispatch]
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
    [state.history.present, dispatch]
  );

  const deleteAppointment = useCallback(
    (id: string) => {
      dispatch({ type: 'DELETE_APPOINTMENT', payload: id });
    },
    [dispatch]
  );

  const selectAppointment = useCallback(
    (id: string | null) => {
      dispatch({ type: 'SELECT_APPOINTMENT', payload: id });
    },
    [dispatch]
  );

  const setWeek = useCallback(
    (weekMonday: string) => {
      dispatch({ type: 'SET_WEEK', payload: weekMonday });
    },
    [dispatch]
  );

  const undoAction = useCallback(() => {
    dispatch({ type: 'UNDO' });
  }, [dispatch]);

  const redoAction = useCallback(() => {
    dispatch({ type: 'REDO' });
  }, [dispatch]);

  return {
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
}
