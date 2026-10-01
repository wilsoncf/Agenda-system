/**
 * Deterministic fixture/seed data for the agenda.
 *
 * Uses a fixed week (2024-01-15 to 2024-01-21, Monday to Sunday)
 * for predictable testing and development.
 */

import type { Appointment } from './types';

/**
 * The fixture week start date (Monday).
 * All fixture appointments fall within this week.
 */
export const FIXTURE_WEEK_START = '2024-01-15';

/**
 * Seed appointments covering various days, times, statuses, and professionals.
 * Each appointment has a stable ID for deterministic tests.
 */
export const SEED_APPOINTMENTS: ReadonlyArray<Appointment> = [
  {
    id: 'apt-001',
    title: 'Consulta de rotina',
    date: '2024-01-15',
    startTime: '09:00',
    endTime: '09:30',
    professional: 'Dr. Silva',
    status: 'confirmed',
  },
  {
    id: 'apt-002',
    title: 'Avaliação nutricional',
    date: '2024-01-15',
    startTime: '10:00',
    endTime: '11:00',
    professional: 'Dra. Santos',
    status: 'pending',
  },
  {
    id: 'apt-003',
    title: 'Fisioterapia',
    date: '2024-01-16',
    startTime: '14:00',
    endTime: '15:00',
    professional: 'Dr. Oliveira',
    status: 'confirmed',
  },
  {
    id: 'apt-004',
    title: 'Retorno cardiologia',
    date: '2024-01-17',
    startTime: '08:00',
    endTime: '08:45',
    professional: 'Dr. Silva',
    status: 'completed',
  },
  {
    id: 'apt-005',
    title: 'Exame laboratorial',
    date: '2024-01-18',
    startTime: '07:30',
    endTime: '08:00',
    professional: 'Dra. Santos',
    status: 'pending',
  },
  {
    id: 'apt-006',
    title: 'Sessão de terapia',
    date: '2024-01-19',
    startTime: '16:00',
    endTime: '17:00',
    professional: 'Dra. Lima',
    status: 'cancelled',
  },
] as const;
