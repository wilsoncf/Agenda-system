'use client';

/**
 * WeeklyGrid — 7-day calendar grid container with drag and resize interactions.
 */

import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import type { Appointment } from '@/domain/appointment';
import type { CalendarConfig } from '@/lib/date/calendar-utils';
import {
  DEFAULT_CALENDAR_CONFIG,
  getWeekDates,
} from '@/lib/date/calendar-utils';
import {
  calculateDragTarget,
  calculateResizeTarget,
} from '@/lib/date/gesture-utils';
import { TimeAxis } from './time-axis';
import { DayColumn } from './day-column';
import { cn } from '@/lib/utils';

type WeeklyGridProps = {
  readonly weekMonday: string;
  readonly appointments: ReadonlyArray<Appointment>;
  readonly selectedAppointmentId: string | null;
  readonly onSelectAppointment: (id: string) => void;
  readonly onClearSelection?: () => void;
  readonly config?: CalendarConfig;
  readonly onMoveAppointment?: (id: string, date: string, startTime?: string) => void;
  readonly onResizeAppointment?: (id: string, startTime: string, endTime: string) => void;
};

type ActiveGesture = {
  readonly type: 'drag' | 'resize';
  readonly appointment: Appointment;
  readonly initialClientX: number;
  readonly initialClientY: number;
  readonly initialDayIndex: number;
  readonly previewDate: string;
  readonly previewStartTime: string;
  readonly previewEndTime: string;
  readonly hasMoved: boolean;
};

export function WeeklyGrid({
  weekMonday,
  appointments,
  selectedAppointmentId,
  onSelectAppointment,
  onClearSelection,
  config = DEFAULT_CALENDAR_CONFIG,
  onMoveAppointment,
  onResizeAppointment,
}: WeeklyGridProps) {
  const weekDays = useMemo(() => getWeekDates(weekMonday), [weekMonday]);
  const columnsContainerRef = useRef<HTMLDivElement>(null);
  const [gesture, setGesture] = useState<ActiveGesture | null>(null);

  // Compute effective appointments list: applies transient gesture preview if actively dragging/resizing
  const effectiveAppointments = useMemo(() => {
    if (!gesture || !gesture.hasMoved) {
      return appointments;
    }
    return appointments.map((apt) => {
      if (apt.id === gesture.appointment.id) {
        return {
          ...apt,
          date: gesture.previewDate,
          startTime: gesture.previewStartTime,
          endTime: gesture.previewEndTime,
        };
      }
      return apt;
    });
  }, [appointments, gesture]);

  // Group appointments by date for O(1) day lookup
  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const apt of effectiveAppointments) {
      const list = map.get(apt.date);
      if (list) {
        list.push(apt);
      } else {
        map.set(apt.date, [apt]);
      }
    }
    return map;
  }, [effectiveAppointments]);

  const handleGridBackgroundClick = (e: React.MouseEvent) => {
    // If clicked directly on the grid container or background rather than an appointment
    if (e.target === e.currentTarget && onClearSelection) {
      onClearSelection();
    }
  };

  const handleStartDrag = useCallback(
    (e: React.PointerEvent, appointment: Appointment) => {
      if (!onMoveAppointment) return;
      const initialDayIndex = weekDays.findIndex((d) => d.date === appointment.date);
      if (initialDayIndex === -1) return;

      onSelectAppointment(appointment.id);

      setGesture({
        type: 'drag',
        appointment,
        initialClientX: e.clientX,
        initialClientY: e.clientY,
        initialDayIndex,
        previewDate: appointment.date,
        previewStartTime: appointment.startTime,
        previewEndTime: appointment.endTime,
        hasMoved: false,
      });
    },
    [onMoveAppointment, weekDays, onSelectAppointment]
  );

  const handleStartResize = useCallback(
    (e: React.PointerEvent, appointment: Appointment) => {
      if (!onResizeAppointment) return;
      const initialDayIndex = weekDays.findIndex((d) => d.date === appointment.date);
      if (initialDayIndex === -1) return;

      onSelectAppointment(appointment.id);

      setGesture({
        type: 'resize',
        appointment,
        initialClientX: e.clientX,
        initialClientY: e.clientY,
        initialDayIndex,
        previewDate: appointment.date,
        previewStartTime: appointment.startTime,
        previewEndTime: appointment.endTime,
        hasMoved: false,
      });
    },
    [onResizeAppointment, weekDays, onSelectAppointment]
  );

  // Manage window pointer event listeners during active gesture
  useEffect(() => {
    if (!gesture) return;

    const handlePointerMove = (e: PointerEvent) => {
      const deltaX = e.clientX - gesture.initialClientX;
      const deltaY = e.clientY - gesture.initialClientY;
      const dist = Math.hypot(deltaX, deltaY);

      if (!gesture.hasMoved && dist < 4) {
        return;
      }

      if (gesture.type === 'drag') {
        let dayOffset = 0;
        if (columnsContainerRef.current) {
          const rect = columnsContainerRef.current.getBoundingClientRect();
          const colWidth = rect.width / 7;
          if (colWidth > 0) {
            const relativeX = e.clientX - rect.left;
            const targetIndex = Math.max(
              0,
              Math.min(6, Math.floor(relativeX / colWidth))
            );
            dayOffset = targetIndex - gesture.initialDayIndex;
          }
        }

        const weekDateStrings = weekDays.map((d) => d.date);
        const target = calculateDragTarget({
          originalStartTime: gesture.appointment.startTime,
          originalEndTime: gesture.appointment.endTime,
          originalDate: gesture.appointment.date,
          deltaY,
          dayOffset,
          weekDates: weekDateStrings,
          config,
          stepMinutes: 15,
        });

        if (target.isValid) {
          setGesture((prev) =>
            prev
              ? {
                  ...prev,
                  hasMoved: true,
                  previewDate: target.nextDate,
                  previewStartTime: target.nextStartTime,
                  previewEndTime: target.nextEndTime,
                }
              : null
          );
        }
      } else if (gesture.type === 'resize') {
        const target = calculateResizeTarget({
          originalStartTime: gesture.appointment.startTime,
          originalEndTime: gesture.appointment.endTime,
          deltaY,
          config,
          stepMinutes: 15,
          minDurationMinutes: 15,
        });

        if (target.isValid) {
          setGesture((prev) =>
            prev
              ? {
                  ...prev,
                  hasMoved: true,
                  previewStartTime: target.nextStartTime,
                  previewEndTime: target.nextEndTime,
                }
              : null
          );
        }
      }
    };

    const handlePointerUp = () => {
      if (gesture.hasMoved) {
        if (gesture.type === 'drag') {
          const dateChanged = gesture.previewDate !== gesture.appointment.date;
          const timeChanged =
            gesture.previewStartTime !== gesture.appointment.startTime;
          if (dateChanged || timeChanged) {
            onMoveAppointment?.(
              gesture.appointment.id,
              gesture.previewDate,
              gesture.previewStartTime
            );
          }
        } else if (gesture.type === 'resize') {
          const timeChanged =
            gesture.previewEndTime !== gesture.appointment.endTime;
          if (timeChanged) {
            onResizeAppointment?.(
              gesture.appointment.id,
              gesture.previewStartTime,
              gesture.previewEndTime
            );
          }
        }
      }
      setGesture(null);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Cancel gesture without committing
        setGesture(null);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gesture, config, weekDays, onMoveAppointment, onResizeAppointment]);

  return (
    <div
      className="flex-1 flex flex-col min-h-0 overflow-hidden bg-background"
      data-testid="weekly-grid"
    >
      {/* Scrollable calendar view */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-[800px] flex flex-col">
          {/* Sticky day header row */}
          <div className="sticky top-0 z-30 flex border-b border-border bg-background/95 backdrop-blur shadow-xs">
            {/* Top-left corner aligned above time axis */}
            <div
              className="w-14 sm:w-16 shrink-0 border-r border-border bg-background/95 sticky left-0 z-40"
              aria-hidden="true"
            />

            {/* 7 day column headers */}
            {weekDays.map((day) => (
              <div
                key={day.date}
                className={cn(
                  'flex-1 min-w-[120px] py-2.5 px-2 text-center border-r border-border/60 last:border-r-0 select-none transition-colors',
                  day.isToday && 'bg-primary/5'
                )}
              >
                <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  <span className="hidden sm:inline">{day.dayName}</span>
                  <span className="sm:hidden">{day.shortDayName}</span>
                </div>
                <div className="mt-0.5 flex items-center justify-center">
                  <span
                    className={cn(
                      'text-base font-semibold size-7 rounded-full inline-flex items-center justify-center',
                      day.isToday
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground'
                    )}
                  >
                    {day.dayNumber}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Time axis and 7 day columns */}
          <div
            className="flex relative"
            onClick={handleGridBackgroundClick}
          >
            {/* Time labels axis */}
            <TimeAxis config={config} />

            {/* 7 Day columns container */}
            <div ref={columnsContainerRef} className="flex flex-1">
              {weekDays.map((day) => {
                const dayAppointments = appointmentsByDate.get(day.date) ?? [];
                return (
                  <DayColumn
                    key={day.date}
                    day={day}
                    appointments={dayAppointments}
                    selectedAppointmentId={selectedAppointmentId}
                    onSelectAppointment={onSelectAppointment}
                    config={config}
                    onStartDrag={handleStartDrag}
                    onStartResize={handleStartResize}
                    draggingAppointmentId={gesture?.appointment.id}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Floating gesture status pill */}
      {gesture && gesture.hasMoved && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 right-4 z-50 bg-primary text-primary-foreground text-xs font-medium px-3.5 py-2 rounded-full shadow-xl pointer-events-none flex items-center gap-2"
        >
          <span>
            {gesture.type === 'drag' ? 'Movendo para:' : 'Redimensionando para:'}
          </span>
          <span className="font-semibold font-mono">
            {gesture.previewDate} {gesture.previewStartTime}–{gesture.previewEndTime}
          </span>
          <span className="text-[10px] opacity-80">(Esc para cancelar)</span>
        </div>
      )}
    </div>
  );
}
