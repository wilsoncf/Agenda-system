'use client';

/**
 * DeleteConfirmDialog — Confirmation modal before deleting an appointment.
 */

import React from 'react';
import type { Appointment } from '@/domain/appointment';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type DeleteConfirmDialogProps = {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly appointment: Appointment | null;
  readonly onConfirm: (id: string) => void;
};

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  appointment,
  onConfirm,
}: DeleteConfirmDialogProps) {
  if (!appointment) return null;

  const handleConfirm = () => {
    onConfirm(appointment.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Excluir Compromisso</DialogTitle>
          <DialogDescription>
            Tem certeza de que deseja excluir o compromisso{' '}
            <strong className="text-foreground">&ldquo;{appointment.title}&rdquo;</strong>?
            Esta ação pode ser revertida pelo histórico.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            aria-label="Confirmar exclusão"
          >
            Excluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
