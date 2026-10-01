'use client';

/**
 * AppointmentCard — renders an appointment in the weekly grid.
 
 */

import React from 'react';
import type { Appointment, AppointmentStatus } from '@/domain/appointment';
import { durationMinutes } from '@/lib/date/time-utils';
import { cn } from '@/lib/utils';

type AppointmentCardProps = {
  readonly appointment: Appointment;
  readonly isSelected: boolean;
  readonly onSelect: (id: string) => void;
  readonly style?: React.CSSProperties;
  readonly height?: number;
  readonly isDragging?: boolean;
  readonly onStartDrag?: (e: React.PointerEvent, appointment: Appointment) => void;
  readonly onStartResize?: (e: React.PointerEvent, appointment: Appointment) => void;
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
  height,
  isDragging = false,
  onStartDrag,
  onStartResize,
}: AppointmentCardProps) {
  const statusConfig = STATUS_STYLES[appointment.status];
  const statusLabel = STATUS_LABELS[appointment.status];

  const cardHeight =
    height ??
    (typeof style?.height === 'number'
      ? style.height
      : typeof style?.height === 'string'
      ? parseFloat(style.height)
      : (durationMinutes(appointment.startTime, appointment.endTime) ?? 60));

  const isCompact = cardHeight < 30;
  const isIntermediate = cardHeight >= 30 && cardHeight < 50;

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

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only primary button
    if (e.button !== 0) return;
    // Don't drag if initiated from resize handle
    const target = e.target as HTMLElement | null;
    if (target?.closest('[data-testid^="resize-handle"]')) {
      return;
    }
    if (onStartDrag) {
      onStartDrag(e, appointment);
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
      onPointerDown={handlePointerDown}
      style={style}
      className={cn(
        'absolute rounded-md border text-xs text-left select-none overflow-hidden transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        isCompact ? 'px-1.5 py-0.5' : isIntermediate ? 'px-1.5 py-1' : 'p-1.5',
        statusConfig.container,
        isDragging
          ? 'ring-2 ring-primary shadow-2xl opacity-90 scale-[1.02] z-30 cursor-grabbing'
          : isSelected
          ? 'ring-2 ring-primary ring-offset-1 shadow-md z-20 font-medium cursor-grab'
          : onStartDrag
          ? 'hover:shadow-sm z-10 cursor-grab'
          : 'hover:shadow-sm z-10 cursor-pointer'
      )}
    >
      {isCompact ? (
        <div className="flex items-center justify-between gap-1 w-full min-w-0 h-full leading-none">
          <span className="font-semibold truncate text-[11px] flex-1">
            {appointment.title}
          </span>
          <span className="font-mono text-[9px] opacity-75 whitespace-nowrap shrink-0">
            {appointment.startTime}
          </span>
        </div>
      ) : isIntermediate ? (
        <div className="flex flex-col justify-center h-full w-full min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-1 leading-none">
            <span className="font-semibold truncate text-xs flex-1">
              {appointment.title}
            </span>
            <span className="font-mono text-[10px] opacity-80 whitespace-nowrap shrink-0">
              {appointment.startTime} – {appointment.endTime}
            </span>
          </div>
          {cardHeight >= 40 && (
            <div className="text-[10px] opacity-75 truncate leading-tight mt-0.5">
              {appointment.professional}
            </div>
          )}
        </div>
      ) : (
        <>
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
        </>
      )}

      {/* Resize Handle at the bottom edge */}
      {onStartResize && (
        <div
          role="separator"
          aria-orientation="horizontal"
          aria-label={`Redimensionar compromisso ${appointment.title}`}
          data-testid={`resize-handle-${appointment.id}`}
          className="absolute bottom-0 inset-x-0 h-2 cursor-ns-resize hover:bg-black/15 dark:hover:bg-white/15 transition-colors z-20 flex items-center justify-center group"
          onPointerDown={(e) => {
            e.stopPropagation();
            onStartResize(e, appointment);
          }}
        >
          <div className="w-4 h-0.5 rounded-full bg-foreground/25 group-hover:bg-foreground/50 transition-colors pointer-events-none" />
        </div>
      )}
    </div>
  );
}
