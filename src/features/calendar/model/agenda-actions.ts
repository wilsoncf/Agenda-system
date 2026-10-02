import type { Dispatch } from 'react';
import type {
  Appointment,
  AppointmentDocument,
  ValidationError,
} from '@/domain/appointment';
import type { HistoryState } from '@/domain/history';

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
// Action types
// ---------------------------------------------------------------------------

export type CreateAppointmentAction = {
  readonly type: 'CREATE_APPOINTMENT';
  readonly payload: Appointment;
};

export type UpdateAppointmentAction = {
  readonly type: 'UPDATE_APPOINTMENT';
  readonly payload: Appointment;
};

export type DeleteAppointmentAction = {
  readonly type: 'DELETE_APPOINTMENT';
  readonly payload: string; // id
};

export type MoveAppointmentAction = {
  readonly type: 'MOVE_APPOINTMENT';
  readonly payload: {
    readonly id: string;
    readonly date: string;
    readonly startTime?: string;
  };
};

export type ResizeAppointmentAction = {
  readonly type: 'RESIZE_APPOINTMENT';
  readonly payload: {
    readonly id: string;
    readonly startTime: string;
    readonly endTime: string;
  };
};

export type UndoAction = {
  readonly type: 'UNDO';
};

export type RedoAction = {
  readonly type: 'REDO';
};

export type SelectAction = {
  readonly type: 'SELECT_APPOINTMENT';
  readonly payload: string | null;
};

export type SetWeekAction = {
  readonly type: 'SET_WEEK';
  readonly payload: string; // YYYY-MM-DD (Monday)
};

export type SetAppointmentsAction = {
  readonly type: 'SET_APPOINTMENTS';
  readonly payload: AppointmentDocument;
};

export type HydrateAppointmentsAction = {
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

// ---------------------------------------------------------------------------
// Command contracts
// ---------------------------------------------------------------------------

export type CommandResult =
  | { readonly success: true }
  | { readonly success: false; readonly errors: ReadonlyArray<ValidationError> };

export type AgendaContextValue = {
  readonly state: AgendaState;
  readonly dispatch: Dispatch<AgendaAction>;
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
