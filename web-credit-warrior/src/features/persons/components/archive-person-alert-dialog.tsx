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
import { useUpdatePerson } from '@/hooks/queries/use-persons';
import type { PersonRead } from '@/types/api.types';

export interface ArchivePersonAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  person: PersonRead | null;
  onSuccess?: (person: PersonRead) => void;
}

/**
 * Diálogo de recuperación inteligente que se despliega ante error 409 Conflict (gastos asociados),
 * ofreciendo archivar a la persona para preservar la integridad del historial de repartos.
 */
export function ArchivePersonAlertDialog({
  open,
  onOpenChange,
  person,
  onSuccess,
}: ArchivePersonAlertDialogProps) {
  const updatePersonMutation = useUpdatePerson();
  const isPending = updatePersonMutation.isPending;

  if (!person) return null;

  const handleArchive = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const updatedPerson = await updatePersonMutation.mutateAsync({
        id: person.id,
        data: { is_active: false },
      });
      toast.success('Persona archivada exitosamente');
      onSuccess?.(updatedPerson);
      onOpenChange(false);
    } catch {
      toast.error('No se pudo archivar a la persona. Intenta nuevamente.');
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-text-primary">
            <Archive className="h-5 w-5 text-accent-usd" />
            Esta persona tiene gastos asociados
          </AlertDialogTitle>
          <AlertDialogDescription className="text-text-muted">
            La persona{' '}
            <span className="font-semibold text-text-primary">&quot;{person.name}&quot;</span>{' '}
            no se puede eliminar definitivamente para preservar la integridad de los repartos e historial
            de gastos. Al archivarla, no estará disponible para asociar nuevas compras,
            pero mantendrás intactos todos los repartos históricos en los que participa.
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
              'Archivar persona'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
