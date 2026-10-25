'use client';

import * as React from 'react';
import { Archive, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
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
import { useUpdateCard } from '@/hooks/queries/use-cards';
import type { CardRead } from '@/types/api.types';

export interface ArchiveCardAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: CardRead | null;
  onSuccess?: (card: CardRead) => void;
}

/**
 * Diálogo de recuperación inteligente que se despliega ante error 409 Conflict (compras asociadas),
 * ofreciendo archivar la tarjeta para preservar la integridad del historial financiero.
 */
export function ArchiveCardAlertDialog({
  open,
  onOpenChange,
  card,
  onSuccess,
}: ArchiveCardAlertDialogProps) {
  const updateCardMutation = useUpdateCard();
  const isPending = updateCardMutation.isPending;

  if (!card) return null;

  const handleArchive = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const updatedCard = await updateCardMutation.mutateAsync({
        id: card.id,
        data: { is_active: false },
      });
      toast.success('Tarjeta archivada exitosamente');
      onSuccess?.(updatedCard);
      onOpenChange(false);
    } catch {
      toast.error('No se pudo archivar la tarjeta. Intenta nuevamente.');
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-text-primary">
            <Archive className="h-5 w-5 text-accent-usd" />
            Esta tarjeta tiene compras asociadas
          </AlertDialogTitle>
          <AlertDialogDescription className="text-text-muted">
            La tarjeta{' '}
            <span className="font-semibold text-text-primary">&quot;{card.name}&quot;</span>{' '}
            no se puede eliminar definitivamente para preservar la integridad de tu historial
            financiero. Al archivarla, no estará disponible para registrar nuevas compras,
            pero mantendrás intactos sus desgloses y proyecciones anteriores.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={handleArchive}
            className="bg-accent-clp text-canvas hover:bg-accent-clp/90 font-medium"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Archivando...
              </>
            ) : (
              'Archivar tarjeta'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
