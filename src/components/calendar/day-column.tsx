'use client';

/**
 * DayColumn — renders a single day's time slots and positioned appointments.
 */

import React from 'react';
import type { Appointment } from '@/domain/appointment';
import type { CalendarConfig, DayOfWeekInfo } from '@/lib/date/calendar-utils';
import {
  DEFAULT_CALENDAR_CONFIG,
  layoutDayAppointments,
} from '@/lib/date/calendar-utils';
import { AppointmentCard } from './appointment-card';

type DayColumnProps = {
  readonly day: DayOfWeekInfo;
  readonly appointments: ReadonlyArray<Appointment>;
  readonly selectedAppointmentId: string | null;
  readonly onSelectAppointment: (id: string) => void;
  readonly config?: CalendarConfig;
};

export function DayColumn({
  day,
  appointments,
  selectedAppointmentId,
  onSelectAppointment,
  config = DEFAULT_CALENDAR_CONFIG,
}: DayColumnProps) {
  const positioned = layoutDayAppointments(appointments, config);
  const totalHours = config.endHour - config.startHour;
  const columnHeight = totalHours * config.hourHeight;

  return (
    <div
      data-testid={`day-column-${day.date}`}
      aria-label={`Agenda para ${day.dayName}, ${day.date}`}
      className="relative flex-1 min-w-[120px] border-r border-border/60 last:border-r-0 select-none bg-background/50"
      style={{ height: `${columnHeight}px` }}
    >
      {/* Horizontal grid lines for hours and half-hours */}
      {Array.from({ length: totalHours }, (_, i) => {
        const topPx = i * config.hourHeight;
        const halfTopPx = topPx + config.hourHeight / 2;
        return (
          <React.Fragment key={i}>
            {/* Hour line */}
            <div
              className="absolute inset-x-0 border-t border-border/60 pointer-events-none"
              style={{ top: `${topPx}px` }}
            />
            {/* Half-hour guide line (dashed) */}
            <div
              className="absolute inset-x-0 border-t border-dashed border-border/30 pointer-events-none"
              style={{ top: `${halfTopPx}px` }}
            />
          </React.Fragment>
        );
      })}

      {/* Final bottom line */}
      <div
        className="absolute inset-x-0 border-t border-border/60 pointer-events-none"
        style={{ top: `${columnHeight}px` }}
      />

      {/* Rendered appointment cards */}
      {positioned.map((item) => {
        const isSelected = item.appointment.id === selectedAppointmentId;
        return (
          <AppointmentCard
            key={item.appointment.id}
            appointment={item.appointment}
            isSelected={isSelected}
            onSelect={onSelectAppointment}
            height={item.placement.height}
            style={{
              top: `${item.placement.top}px`,
              height: `${item.placement.height}px`,
              left: `${item.leftPct}%`,
              width: `calc(${item.widthPct}% - 4px)`,
              marginLeft: '2px',
            }}
          />
        );
      })}
    </div>
  );
}
