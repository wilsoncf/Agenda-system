import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AgendaShell } from '@/components/calendar/agenda-shell';
import { useAgenda } from '@/providers/agenda-provider';
import { FIXTURE_WEEK_START } from '@/domain/appointment';
import type { Appointment } from '@/domain/appointment';

// Helper component to inspect history state and present appointments
function HistoryWatcher() {
  const { state } = useAgenda();
  return (
    <div data-testid="history-info">
      <span data-testid="past-count">{state.history.past.length}</span>
      <span data-testid="future-count">{state.history.future.length}</span>
      <span data-testid="can-undo">{String(state.canUndo)}</span>
      <span data-testid="can-redo">{String(state.canRedo)}</span>
      <span data-testid="selected-id">{state.selectedAppointmentId ?? 'none'}</span>
      <span data-testid="appointment-details">
        {state.appointments
          .map(
            (a) =>
              `${a.id}|${a.title}|${a.date}|${a.startTime}-${a.endTime}|${a.professional}|${a.status}`
          )
          .join(';;')}
      </span>
    </div>
  );
}

function renderAgenda(initialAppointments?: Appointment[]) {
  return render(
    <AgendaShell
      initialWeekStart={FIXTURE_WEEK_START}
      initialAppointments={initialAppointments}
    >
      <HistoryWatcher />
    </AgendaShell>
  );
}

describe('F3 — Time, Duration and Move Mutations', () => {
  const baseAppointment: Appointment = {
    id: 'apt-f3-1',
    title: 'Consulta Geral',
    professional: 'Dra. Helena',
    date: '2024-01-15',
    startTime: '09:00',
    endTime: '10:00',
    status: 'confirmed',
  };

  it('changing start time updates appointment time without altering unrelated fields', async () => {
    renderAgenda([baseAppointment]);

    // Select appointment
    fireEvent.click(screen.getByRole('button', { name: /Consulta Geral/i }));
    // Open edit dialog
    fireEvent.click(screen.getByRole('button', { name: /Editar compromisso Consulta Geral/i }));

    const startInput = screen.getByLabelText(/Início \*/i);
    fireEvent.change(startInput, { target: { value: '09:30' } });

    // Submit changes
    fireEvent.click(screen.getByRole('button', { name: /Salvar Alterações/i }));

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /Editar Compromisso/i })).not.toBeInTheDocument();
    });

    // Verify appointment details in history watcher
    const details = screen.getByTestId('appointment-details').textContent;
    expect(details).toContain('apt-f3-1|Consulta Geral|2024-01-15|09:30-10:00|Dra. Helena|confirmed');

    // Exactly one history entry created
    expect(screen.getByTestId('past-count').textContent).toBe('1');
  });

  it('changing end time updates duration correctly', async () => {
    renderAgenda([baseAppointment]);

    fireEvent.click(screen.getByRole('button', { name: /Consulta Geral/i }));
    fireEvent.click(screen.getByRole('button', { name: /Editar compromisso Consulta Geral/i }));

    const endInput = screen.getByLabelText(/Término \*/i);
    // Change end time from 10:00 to 11:30 (1h30min duration)
    fireEvent.change(endInput, { target: { value: '11:30' } });

    // Verify live duration indicator
    expect(screen.getByText('2h 30min')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Salvar Alterações/i }));

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /Editar Compromisso/i })).not.toBeInTheDocument();
    });

    const details = screen.getByTestId('appointment-details').textContent;
    expect(details).toContain('09:00-11:30');
    expect(screen.getByTestId('past-count').textContent).toBe('1');
  });

  it('quick duration presets adjust end time instantly in the form', async () => {
    renderAgenda([baseAppointment]);

    fireEvent.click(screen.getByRole('button', { name: /Consulta Geral/i }));
    fireEvent.click(screen.getByRole('button', { name: /Editar compromisso Consulta Geral/i }));

    const endInput = screen.getByLabelText(/Término \*/i) as HTMLInputElement;
    expect(endInput.value).toBe('10:00');

    // Click 45m preset button
    const preset45 = screen.getByRole('button', { name: '45m' });
    fireEvent.click(preset45);

    // End time should become 09:45
    expect(endInput.value).toBe('09:45');
    expect(screen.getByText('45 min')).toBeInTheDocument();

    // Click 1h30 preset button
    const preset90 = screen.getByRole('button', { name: '1h30' });
    fireEvent.click(preset90);

    // End time should become 10:30
    expect(endInput.value).toBe('10:30');
    expect(screen.getByText('1h 30min')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Salvar Alterações/i }));

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /Editar Compromisso/i })).not.toBeInTheDocument();
    });

    const details = screen.getByTestId('appointment-details').textContent;
    expect(details).toContain('09:00-10:30');
    expect(screen.getByTestId('past-count').textContent).toBe('1');
  });

  it('moves appointment to another date and time consistently', async () => {
    renderAgenda([baseAppointment]);

    fireEvent.click(screen.getByRole('button', { name: /Consulta Geral/i }));
    fireEvent.click(screen.getByRole('button', { name: /Editar compromisso Consulta Geral/i }));

    // Change date from Monday (2024-01-15) to Thursday (2024-01-18)
    const dateInput = screen.getByLabelText(/Data \*/i);
    fireEvent.change(dateInput, { target: { value: '2024-01-18' } });

    // Change time from 09:00-10:00 to 14:00-15:00
    const startInput = screen.getByLabelText(/Início \*/i);
    const endInput = screen.getByLabelText(/Término \*/i);
    fireEvent.change(startInput, { target: { value: '14:00' } });
    fireEvent.change(endInput, { target: { value: '15:00' } });

    fireEvent.click(screen.getByRole('button', { name: /Salvar Alterações/i }));

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /Editar Compromisso/i })).not.toBeInTheDocument();
    });

    const details = screen.getByTestId('appointment-details').textContent;
    // Check moved date and time, and preserved fields
    expect(details).toContain('apt-f3-1|Consulta Geral|2024-01-18|14:00-15:00|Dra. Helena|confirmed');
    expect(screen.getByTestId('past-count').textContent).toBe('1');
  });

  it('rejects invalid intervals and does not commit a history transaction', async () => {
    renderAgenda([baseAppointment]);

    fireEvent.click(screen.getByRole('button', { name: /Consulta Geral/i }));
    fireEvent.click(screen.getByRole('button', { name: /Editar compromisso Consulta Geral/i }));

    const startInput = screen.getByLabelText(/Início \*/i);
    const endInput = screen.getByLabelText(/Término \*/i);

    // Set end earlier than start
    fireEvent.change(startInput, { target: { value: '14:00' } });
    fireEvent.change(endInput, { target: { value: '13:00' } });

    const submitBtn = screen.getByRole('button', { name: /Salvar Alterações/i }) as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);

    expect(
      screen.getByText(/O horário de início deve ser anterior ao horário de término/i)
    ).toBeInTheDocument();

    // Dialog stays open and past history count remains 0
    expect(screen.getByTestId('past-count').textContent).toBe('0');
  });

  it('multiple field changes within one edit dialog result in exactly one history entry upon submit', async () => {
    renderAgenda([baseAppointment]);

    fireEvent.click(screen.getByRole('button', { name: /Consulta Geral/i }));
    fireEvent.click(screen.getByRole('button', { name: /Editar compromisso Consulta Geral/i }));

    // Type multiple characters into title, change date, change start time, change end time
    const titleInput = screen.getByLabelText(/Título \*/i);
    fireEvent.change(titleInput, { target: { value: 'Consulta C' } });
    fireEvent.change(titleInput, { target: { value: 'Consulta Car' } });
    fireEvent.change(titleInput, { target: { value: 'Consulta Cardiológica' } });

    fireEvent.change(screen.getByLabelText(/Data \*/i), { target: { value: '2024-01-16' } });
    fireEvent.change(screen.getByLabelText(/Início \*/i), { target: { value: '10:00' } });
    fireEvent.change(screen.getByLabelText(/Término \*/i), { target: { value: '11:15' } });

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /Salvar Alterações/i }));

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /Editar Compromisso/i })).not.toBeInTheDocument();
    });

    // History past count must be exactly 1, not 6
    expect(screen.getByTestId('past-count').textContent).toBe('1');
    expect(screen.getByTestId('can-undo').textContent).toBe('true');
  });

  it('saving without modifications does not create unnecessary history entries (no-op protection)', async () => {
    renderAgenda([baseAppointment]);

    fireEvent.click(screen.getByRole('button', { name: /Consulta Geral/i }));
    fireEvent.click(screen.getByRole('button', { name: /Editar compromisso Consulta Geral/i }));

    // Submit without changing any values
    fireEvent.click(screen.getByRole('button', { name: /Salvar Alterações/i }));

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /Editar Compromisso/i })).not.toBeInTheDocument();
    });

    // History past count remains 0 due to areAppointmentsEqual no-op protection
    expect(screen.getByTestId('past-count').textContent).toBe('0');
    expect(screen.getByTestId('can-undo').textContent).toBe('false');
  });
});
