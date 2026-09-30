'use client';

/**
 * TimeAxis — renders the vertical time labels on the left of the grid.
 */

import React from 'react';
import type { CalendarConfig } from '@/lib/date/calendar-utils';
import { DEFAULT_CALENDAR_CONFIG } from '@/lib/date/calendar-utils';

type TimeAxisProps = {
  readonly config?: CalendarConfig;
};

export function TimeAxis({ config = DEFAULT_CALENDAR_CONFIG }: TimeAxisProps) {
  const hours = Array.from(
    { length: config.endHour - config.startHour + 1 },
    (_, i) => config.startHour + i
  );

  return (
    <div
      className="w-14 sm:w-16 shrink-0 select-none border-r border-border bg-background/95 sticky left-0 z-20"
      aria-hidden="true"
    >
      {hours.map((hour, index) => {
        const isFirst = index === 0;
        const isLast = index === hours.length - 1;
        const timeLabel = `${String(hour).padStart(2, '0')}:00`;

        return (
          <div
            key={hour}
            style={{ height: isLast ? 0 : `${config.hourHeight}px` }}
            className="relative"
          >
            <span
              className={`absolute right-2 text-[11px] font-mono text-muted-foreground whitespace-nowrap ${
                isFirst ? 'top-0.5' : '-top-2.5'
              }`}
            >
              {timeLabel}
            </span>
          </div>
        );
      })}
    </div>
  );
}
