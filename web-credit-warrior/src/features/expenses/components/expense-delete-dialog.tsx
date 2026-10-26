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
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useDeleteExpense } from '@/hooks/queries/use-expenses';
import { queryKeys } from '@/lib/query-keys';
import { ApiError } from '@/services/api-client';
import type { ExpenseRead } from '@/types/api.types';

export interface ExpenseDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: ExpenseRead | null;
  onSuccess?: () => void;
}

/**
 * Diálogo modal de confirmación destructiva para eliminar permanentemente una compra.
 * Maneja bloqueo anti double-submit, estado isPending, y tolerancia a 404 por concurrencia.
 */
export function ExpenseDeleteDialog({
  open,
  onOpenChange,
  expense,
  onSuccess,
}: ExpenseDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const deleteExpenseMutation = useDeleteExpense();
  const queryClient = useQueryClient();

  if (!expense) return null;

  const handleConfirm = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isDeleting) return;

    setIsDeleting(true);
    try {
      await deleteExpenseMutation.mutateAsync(expense.id);
      toast.success('Compra eliminada exitosamente');
      onSuccess?.();
      onOpenChange(false);
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 404) {
        toast.info('La compra seleccionada ya no existe');
        queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
        onSuccess?.();
        onOpenChange(false);
      } else {
        toast.error('No se pudo eliminar la compra');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar esta compra?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción eliminará permanentemente la compra{' '}
            <span className="font-semibold text-text-primary">
              &quot;{expense.description}&quot;
            </span>{' '}
            y su cronograma de cuotas asociado. Esta operación no se puede deshacer.
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
                <span>Eliminando...</span>
              </>
            ) : (
              'Eliminar compra'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
