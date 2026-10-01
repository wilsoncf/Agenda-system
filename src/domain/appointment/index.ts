/**
 * Public API for the appointment domain module.
 */

export type {
  Appointment,
  AppointmentStatus,
  AppointmentDocument,
} from './types';

export {
  validateAppointment,
  isUniqueId,
} from './validation';
export type { ValidationError, ValidationResult } from './validation';

export {
  createAppointmentInDoc,
  updateAppointmentInDoc,
  deleteAppointmentFromDoc,
  moveAppointment,
  rescheduleAppointment,
  changeAppointmentDuration,
  areAppointmentsEqual,
} from './operations';

export { SEED_APPOINTMENTS, FIXTURE_WEEK_START } from './fixtures';
