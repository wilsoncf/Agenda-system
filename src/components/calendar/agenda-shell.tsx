'use client';

/**
 * AgendaShell — top-level client component for the weekly agenda.
 *
 * Coordinates calendar state and semantic application commands
 * from AgendaProvider with presentation components and CRUD dialogs.
 */

import React, { useMemo, useState } from 'react';
import { AgendaProvider, useAgenda } from '@/providers/agenda-provider';
import { CalendarHeader } from './calendar-header';
import { WeeklyGrid } from './weekly-grid';
import { AppointmentDialog } from '@/components/appointment/appointment-dialog';
import { DeleteConfirmDialog } from '@/components/appointment/delete-confirm-dialog';
import type { Appointment, AppointmentDocument } from '@/domain/appointment';

function AgendaContent() {
  const {
    state,
    createAppointment,
    updateAppointment,
    deleteAppointment,
    selectAppointment,
    setWeek,
  } = useAgenda();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState<Appointment | null>(null);

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
      />

      <WeeklyGrid
        weekMonday={state.currentWeekStart}
        appointments={state.appointments}
        selectedAppointmentId={state.selectedAppointmentId}
        onSelectAppointment={handleSelectAppointment}
        onClearSelection={handleClearSelection}
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
  readonly children?: React.ReactNode;
};

export function AgendaShell({
  initialAppointments,
  initialWeekStart,
  children,
}: AgendaShellProps = {}) {
  return (
    <AgendaProvider
      initialAppointments={initialAppointments}
      initialWeekStart={initialWeekStart}
    >
      {children}
      <AgendaContent />
    </AgendaProvider>
  );
}

export { AgendaContent };
