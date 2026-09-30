
export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled';

export type Appointment = {
  readonly id: string;
  readonly title: string;
  readonly date: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly professional: string;
  readonly status: AppointmentStatus;
};

export type AppointmentDocument = ReadonlyArray<Appointment>;
