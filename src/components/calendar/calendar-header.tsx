'use client';

import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { addWeeks, formatWeekRange } from '@/lib/date/calendar-utils';
import { FIXTURE_WEEK_START } from '@/domain/appointment';
import type { Appointment } from '@/domain/appointment';

type CalendarHeaderProps = {
  readonly currentWeekStart: string;
  readonly onWeekChange: (newWeekStart: string) => void;
  readonly selectedAppointment?: Appointment;
  readonly onClearSelection: () => void;
  readonly onOpenCreate: () => void;
  readonly onOpenEdit?: () => void;
  readonly onOpenDelete?: () => void;
};

export function CalendarHeader({
  currentWeekStart,
  onWeekChange,
  selectedAppointment,
  onClearSelection,
  onOpenCreate,
  onOpenEdit,
  onOpenDelete,
}: CalendarHeaderProps) {
  const weekLabel = formatWeekRange(currentWeekStart);

  const handlePrevWeek = () => {
    onWeekChange(addWeeks(currentWeekStart, -1));
  };

  const handleNextWeek = () => {
    onWeekChange(addWeeks(currentWeekStart, 1));
  };

  const handleJumpToFixture = () => {
    onWeekChange(FIXTURE_WEEK_START);
  };

  return (
    <header className="border-b border-border bg-card p-4 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Title and date range */}
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CalendarIcon className="size-5 text-primary" aria-hidden="true" />
            Agenda Semanal
          </h1>
          <p
            className="text-sm font-medium text-muted-foreground mt-0.5 capitalize"
            aria-live="polite"
          >
            {weekLabel}
          </p>
        </div>

        {/* Actions: Navigation and Create button */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Week navigation */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevWeek}
              aria-label="Semana anterior"
            >
              <ChevronLeft className="size-4" />
              <span className="hidden sm:inline">Anterior</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleJumpToFixture}
              aria-label="Ir para semana de demonstração"
            >
              Semana Demo
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleNextWeek}
              aria-label="Próxima semana"
            >
              <span className="hidden sm:inline">Próxima</span>
              <ChevronRight className="size-4" />
            </Button>
          </div>

          {/* New appointment action */}
          <Button
            size="sm"
            onClick={onOpenCreate}
            aria-label="Adicionar novo compromisso"
            className="gap-1.5"
          >
            <Plus className="size-4" />
            <span>Novo Compromisso</span>
          </Button>
        </div>
      </div>

      {/* Selected appointment status & actions banner */}
      {selectedAppointment && (
        <div
          role="status"
          aria-live="polite"
          className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs"
        >
          <div className="flex items-center gap-2 overflow-hidden min-w-0">
            <span className="font-semibold text-primary shrink-0">
              Selecionado:
            </span>
            <span className="font-medium truncate text-foreground">
              {selectedAppointment.title}
            </span>
            <span className="text-muted-foreground shrink-0 hidden sm:inline">
              ({selectedAppointment.date}, {selectedAppointment.startTime}–{selectedAppointment.endTime})
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            {onOpenEdit && (
              <Button
                variant="outline"
                size="xs"
                onClick={onOpenEdit}
                aria-label={`Editar compromisso ${selectedAppointment.title}`}
                className="gap-1 text-xs"
              >
                <Pencil className="size-3" />
                <span>Editar</span>
              </Button>
            )}

            {onOpenDelete && (
              <Button
                variant="destructive"
                size="xs"
                onClick={onOpenDelete}
                aria-label={`Excluir compromisso ${selectedAppointment.title}`}
                className="gap-1 text-xs"
              >
                <Trash2 className="size-3" />
                <span>Excluir</span>
              </Button>
            )}

            <Button
              variant="ghost"
              size="xs"
              onClick={onClearSelection}
              aria-label="Desmarcar compromisso selecionado"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-3 mr-0.5" />
              <span>Limpar</span>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
