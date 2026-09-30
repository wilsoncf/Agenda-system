/**
 * Calendar presentation and calculation utilities.
 */

import { timeToMinutes } from './time-utils';
import type { Appointment } from '@/domain/appointment';

export type CalendarConfig = {
  /** First visible hour of the day (0-23), e.g. 7 for 07:00 */
  readonly startHour: number;
  /** Last visible hour of the day (1-24), e.g. 22 for 22:00 */
  readonly endHour: number;
  /** Visual height in pixels for one hour */
  readonly hourHeight: number;
};

export const DEFAULT_CALENDAR_CONFIG: CalendarConfig = {
  startHour: 0,
  endHour: 23,
  hourHeight: 60, // 1px per minute
} as const;

export type DayOfWeekInfo = {
  readonly date: string; // YYYY-MM-DD
  readonly dayIndex: number; // 0 = Mon, ..., 6 = Sun
  readonly dayName: string; // e.g. 'Segunda'
  readonly shortDayName: string; // e.g. 'Seg'
  readonly dayNumber: number; // e.g. 15
  readonly isToday: boolean;
};

const DAY_NAMES = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
  'Domingo',
];

const SHORT_DAY_NAMES = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

const MONTH_NAMES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

/**
 * Add or subtract days from a YYYY-MM-DD date string.
 * Uses UTC dates to avoid any daylight savings or timezone drift.
 */
export function addDays(dateStr: string, days: number): string {
  const parts = dateStr.split('-').map(Number);
  const year = parts[0] ?? 2024;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;

  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);

  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Add or subtract weeks from a YYYY-MM-DD week start date string.
 */
export function addWeeks(weekMonday: string, weeks: number): string {
  return addDays(weekMonday, weeks * 7);
}

/**
 * Given a Monday YYYY-MM-DD date string, returns info for all 7 days of that week.
 */
export function getWeekDates(weekMonday: string, todayStr?: string): DayOfWeekInfo[] {
  const now = new Date();
  const currentToday =
    todayStr ??
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`;

  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekMonday, i);
    const dayNumber = Number(date.split('-')[2]);
    const dayName = DAY_NAMES[i] ?? '';
    const shortDayName = SHORT_DAY_NAMES[i] ?? '';

    return {
      date,
      dayIndex: i,
      dayName,
      shortDayName,
      dayNumber,
      isToday: date === currentToday,
    };
  });
}

/**
 * Formats a week range in pt-BR, e.g. "15 a 21 de janeiro de 2024" or
 * "29 de janeiro a 4 de fevereiro de 2024".
 */
export function formatWeekRange(weekMonday: string): string {
  const sunday = addDays(weekMonday, 6);
  const [startYear, startMonth, startDay] = weekMonday.split('-').map(Number);
  const [endYear, endMonth, endDay] = sunday.split('-').map(Number);

  const startMonthName = MONTH_NAMES[(startMonth ?? 1) - 1] ?? '';
  const endMonthName = MONTH_NAMES[(endMonth ?? 1) - 1] ?? '';

  if (startYear === endYear) {
    if (startMonth === endMonth) {
      return `${startDay} a ${endDay} de ${startMonthName} de ${startYear}`;
    }
    return `${startDay} de ${startMonthName} a ${endDay} de ${endMonthName} de ${startYear}`;
  }

  return `${startDay} de ${startMonthName} de ${startYear} a ${endDay} de ${endMonthName} de ${endYear}`;
}

export type AppointmentPlacement = {
  readonly top: number;
  readonly height: number;
  readonly isVisible: boolean;
};

/**
 * Calculate vertical position (top) and height in pixels for an appointment
 * according to the calendar configuration.
 */
export function calculateAppointmentPlacement(
  appointment: Pick<Appointment, 'startTime' | 'endTime'>,
  config: CalendarConfig = DEFAULT_CALENDAR_CONFIG
): AppointmentPlacement {
  const startMin = timeToMinutes(appointment.startTime);
  const endMin = timeToMinutes(appointment.endTime);

  if (startMin === null || endMin === null || startMin >= endMin) {
    return { top: 0, height: 0, isVisible: false };
  }

  const dayStartMin = config.startHour * 60;
  const dayEndMin = config.endHour * 60;
  const pixelsPerMinute = config.hourHeight / 60;

  // Check if completely outside visible range
  if (endMin <= dayStartMin || startMin >= dayEndMin) {
    return { top: 0, height: 0, isVisible: false };
  }

  // Clamp to visible range
  const clampedStart = Math.max(dayStartMin, startMin);
  const clampedEnd = Math.min(dayEndMin, endMin);

  const top = (clampedStart - dayStartMin) * pixelsPerMinute;
  const rawHeight = (clampedEnd - clampedStart) * pixelsPerMinute;
  // Ensure a minimum height of 24px so short appointments remain readable and clickable
  const height = Math.max(24, rawHeight);

  return {
    top: Math.round(top * 10) / 10,
    height: Math.round(height * 10) / 10,
    isVisible: true,
  };
}

export type PositionedAppointment = {
  readonly appointment: Appointment;
  readonly placement: AppointmentPlacement;
  readonly leftPct: number;
  readonly widthPct: number;
};

/**
 * Layouts appointments for a single day, calculating vertical placement
 * and resolving visual overlaps by distributing columns.
 */
export function layoutDayAppointments(
  appointments: ReadonlyArray<Appointment>,
  config: CalendarConfig = DEFAULT_CALENDAR_CONFIG
): PositionedAppointment[] {
  // 1. Calculate vertical placements and filter visible appointments
  const withPlacement = appointments
    .map((apt) => ({
      appointment: apt,
      placement: calculateAppointmentPlacement(apt, config),
      startMin: timeToMinutes(apt.startTime) ?? 0,
      endMin: timeToMinutes(apt.endTime) ?? 0,
    }))
    .filter((item) => item.placement.isVisible);

  if (withPlacement.length === 0) {
    return [];
  }

  // 2. Sort by start time, then duration descending
  withPlacement.sort((a, b) => {
    if (a.startMin !== b.startMin) {
      return a.startMin - b.startMin;
    }
    return (b.endMin - b.startMin) - (a.endMin - a.startMin);
  });

  // 3. Group into overlapping clusters
  type Item = (typeof withPlacement)[number];
  const clusters: Item[][] = [];
  let currentCluster: Item[] = [];
  let clusterEnd = -1;

  for (const item of withPlacement) {
    if (currentCluster.length === 0) {
      currentCluster.push(item);
      clusterEnd = item.endMin;
    } else if (item.startMin < clusterEnd) {
      // Overlaps with current cluster
      currentCluster.push(item);
      clusterEnd = Math.max(clusterEnd, item.endMin);
    } else {
      // New cluster
      clusters.push(currentCluster);
      currentCluster = [item];
      clusterEnd = item.endMin;
    }
  }

  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  // 4. In each cluster, assign columns using greedy interval coloring
  const result: PositionedAppointment[] = [];

  for (const cluster of clusters) {
    const columnEnds: number[] = [];
    const itemColumns: number[] = [];

    for (const item of cluster) {
      let placedCol = -1;
      for (let c = 0; c < columnEnds.length; c++) {
        const colEnd = columnEnds[c];
        if (colEnd !== undefined && colEnd <= item.startMin) {
          placedCol = c;
          columnEnds[c] = item.endMin;
          break;
        }
      }

      if (placedCol === -1) {
        placedCol = columnEnds.length;
        columnEnds.push(item.endMin);
      }

      itemColumns.push(placedCol);
    }

    const totalCols = columnEnds.length;
    const colWidthPct = 100 / totalCols;

    for (let i = 0; i < cluster.length; i++) {
      const item = cluster[i];
      const col = itemColumns[i] ?? 0;
      if (item) {
        result.push({
          appointment: item.appointment,
          placement: item.placement,
          leftPct: Math.round(col * colWidthPct * 100) / 100,
          widthPct: Math.round(colWidthPct * 100) / 100,
        });
      }
    }
  }

  return result;
}
