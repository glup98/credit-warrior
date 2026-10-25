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
import type { CardRead } from '@/types/api.types';

export interface DeleteCardConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: CardRead | null;
  onConfirm: (card: CardRead) => void | Promise<void>;
  isDeleting?: boolean;
}

/**
 * Diálogo de confirmación previa antes de intentar la eliminación física de una tarjeta.
 */
export function DeleteCardConfirmDialog({
  open,
  onOpenChange,
  card,
  onConfirm,
  isDeleting = false,
}: DeleteCardConfirmDialogProps) {
  if (!card) return null;

  const handleConfirm = async (e: React.MouseEvent) => {
    e.preventDefault();
    await onConfirm(card);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar tarjeta?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción eliminará definitivamente la tarjeta{' '}
            <span className="font-semibold text-text-primary">&quot;{card.name}&quot;</span>. Si la
            tarjeta tiene compras asociadas, el servidor impedirá la eliminación directa para
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
