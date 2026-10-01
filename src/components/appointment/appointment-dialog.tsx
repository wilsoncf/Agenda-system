'use client';

/**
 * AppointmentDialog — Create and Edit modal dialog shell for appointments.
 */

import React from 'react';
import type { Appointment, ValidationError } from '@/domain/appointment';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { AppointmentForm } from './appointment-form';

export type AppointmentDialogProps = {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly appointmentToEdit?: Appointment | null;
  readonly defaultDate?: string;
  readonly onSave: (
    appointment: Appointment
  ) => { success: boolean; errors?: ReadonlyArray<ValidationError> };
};

export function AppointmentDialog({
  open,
  onOpenChange,
  appointmentToEdit,
  defaultDate = '2024-01-15',
  onSave,
}: AppointmentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open && (
          <AppointmentForm
            key={appointmentToEdit ? appointmentToEdit.id : 'new-appointment'}
            appointmentToEdit={appointmentToEdit}
            defaultDate={defaultDate}
            onSave={onSave}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

export { AppointmentForm } from './appointment-form';
export type { AppointmentFormProps } from './appointment-form';
export { AppointmentTimeFields } from './appointment-time-fields';
export type { AppointmentTimeFieldsProps } from './appointment-time-fields';
export * from './appointment-form-utils';
