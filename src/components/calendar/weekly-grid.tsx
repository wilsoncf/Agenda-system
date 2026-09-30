'use client';

/**
 * WeeklyGrid — 7-day calendar grid container.
 */

import React, { useMemo } from 'react';
import type { Appointment } from '@/domain/appointment';
import type { CalendarConfig } from '@/lib/date/calendar-utils';
import {
  DEFAULT_CALENDAR_CONFIG,
  getWeekDates,
} from '@/lib/date/calendar-utils';
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
};

export function WeeklyGrid({
  weekMonday,
  appointments,
  selectedAppointmentId,
  onSelectAppointment,
  onClearSelection,
  config = DEFAULT_CALENDAR_CONFIG,
}: WeeklyGridProps) {
  const weekDays = useMemo(() => getWeekDates(weekMonday), [weekMonday]);

  // Group appointments by date for O(1) day lookup
  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const apt of appointments) {
      const list = map.get(apt.date);
      if (list) {
        list.push(apt);
      } else {
        map.set(apt.date, [apt]);
      }
    }
    return map;
  }, [appointments]);

  const handleGridBackgroundClick = (e: React.MouseEvent) => {
    // If clicked directly on the grid container or background rather than an appointment
    if (e.target === e.currentTarget && onClearSelection) {
      onClearSelection();
    }
  };

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

            {/* 7 Day columns */}
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
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
