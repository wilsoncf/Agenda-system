'use client';

/**
 * AgendaShell — top-level client component for the weekly agenda.
 */

import React, { useMemo, useState } from 'react';
import { AgendaProvider, useAgenda } from '@/providers/agenda-provider';
import { CalendarHeader } from './calendar-header';
import { WeeklyGrid } from './weekly-grid';
import { AppointmentDialog } from '@/components/appointment/appointment-dialog';
import { DeleteConfirmDialog } from '@/components/appointment/delete-confirm-dialog';
import { useCalendarShortcuts } from '@/features/calendar';
import type { Appointment, AppointmentDocument } from '@/domain/appointment';

function AgendaContent() {
  const {
    state,
    createAppointment,
    updateAppointment,
    deleteAppointment,
    moveAppointment,
    resizeAppointment,
    selectAppointment,
    setWeek,
    undoAction,
    redoAction,
  } = useAgenda();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState<Appointment | null>(null);

  // Keyboard shortcuts (Ctrl/Cmd + Z -> Undo, Ctrl/Cmd + Shift + Z / Ctrl+Y -> Redo)
  useCalendarShortcuts({
    onUndo: undoAction,
    onRedo: redoAction,
    enabled: !isCreateOpen && !isEditOpen && !isDeleteOpen,
  });

  const selectedAppointment = useMemo(() => {
    if (!state.selectedAppointmentId) return undefined;
    return state.appointments.find((a) => a.id === state.selectedAppointmentId);
  }, [state.appointments, state.selectedAppointmentId]);

  const handleWeekChange = (newWeekStart: string) => {
    setWeek(newWeekStart);
  };

  const handleSelectAppointment = (id: string) => {
    // Toggling selection if already selected
    const nextId = state.selectedAppointmentId === id ? null : id;
    selectAppointment(nextId);
  };

  const handleClearSelection = () => {
    selectAppointment(null);
  };

  const handleOpenCreate = () => {
    setIsCreateOpen(true);
  };

  const handleOpenEdit = () => {
    if (selectedAppointment) {
      setIsEditOpen(true);
    }
  };

  const handleOpenDelete = () => {
    if (selectedAppointment) {
      setAppointmentToDelete(selectedAppointment);
      setIsDeleteOpen(true);
    }
  };

  const handleSaveNewAppointment = (appointment: Appointment) => {
    return createAppointment(appointment);
  };

  const handleSaveEditedAppointment = (appointment: Appointment) => {
    return updateAppointment(appointment);
  };

  const handleConfirmDelete = (id: string) => {
    deleteAppointment(id);
    setAppointmentToDelete(null);
    setIsDeleteOpen(false);
  };

  const handleMoveAppointment = (id: string, date: string, startTime?: string) => {
    moveAppointment(id, date, startTime);
  };

  const handleResizeAppointment = (id: string, startTime: string, endTime: string) => {
    resizeAppointment(id, startTime, endTime);
  };

  return (
    <div className="flex flex-col h-screen w-full bg-background overflow-hidden">
      <CalendarHeader
        currentWeekStart={state.currentWeekStart}
        onWeekChange={handleWeekChange}
        selectedAppointment={selectedAppointment}
        onClearSelection={handleClearSelection}
        onOpenCreate={handleOpenCreate}
        onOpenEdit={handleOpenEdit}
        onOpenDelete={handleOpenDelete}
        canUndo={state.canUndo}
        canRedo={state.canRedo}
        onUndo={undoAction}
        onRedo={redoAction}
      />

      <WeeklyGrid
        weekMonday={state.currentWeekStart}
        appointments={state.appointments}
        selectedAppointmentId={state.selectedAppointmentId}
        onSelectAppointment={handleSelectAppointment}
        onClearSelection={handleClearSelection}
        onMoveAppointment={handleMoveAppointment}
        onResizeAppointment={handleResizeAppointment}
      />

      {/* Create Dialog */}
      <AppointmentDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        defaultDate={state.currentWeekStart}
        onSave={handleSaveNewAppointment}
      />

      {/* Edit Dialog */}
      <AppointmentDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        appointmentToEdit={selectedAppointment}
        defaultDate={selectedAppointment?.date ?? state.currentWeekStart}
        onSave={handleSaveEditedAppointment}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        appointment={appointmentToDelete}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

export type AgendaShellProps = {
  readonly initialAppointments?: AppointmentDocument;
  readonly initialWeekStart?: string;
  readonly enablePersistence?: boolean;
  readonly storageKey?: string;
  readonly storage?: Storage;
  readonly children?: React.ReactNode;
};

export function AgendaShell({
  initialAppointments,
  initialWeekStart,
  enablePersistence,
  storageKey,
  storage,
  children,
}: AgendaShellProps = {}) {
  return (
    <AgendaProvider
      initialAppointments={initialAppointments}
      initialWeekStart={initialWeekStart}
      enablePersistence={enablePersistence}
      storageKey={storageKey}
      storage={storage}
    >
      {children}
      <AgendaContent />
    </AgendaProvider>
  );
}

export { AgendaContent };
