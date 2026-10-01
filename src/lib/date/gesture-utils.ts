/**
 * Pure gesture calculation utilities for Drag and Resize operations.
 */

import {
  timeToMinutes,
  minutesToTime,
} from './time-utils';
import type { CalendarConfig } from './calendar-utils';
import { DEFAULT_CALENDAR_CONFIG } from './calendar-utils';

/**
 * Snaps minutes to the nearest interval (e.g. 15 minutes).
 */
export function snapToInterval(minutes: number, stepMinutes: number = 15): number {
  if (stepMinutes <= 1) return Math.round(minutes);
  return Math.round(minutes / stepMinutes) * stepMinutes;
}

/**
 * Converts vertical pixel delta to minutes based on calendar hourHeight.
 */
export function pixelsToMinutes(
  pixels: number,
  hourHeight: number = DEFAULT_CALENDAR_CONFIG.hourHeight
): number {
  const pixelsPerMinute = hourHeight / 60;
  if (pixelsPerMinute <= 0) return 0;
  return Math.round(pixels / pixelsPerMinute);
}

export type DragCalculationParams = {
  readonly originalStartTime: string;
  readonly originalEndTime: string;
  readonly originalDate: string;
  readonly deltaY: number;
  readonly dayOffset: number; // -6 to +6 relative day index change
  readonly weekDates: ReadonlyArray<string>; // 7 dates (Mon-Sun)
  readonly config?: CalendarConfig;
  readonly stepMinutes?: number;
};

export type DragCalculationResult = {
  readonly nextDate: string;
  readonly nextStartTime: string;
  readonly nextEndTime: string;
  readonly isValid: boolean;
};

/**
 * Computes target date and times for a drag-and-move gesture.
 * Preserves appointment duration and clamps to calendar day bounds.
 */
export function calculateDragTarget({
  originalStartTime,
  originalEndTime,
  originalDate,
  deltaY,
  dayOffset,
  weekDates,
  config = DEFAULT_CALENDAR_CONFIG,
  stepMinutes = 15,
}: DragCalculationParams): DragCalculationResult {
  const origStartMin = timeToMinutes(originalStartTime);
  const origEndMin = timeToMinutes(originalEndTime);

  if (origStartMin === null || origEndMin === null || origEndMin <= origStartMin) {
    return {
      nextDate: originalDate,
      nextStartTime: originalStartTime,
      nextEndTime: originalEndTime,
      isValid: false,
    };
  }

  const duration = origEndMin - origStartMin;
  const rawDeltaMin = pixelsToMinutes(deltaY, config.hourHeight);
  const snappedDeltaMin = snapToInterval(rawDeltaMin, stepMinutes);

  const dayStartMin = config.startHour * 60;
  const dayEndMin = config.endHour * 60;

  // Clamp new start minutes so appointment stays within visible calendar bounds
  const minAllowedStart = dayStartMin;
  const maxAllowedStart = Math.max(dayStartMin, dayEndMin - duration);

  const desiredStartMin = origStartMin + snappedDeltaMin;
  const clampedStartMin = Math.max(
    minAllowedStart,
    Math.min(maxAllowedStart, desiredStartMin)
  );
  const clampedEndMin = clampedStartMin + duration;

  // Determine target date from weekDates and dayOffset
  const currentDayIndex = weekDates.indexOf(originalDate);
  let nextDate = originalDate;

  if (currentDayIndex >= 0 && weekDates.length > 0) {
    const targetIndex = Math.max(
      0,
      Math.min(weekDates.length - 1, currentDayIndex + dayOffset)
    );
    const candidateDate = weekDates[targetIndex];
    if (candidateDate) {
      nextDate = candidateDate;
    }
  }

  const nextStartTime = minutesToTime(clampedStartMin);
  const nextEndTime = minutesToTime(clampedEndMin);

  return {
    nextDate,
    nextStartTime,
    nextEndTime,
    isValid: true,
  };
}

export type ResizeCalculationParams = {
  readonly originalStartTime: string;
  readonly originalEndTime: string;
  readonly deltaY: number;
  readonly config?: CalendarConfig;
  readonly stepMinutes?: number;
  readonly minDurationMinutes?: number;
};

export type ResizeCalculationResult = {
  readonly nextStartTime: string;
  readonly nextEndTime: string;
  readonly isValid: boolean;
};

/**
 * Computes target end time for a resize gesture (resizing from bottom).
 * Enforces minimum duration and bounds.
 */
export function calculateResizeTarget({
  originalStartTime,
  originalEndTime,
  deltaY,
  config = DEFAULT_CALENDAR_CONFIG,
  stepMinutes = 15,
  minDurationMinutes = 15,
}: ResizeCalculationParams): ResizeCalculationResult {
  const origStartMin = timeToMinutes(originalStartTime);
  const origEndMin = timeToMinutes(originalEndTime);

  if (origStartMin === null || origEndMin === null || origEndMin <= origStartMin) {
    return {
      nextStartTime: originalStartTime,
      nextEndTime: originalEndTime,
      isValid: false,
    };
  }

  const rawDeltaMin = pixelsToMinutes(deltaY, config.hourHeight);
  const snappedDeltaMin = snapToInterval(rawDeltaMin, stepMinutes);

  const dayEndMin = config.endHour * 60;
  const minEndMin = origStartMin + minDurationMinutes;
  const maxEndMin = dayEndMin;

  const desiredEndMin = origEndMin + snappedDeltaMin;
  const clampedEndMin = Math.max(minEndMin, Math.min(maxEndMin, desiredEndMin));

  const nextEndTime = minutesToTime(clampedEndMin);

  return {
    nextStartTime: originalStartTime,
    nextEndTime,
    isValid: clampedEndMin > origStartMin,
  };
}
