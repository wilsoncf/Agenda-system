'use client';

/**
 * AppointmentForm — Create and edit form for appointment data.
 */

import React, { useState } from 'react';
import type { Appointment, AppointmentStatus, ValidationError } from '@/domain/appointment';
import { isAppointmentStatus, validateAppointment } from '@/domain/appointment';
import {
  isValidTime,
  timeToMinutes,
  durationMinutes,
  calculateEndTime,
} from '@/lib/date/time-utils';
import { cn } from '@/lib/utils';
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DEFAULT_START_TIME,
  DEFAULT_END_TIME,
  TIME_ORDER_ERROR_START,
  TIME_ORDER_ERROR_END,
  calculateAutoAdvancedEndTime,
  mapValidationErrorsToFieldErrors,
  buildAppointmentCandidate,
} from './appointment-form-utils';
import { AppointmentTimeFields } from './appointment-time-fields';

export type AppointmentFormProps = {
  readonly appointmentToEdit?: Appointment | null;
  readonly defaultDate?: string;
  readonly onSave: (
    appointment: Appointment
  ) => { success: boolean; errors?: ReadonlyArray<ValidationError> };
  readonly onCancel: () => void;
};

export function AppointmentForm({
  appointmentToEdit,
  defaultDate,
  onSave,
  onCancel,
}: AppointmentFormProps) {
  const isEditing = Boolean(appointmentToEdit);

  const [title, setTitle] = useState(appointmentToEdit?.title ?? '');
  const [professional, setProfessional] = useState(
    appointmentToEdit?.professional ?? ''
  );
  const [date, setDate] = useState(
    appointmentToEdit?.date ?? defaultDate ?? ''
  );
  const [startTime, setStartTime] = useState(
    appointmentToEdit?.startTime ?? DEFAULT_START_TIME
  );
  const [endTime, setEndTime] = useState(
    appointmentToEdit?.endTime ?? DEFAULT_END_TIME
  );
  const [status, setStatus] = useState<AppointmentStatus>(
    appointmentToEdit?.status ?? 'confirmed'
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Real-time time order validation
  const startMinutes = isValidTime(startTime) ? timeToMinutes(startTime) : null;
  const endMinutes = isValidTime(endTime) ? timeToMinutes(endTime) : null;
  const isTimeOrderInvalid =
    startMinutes !== null && endMinutes !== null && endMinutes <= startMinutes;

  const clearTimeErrors = () => {
    setErrors((prev) => {
      if (!prev.startTime && !prev.endTime) return prev;
      const next = { ...prev };
      delete next.startTime;
      delete next.endTime;
      return next;
    });
  };

  const handleStartTimeChange = (newStartTime: string) => {
    setStartTime(newStartTime);
    clearTimeErrors();

    const autoAdvancedEndTime = calculateAutoAdvancedEndTime(
      newStartTime,
      endTime,
      startTime
    );
    if (autoAdvancedEndTime) {
      setEndTime(autoAdvancedEndTime);
    }
  };

  const handleEndTimeChange = (newEndTime: string) => {
    setEndTime(newEndTime);
    clearTimeErrors();
  };

  const handlePresetClick = (minutes: number) => {
    if (isValidTime(startTime)) {
      const newEnd = calculateEndTime(startTime, minutes);
      if (newEnd) {
        setEndTime(newEnd);
        clearTimeErrors();
      }
    }
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (isAppointmentStatus(value)) {
      setStatus(value);
    }
  };

  const currentDuration =
    isValidTime(startTime) && isValidTime(endTime)
      ? durationMinutes(startTime, endTime)
      : null;

  const validDuration =
    currentDuration !== null && currentDuration > 0 ? currentDuration : null;

  const startTimeError =
    errors.startTime ||
    (isTimeOrderInvalid ? TIME_ORDER_ERROR_START : undefined);

  const endTimeError =
    errors.endTime ||
    (isTimeOrderInvalid ? TIME_ORDER_ERROR_END : undefined);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isTimeOrderInvalid) {
      setErrors((prev) => ({
        ...prev,
        startTime: TIME_ORDER_ERROR_START,
        endTime: TIME_ORDER_ERROR_END,
      }));
      return;
    }

    const candidate = buildAppointmentCandidate({
      id: appointmentToEdit?.id,
      title,
      professional,
      date,
      startTime,
      endTime,
      status,
    });

    const validation = validateAppointment(candidate);
    if (!validation.valid) {
      setErrors(mapValidationErrorsToFieldErrors(validation.errors));
      return;
    }

    const result = onSave(candidate);
    if (!result.success && result.errors) {
      setErrors(mapValidationErrorsToFieldErrors(result.errors));
      return;
    }

    onCancel();
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <DialogHeader>
        <DialogTitle>
          {isEditing ? 'Editar Compromisso' : 'Novo Compromisso'}
        </DialogTitle>
        <DialogDescription>
          {isEditing
            ? 'Atualize os dados do compromisso selecionado.'
            : 'Preencha os campos abaixo para adicionar um compromisso.'}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-3 py-3">
        {/* Title field */}
        <div className="grid gap-1">
          <Label htmlFor="appointment-title">Título *</Label>
          <Input
            id="appointment-title"
            name="title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (errors.title) {
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.title;
                  return next;
                });
              }
            }}
            placeholder="Ex: Consulta Cardiológica"
            aria-invalid={Boolean(errors.title)}
            className={cn(
              errors.title &&
                'border-destructive focus-visible:ring-destructive/30'
            )}
          />
          {errors.title && (
            <span className="text-xs text-destructive" role="alert">
              {errors.title}
            </span>
          )}
        </div>

        {/* Professional field */}
        <div className="grid gap-1">
          <Label htmlFor="appointment-professional">Profissional *</Label>
          <Input
            id="appointment-professional"
            name="professional"
            value={professional}
            onChange={(e) => {
              setProfessional(e.target.value);
              if (errors.professional) {
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.professional;
                  return next;
                });
              }
            }}
            placeholder="Ex: Dra. Ana Paula"
            aria-invalid={Boolean(errors.professional)}
            className={cn(
              errors.professional &&
                'border-destructive focus-visible:ring-destructive/30'
            )}
          />
          {errors.professional && (
            <span className="text-xs text-destructive" role="alert">
              {errors.professional}
            </span>
          )}
        </div>

        {/* Date field */}
        <div className="grid gap-1">
          <Label htmlFor="appointment-date">Data *</Label>
          <Input
            id="appointment-date"
            type="date"
            name="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              if (errors.date) {
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.date;
                  return next;
                });
              }
            }}
            aria-invalid={Boolean(errors.date)}
            className={cn(
              errors.date &&
                'border-destructive focus-visible:ring-destructive/30'
            )}
          />
          {errors.date && (
            <span className="text-xs text-destructive" role="alert">
              {errors.date}
            </span>
          )}
        </div>

        {/* Start and End Times + Presets */}
        <AppointmentTimeFields
          startTime={startTime}
          endTime={endTime}
          onStartTimeChange={handleStartTimeChange}
          onEndTimeChange={handleEndTimeChange}
          onPresetClick={handlePresetClick}
          validDuration={validDuration}
          startTimeError={startTimeError}
          endTimeError={endTimeError}
        />

        {/* Status select field */}
        <div className="grid gap-1">
          <Label htmlFor="appointment-status">Status *</Label>
          <select
            id="appointment-status"
            name="status"
            value={status}
            onChange={handleStatusChange}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="confirmed" className="bg-popover text-popover-foreground">
              Confirmado
            </option>
            <option value="pending" className="bg-popover text-popover-foreground">
              Pendente
            </option>
            <option value="completed" className="bg-popover text-popover-foreground">
              Concluído
            </option>
            <option value="cancelled" className="bg-popover text-popover-foreground">
              Cancelado
            </option>
          </select>
        </div>
      </div>

      <DialogFooter className="mt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isTimeOrderInvalid}
          title={
            isTimeOrderInvalid
              ? TIME_ORDER_ERROR_END
              : undefined
          }
        >
          {isEditing ? 'Salvar Alterações' : 'Criar Compromisso'}
        </Button>
      </DialogFooter>
    </form>
  );
}
