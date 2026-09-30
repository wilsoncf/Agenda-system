'use client';

/**
 * AppointmentCard — renders an appointment in the weekly grid.
 *
 * Implements keyboard accessibility, distinct selection styling,
 * status badges, and strict non-index identity.
 */

import React from 'react';
import type { Appointment, AppointmentStatus } from '@/domain/appointment';
import { cn } from '@/lib/utils';

type AppointmentCardProps = {
  readonly appointment: Appointment;
  readonly isSelected: boolean;
  readonly onSelect: (id: string) => void;
  readonly style?: React.CSSProperties;
};

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  confirmed: 'Confirmado',
  pending: 'Pendente',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

const STATUS_STYLES: Record<
  AppointmentStatus,
  {
    container: string;
    badge: string;
  }
> = {
  confirmed: {
    container:
      'bg-emerald-50 border-emerald-300 text-emerald-950 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-100',
    badge:
      'bg-emerald-200/80 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  },
  pending: {
    container:
      'bg-amber-50 border-amber-300 text-amber-950 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-100',
    badge:
      'bg-amber-200/80 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  },
  completed: {
    container:
      'bg-sky-50 border-sky-300 text-sky-950 dark:bg-sky-950/40 dark:border-sky-800 dark:text-sky-100',
    badge:
      'bg-sky-200/80 text-sky-800 dark:bg-sky-900 dark:text-sky-200',
  },
  cancelled: {
    container:
      'bg-rose-50 border-rose-300 text-rose-950 opacity-75 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-200',
    badge:
      'bg-rose-200/80 text-rose-800 dark:bg-rose-900 dark:text-rose-200 line-through',
  },
};

export function AppointmentCard({
  appointment,
  isSelected,
  onSelect,
  style,
}: AppointmentCardProps) {
  const statusConfig = STATUS_STYLES[appointment.status];
  const statusLabel = STATUS_LABELS[appointment.status];

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(appointment.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      onSelect(appointment.id);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      data-appointment-id={appointment.id}
      aria-pressed={isSelected}
      aria-label={`Compromisso: ${appointment.title}, ${appointment.startTime} às ${appointment.endTime}, ${appointment.professional}, status ${statusLabel}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      style={style}
      className={cn(
        'absolute rounded-md border p-1.5 text-xs text-left cursor-pointer select-none overflow-hidden transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        statusConfig.container,
        isSelected
          ? 'ring-2 ring-primary ring-offset-1 shadow-md z-20 font-medium'
          : 'hover:shadow-sm z-10'
      )}
    >
      <div className="flex items-center justify-between gap-1 mb-0.5 leading-none">
        <span className="font-mono text-[10px] opacity-80 whitespace-nowrap">
          {appointment.startTime} – {appointment.endTime}
        </span>
        <span
          className={cn(
            'px-1 py-0.5 rounded text-[9px] font-medium leading-none whitespace-nowrap',
            statusConfig.badge
          )}
        >
          {statusLabel}
        </span>
      </div>

      <div className="font-semibold truncate leading-snug">
        {appointment.title}
      </div>

      <div className="text-[10px] opacity-75 truncate mt-0.5">
        {appointment.professional}
      </div>
    </div>
  );
}
