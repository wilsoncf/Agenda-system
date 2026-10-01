'use client';

/**
 * AppointmentDialog — Create and Edit form dialog for appointments.
 */

import React, { useState } from 'react';
import type { Appointment, AppointmentStatus, ValidationError } from '@/domain/appointment';
import { validateAppointment } from '@/domain/appointment';
import {
  isValidTime,
  timeToMinutes,
  minutesToTime,
  durationMinutes,
  formatDuration,
  calculateEndTime,
} from '@/lib/date/time-utils';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type AppointmentDialogProps = {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly appointmentToEdit?: Appointment | null;
  readonly defaultDate?: string;
  readonly onSave: (
    appointment: Appointment
  ) => { success: boolean; errors?: ReadonlyArray<ValidationError> };
};

const DEFAULT_START_TIME = '09:00';
const DEFAULT_END_TIME = '10:00';

const DURATION_PRESETS = [
  { label: '15m', minutes: 15 },
  { label: '30m', minutes: 30 },
  { label: '45m', minutes: 45 },
  { label: '1h', minutes: 60 },
  { label: '1h30', minutes: 90 },
  { label: '2h', minutes: 120 },
] as const;

type AppointmentFormProps = {
  readonly appointmentToEdit?: Appointment | null;
  readonly defaultDate: string;
  readonly onSave: (
    appointment: Appointment
  ) => { success: boolean; errors?: ReadonlyArray<ValidationError> };
  readonly onCancel: () => void;
};

function AppointmentForm({
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
  const [date, setDate] = useState(appointmentToEdit?.date ?? defaultDate);
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

  const handleStartTimeChange = (newStartTime: string) => {
    setStartTime(newStartTime);
    setErrors((prev) => {
      if (!prev.startTime && !prev.endTime) return prev;
      const next = { ...prev };
      delete next.startTime;
      delete next.endTime;
      return next;
    });

    // Auto-advance endTime if valid and newStartTime >= current endTime
    if (isValidTime(newStartTime) && isValidTime(endTime)) {
      const newStartMin = timeToMinutes(newStartTime);
      const currentEndMin = timeToMinutes(endTime);
      if (newStartMin !== null && currentEndMin !== null && newStartMin >= currentEndMin) {
        const prevStartMin = timeToMinutes(startTime);
        const prevDuration =
          prevStartMin !== null && currentEndMin > prevStartMin
            ? currentEndMin - prevStartMin
            : 60;
        const nextEndMin = Math.min(1439, newStartMin + Math.max(30, prevDuration));
        setEndTime(minutesToTime(nextEndMin));
      }
    }
  };

  const handleEndTimeChange = (newEndTime: string) => {
    setEndTime(newEndTime);
    setErrors((prev) => {
      if (!prev.startTime && !prev.endTime) return prev;
      const next = { ...prev };
      delete next.startTime;
      delete next.endTime;
      return next;
    });
  };

  const currentDuration =
    isValidTime(startTime) && isValidTime(endTime)
      ? durationMinutes(startTime, endTime)
      : null;

  const validDuration =
    currentDuration !== null && currentDuration > 0 ? currentDuration : null;

  const handlePresetClick = (minutes: number) => {
    if (isValidTime(startTime)) {
      const newEnd = calculateEndTime(startTime, minutes);
      if (newEnd) {
        setEndTime(newEnd);
        setErrors((prev) => {
          if (!prev.startTime && !prev.endTime) return prev;
          const next = { ...prev };
          delete next.startTime;
          delete next.endTime;
          return next;
        });
      }
    }
  };

  const startTimeError =
    errors.startTime ||
    (isTimeOrderInvalid
      ? 'O horário de início deve ser anterior ao horário de término.'
      : undefined);

  const endTimeError =
    errors.endTime ||
    (isTimeOrderInvalid
      ? 'O horário de término deve ser posterior ao horário de início.'
      : undefined);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isTimeOrderInvalid) {
      setErrors((prev) => ({
        ...prev,
        startTime: 'O horário de início deve ser anterior ao horário de término.',
        endTime:
          'O horário de término deve ser posterior ao horário de início.',
      }));
      return;
    }

    const candidate: Appointment = {
      id: appointmentToEdit ? appointmentToEdit.id : `apt-${Date.now()}`,
      title: title.trim(),
      professional: professional.trim(),
      date,
      startTime,
      endTime,
      status,
    };

    const validation = validateAppointment(candidate);
    if (!validation.valid) {
      const errorMap: Record<string, string> = {};
      for (const err of validation.errors) {
        if (err.field === 'endTime' && err.message.includes('strictly later')) {
          errorMap[err.field] =
            'O horário de término deve ser posterior ao horário de início.';
        } else if (err.field === 'startTime' && err.message.includes('strictly earlier')) {
          errorMap[err.field] =
            'O horário de início deve ser anterior ao horário de término.';
        } else {
          errorMap[err.field] = err.message;
        }
      }
      setErrors(errorMap);
      return;
    }

    const result = onSave(candidate);
    if (!result.success && result.errors) {
      const errorMap: Record<string, string> = {};
      for (const err of result.errors) {
        errorMap[err.field] = err.message;
      }
      setErrors(errorMap);
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
            className={cn(errors.title && 'border-destructive focus-visible:ring-destructive/30')}
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
            className={cn(errors.professional && 'border-destructive focus-visible:ring-destructive/30')}
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
            className={cn(errors.date && 'border-destructive focus-visible:ring-destructive/30')}
          />
          {errors.date && (
            <span className="text-xs text-destructive" role="alert">
              {errors.date}
            </span>
          )}
        </div>

        {/* Start and End Times */}
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1">
            <Label htmlFor="appointment-start-time">Início *</Label>
            <Input
              id="appointment-start-time"
              type="time"
              name="startTime"
              value={startTime}
              onChange={(e) => handleStartTimeChange(e.target.value)}
              aria-invalid={Boolean(startTimeError)}
              className={cn(startTimeError && 'border-destructive focus-visible:ring-destructive/30')}
            />
            {startTimeError && (
              <span className="text-xs text-destructive" role="alert">
                {startTimeError}
              </span>
            )}
          </div>

          <div className="grid gap-1">
            <Label htmlFor="appointment-end-time">Término *</Label>
            <Input
              id="appointment-end-time"
              type="time"
              name="endTime"
              value={endTime}
              min={isValidTime(startTime) ? startTime : undefined}
              onChange={(e) => handleEndTimeChange(e.target.value)}
              aria-invalid={Boolean(endTimeError)}
              className={cn(endTimeError && 'border-destructive focus-visible:ring-destructive/30')}
            />
            {endTimeError && (
              <span className="text-xs text-destructive" role="alert">
                {endTimeError}
              </span>
            )}
          </div>
        </div>

        {/* Duration indicator and quick presets */}
        <div className="space-y-1.5 -mt-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Duração:</span>
            <span className="font-medium text-foreground">
              {validDuration !== null ? formatDuration(validDuration) : '—'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-xs text-muted-foreground mr-1">Ajuste rápido:</span>
            {DURATION_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => handlePresetClick(preset.minutes)}
                className={cn(
                  'px-2 py-0.5 text-xs rounded border transition-colors',
                  validDuration === preset.minutes
                    ? 'bg-primary text-primary-foreground border-primary font-medium'
                    : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-border'
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Status select field */}
        <div className="grid gap-1">
          <Label htmlFor="appointment-status">Status *</Label>
          <select
            id="appointment-status"
            name="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as AppointmentStatus)}
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
          title={isTimeOrderInvalid ? 'O horário de término deve ser posterior ao horário de início.' : undefined}
        >
          {isEditing ? 'Salvar Alterações' : 'Criar Compromisso'}
        </Button>
      </DialogFooter>
    </form>
  );
}

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
