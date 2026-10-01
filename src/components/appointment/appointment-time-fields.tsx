'use client';

/**
 * AppointmentTimeFields — Start/end time inputs, duration readout, and quick preset buttons.
 */

import React from 'react';
import { isValidTime, formatDuration } from '@/lib/date/time-utils';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DURATION_PRESETS } from './appointment-form-utils';

export type AppointmentTimeFieldsProps = {
  readonly startTime: string;
  readonly endTime: string;
  readonly onStartTimeChange: (newStartTime: string) => void;
  readonly onEndTimeChange: (newEndTime: string) => void;
  readonly onPresetClick: (minutes: number) => void;
  readonly validDuration: number | null;
  readonly startTimeError?: string;
  readonly endTimeError?: string;
};

export function AppointmentTimeFields({
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  onPresetClick,
  validDuration,
  startTimeError,
  endTimeError,
}: AppointmentTimeFieldsProps) {
  return (
    <>
      {/* Start and End Times */}
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1">
          <Label htmlFor="appointment-start-time">Início *</Label>
          <Input
            id="appointment-start-time"
            type="time"
            name="startTime"
            value={startTime}
            onChange={(e) => onStartTimeChange(e.target.value)}
            aria-invalid={Boolean(startTimeError)}
            className={cn(
              startTimeError && 'border-destructive focus-visible:ring-destructive/30'
            )}
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
            onChange={(e) => onEndTimeChange(e.target.value)}
            aria-invalid={Boolean(endTimeError)}
            className={cn(
              endTimeError && 'border-destructive focus-visible:ring-destructive/30'
            )}
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
              onClick={() => onPresetClick(preset.minutes)}
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
    </>
  );
}
