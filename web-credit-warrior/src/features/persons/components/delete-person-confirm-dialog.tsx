'use client';

import * as React from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';
import type { PersonRead } from '@/types/api.types';

export interface DeletePersonConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  person: PersonRead | null;
  onConfirm: (person: PersonRead) => void | Promise<void>;
  isDeleting?: boolean;
}

/**
 * Diálogo de confirmación previa antes de intentar la eliminación física de una persona.
 */
export function DeletePersonConfirmDialog({
  open,
  onOpenChange,
  person,
  onConfirm,
  isDeleting = false,
}: DeletePersonConfirmDialogProps) {
  if (!person) return null;

  const handleConfirm = async (e: React.MouseEvent) => {
    e.preventDefault();
    await onConfirm(person);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar persona?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción eliminará definitivamente a la persona{' '}
            <span className="font-semibold text-text-primary">&quot;{person.name}&quot;</span>. Si la
            persona tiene gastos asociados, el servidor impedirá la eliminación directa para
            preservar la integridad histórica.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isDeleting}
            onClick={handleConfirm}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Eliminando...
              </>
            ) : (
              'Eliminar definitivamente'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
