import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AgendaShell } from '@/components/calendar/agenda-shell';
import { useAgenda } from '@/providers/agenda-provider';
import { FIXTURE_WEEK_START } from '@/domain/appointment';
import type { Appointment } from '@/domain/appointment';

// Helper component to inspect history state inside tests
function HistoryWatcher() {
  const { state } = useAgenda();
  return (
    <div data-testid="history-info">
      <span data-testid="past-count">{state.history.past.length}</span>
      <span data-testid="future-count">{state.history.future.length}</span>
      <span data-testid="can-undo">{String(state.canUndo)}</span>
      <span data-testid="can-redo">{String(state.canRedo)}</span>
      <span data-testid="selected-id">{state.selectedAppointmentId ?? 'none'}</span>
      <span data-testid="appointment-titles">
        {state.appointments.map((a) => `${a.id}:${a.title}`).join(', ')}
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

describe('Appointment CRUD & Selection Integration', () => {
  it('creates an appointment, adds one history entry, and displays it on the grid', async () => {
    renderAgenda([]);

    // Check initial state
    expect(screen.getByTestId('past-count').textContent).toBe('0');

    // Click "Novo Compromisso"
    const newBtn = screen.getByRole('button', { name: /Adicionar novo compromisso/i });
    fireEvent.click(newBtn);

    // Form modal should be visible
    expect(screen.getByRole('heading', { name: /Novo Compromisso/i })).toBeInTheDocument();

    // Fill form fields
    const titleInput = screen.getByLabelText(/Título \*/i);
    const profInput = screen.getByLabelText(/Profissional \*/i);
    const dateInput = screen.getByLabelText(/Data \*/i);
    const startInput = screen.getByLabelText(/Início \*/i);
    const endInput = screen.getByLabelText(/Término \*/i);

    fireEvent.change(titleInput, { target: { value: 'Consulta Odonto' } });
    fireEvent.change(profInput, { target: { value: 'Dr. Bento' } });
    fireEvent.change(dateInput, { target: { value: '2024-01-15' } });
    fireEvent.change(startInput, { target: { value: '09:00' } });
    fireEvent.change(endInput, { target: { value: '10:00' } });

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /Criar Compromisso/i });
    fireEvent.click(submitBtn);

    // Verify appointment is rendered on grid
    await waitFor(() => {
      expect(screen.getByText('Consulta Odonto')).toBeInTheDocument();
      expect(screen.getByText('Dr. Bento')).toBeInTheDocument();
    });

    // Exactly one history entry created
    expect(screen.getByTestId('past-count').textContent).toBe('1');
    expect(screen.getByTestId('can-undo').textContent).toBe('true');
  });

  it('rejects submission when end time is before or equal to start time', async () => {
    renderAgenda([]);

    fireEvent.click(screen.getByRole('button', { name: /Adicionar novo compromisso/i }));

    fireEvent.change(screen.getByLabelText(/Título \*/i), {
      target: { value: 'Horário Inválido' },
    });
    fireEvent.change(screen.getByLabelText(/Profissional \*/i), {
      target: { value: 'Dr. Teste' },
    });
    fireEvent.change(screen.getByLabelText(/Início \*/i), {
      target: { value: '11:00' },
    });
    fireEvent.change(screen.getByLabelText(/Término \*/i), {
      target: { value: '10:00' }, // Invalid: end before start
    });

    fireEvent.click(screen.getByRole('button', { name: /Criar Compromisso/i }));
    // Dialog stays open and no history entry is created
    expect(screen.getByRole('heading', { name: /Novo Compromisso/i })).toBeInTheDocument();
    expect(screen.getByTestId('past-count').textContent).toBe('0');
  });

  it('edits an existing appointment with current values prefilled and creates one history entry', async () => {
    const existingApt: Appointment = {
      id: 'apt-to-edit',
      title: 'Título Antigo',
      date: '2024-01-16',
      startTime: '10:00',
      endTime: '11:00',
      professional: 'Dra. Luiza',
      status: 'pending',
    };

    renderAgenda([existingApt]);

    // Select the card on grid
    const card = screen.getByRole('button', { name: /Título Antigo/i });
    fireEvent.click(card);

    expect(screen.getByTestId('selected-id').textContent).toBe('apt-to-edit');

    // Click "Editar" in the header
    const editBtn = screen.getByRole('button', { name: /Editar compromisso Título Antigo/i });
    fireEvent.click(editBtn);

    // Dialog must show "Editar Compromisso" and prefilled values
    expect(screen.getByRole('heading', { name: /Editar Compromisso/i })).toBeInTheDocument();
    const titleInput = screen.getByLabelText(/Título \*/i) as HTMLInputElement;
    expect(titleInput.value).toBe('Título Antigo');

    const profInput = screen.getByLabelText(/Profissional \*/i) as HTMLInputElement;
    expect(profInput.value).toBe('Dra. Luiza');

    // Modify title
    fireEvent.change(titleInput, { target: { value: 'Título Novo Atualizado' } });

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /Salvar Alterações/i }));

    // Verify updated title on grid and in selection banner
    await waitFor(() => {
      const matchingElements = screen.getAllByText('Título Novo Atualizado');
      expect(matchingElements.length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText('Título Antigo')).not.toBeInTheDocument();
    });

    // Exactly one history entry created
    expect(screen.getByTestId('past-count').textContent).toBe('1');
  });

  it('deletes an appointment with confirmation, clears selection, and creates one history entry', async () => {
    const aptToDelete: Appointment = {
      id: 'apt-to-delete',
      title: 'Para Excluir',
      date: '2024-01-17',
      startTime: '14:00',
      endTime: '15:00',
      professional: 'Dr. Pedro',
      status: 'confirmed',
    };

    renderAgenda([aptToDelete]);

    // Select appointment
    fireEvent.click(screen.getByRole('button', { name: /Para Excluir/i }));
    expect(screen.getByTestId('selected-id').textContent).toBe('apt-to-delete');

    // Click "Excluir" in header
    const deleteBtn = screen.getByRole('button', { name: /Excluir compromisso Para Excluir/i });
    fireEvent.click(deleteBtn);

    // Confirmation dialog appears
    expect(
      screen.getByRole('heading', { name: /Excluir Compromisso/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Tem certeza de que deseja excluir o compromisso/i)
    ).toBeInTheDocument();

    // Confirm deletion
    const confirmBtn = screen.getByRole('button', { name: /Confirmar exclusão/i });
    fireEvent.click(confirmBtn);

    // Card should no longer be in the document
    await waitFor(() => {
      expect(screen.queryByText('Para Excluir')).not.toBeInTheDocument();
    });

    // Selection should be cleared
    expect(screen.getByTestId('selected-id').textContent).toBe('none');

    // Exactly one history entry created
    expect(screen.getByTestId('past-count').textContent).toBe('1');
  });

  it('selection and deselection never alter history past/future or undo/redo availability', () => {
    const apt1: Appointment = {
      id: 'apt-select-test',
      title: 'Teste Selecao',
      date: '2024-01-15',
      startTime: '09:00',
      endTime: '10:00',
      professional: 'Dra. Claudia',
      status: 'confirmed',
    };

    renderAgenda([apt1]);

    expect(screen.getByTestId('past-count').textContent).toBe('0');
    expect(screen.getByTestId('future-count').textContent).toBe('0');
    expect(screen.getByTestId('can-undo').textContent).toBe('false');

    // Select appointment
    const card = screen.getByRole('button', { name: /Teste Selecao/i });
    fireEvent.click(card);

    expect(screen.getByTestId('selected-id').textContent).toBe('apt-select-test');
    expect(screen.getByTestId('past-count').textContent).toBe('0'); // Still 0!
    expect(screen.getByTestId('future-count').textContent).toBe('0'); // Still 0!
    expect(screen.getByTestId('can-undo').textContent).toBe('false');

    // Click "Limpar" to deselect
    const clearBtn = screen.getByRole('button', { name: /Desmarcar compromisso selecionado/i });
    fireEvent.click(clearBtn);

    expect(screen.getByTestId('selected-id').textContent).toBe('none');
    expect(screen.getByTestId('past-count').textContent).toBe('0'); // Still 0!
    expect(screen.getByTestId('can-undo').textContent).toBe('false');
  });

  it('automatically advances end time when start time is moved past end time', () => {
    renderAgenda([]);

    fireEvent.click(screen.getByRole('button', { name: /Adicionar novo compromisso/i }));

    const startInput = screen.getByLabelText(/Início \*/i) as HTMLInputElement;
    const endInput = screen.getByLabelText(/Término \*/i) as HTMLInputElement;

    // Initial default: 09:00 to 10:00 (1 hour duration)
    expect(startInput.value).toBe('09:00');
    expect(endInput.value).toBe('10:00');

    // Move start time to 11:00 (past previous 10:00 end time)
    fireEvent.change(startInput, { target: { value: '11:00' } });

    // End time should auto-advance to 12:00 (maintaining 1 hour duration)
    expect(endInput.value).toBe('12:00');
  });

  it('disables submit button and shows live error on both fields when end time is set before start time', () => {
    renderAgenda([]);

    fireEvent.click(screen.getByRole('button', { name: /Adicionar novo compromisso/i }));

    const startInput = screen.getByLabelText(/Início \*/i) as HTMLInputElement;
    const endInput = screen.getByLabelText(/Término \*/i) as HTMLInputElement;
    const submitBtn = screen.getByRole('button', { name: /Criar Compromisso/i }) as HTMLButtonElement;

    // Initially valid and enabled
    expect(submitBtn.disabled).toBe(false);

    // Manually set end time to 08:00 (before 09:00 start time)
    fireEvent.change(endInput, { target: { value: '08:00' } });

    // Submit button should be immediately disabled
    expect(submitBtn.disabled).toBe(true);

    // Both fields should be flagged with aria-invalid
    expect(startInput.getAttribute('aria-invalid')).toBe('true');
    expect(endInput.getAttribute('aria-invalid')).toBe('true');

    // Live error messages in Portuguese should be visible immediately
    expect(
      screen.getByText(/O horário de início deve ser anterior ao horário de término/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/O horário de término deve ser posterior ao horário de início/i)
    ).toBeInTheDocument();

    // Fixing end time restores valid state and re-enables submit button
    fireEvent.change(endInput, { target: { value: '10:30' } });
    expect(submitBtn.disabled).toBe(false);
    expect(startInput.getAttribute('aria-invalid')).toBe('false');
    expect(endInput.getAttribute('aria-invalid')).toBe('false');
  });
});
