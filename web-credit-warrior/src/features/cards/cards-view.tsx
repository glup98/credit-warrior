'use client';

import * as React from 'react';
import { Plus, CreditCard, AlertCircle, RefreshCw } from 'lucide-react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { useCards, useDeleteCard } from '@/hooks/queries/use-cards';
import { CardList, type CardStatusFilter } from '@/features/cards/components/card-list';
import { CardFormDialog } from '@/features/cards/components/card-form-dialog';
import { DeleteCardConfirmDialog } from '@/features/cards/components/delete-card-confirm-dialog';
import { ArchiveCardAlertDialog } from '@/features/cards/components/archive-card-alert-dialog';
import { CardFeesDialog } from '@/features/cards/components/card-fees-dialog';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/services/api-client';
import type { CardRead } from '@/types/api.types';

export function CardsView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const { data: cards = [], isLoading, isError, refetch } = useCards();
  const deleteCardMutation = useDeleteCard();

  // Estados locales para la orquestación de modales
  const [isFormOpen, setIsFormOpen] = React.useState<boolean>(false);
  const [editingCard, setEditingCard] = React.useState<CardRead | null>(null);
  const [deletingCard, setDeletingCard] = React.useState<CardRead | null>(null);
  const [conflictCard, setConflictCard] = React.useState<CardRead | null>(null);
  const [feeCardTarget, setFeeCardTarget] = React.useState<CardRead | null>(null);

  // Sincronización en URL Search Params
  const rawStatus = searchParams.get('status');
  const currentStatus: CardStatusFilter =
    rawStatus === 'archived' || rawStatus === 'all' ? rawStatus : 'active';

  const handleStatusFilterChange = (nextStatus: CardStatusFilter) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('status', nextStatus);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleCreateNew = () => {
    setEditingCard(null);
    setIsFormOpen(true);
  };

  const handleEdit = (card: CardRead) => {
    setEditingCard(card);
    setIsFormOpen(true);
  };

  const handleDelete = (card: CardRead) => {
    setDeletingCard(card);
  };

  const handleConfirmDelete = async (card: CardRead) => {
    try {
      await deleteCardMutation.mutateAsync(card.id);
      toast.success('Tarjeta eliminada exitosamente');
      setDeletingCard(null);
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 409) {
        // Conflicto por compras asociadas: cerramos confirmación y abrimos diálogo de archivado inteligente
        setDeletingCard(null);
        setConflictCard(card);
      } else if (error instanceof ApiError && error.status === 404) {
        toast.error('El registro ya no existe');
        setDeletingCard(null);
      } else {
        toast.error('No se pudo eliminar la tarjeta');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabecera de la vista */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary sm:text-2xl">
            Tarjetas de Crédito
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            Administración de tarjetas activas, períodos de facturación y divisas.
          </p>
        </div>

        <Button
          onClick={handleCreateNew}
          className="inline-flex items-center gap-2 bg-accent-clp text-canvas hover:bg-accent-clp/90 font-medium shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Nueva tarjeta
        </Button>
      </div>

      {/* Contenido principal con estados de carga y error */}
      {isLoading ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-border-subtle bg-surface/30 p-8 text-center animate-pulse">
          <CreditCard className="h-10 w-10 text-text-muted/40 mb-3" />
          <p className="text-sm text-text-muted">Cargando tarjetas de crédito...</p>
        </div>
      ) : isError ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-accent-danger/30 bg-surface/40 p-8 text-center">
          <AlertCircle className="h-10 w-10 text-accent-danger mb-3" />
          <h3 className="text-base font-semibold text-text-primary">
            Error al sincronizar tarjetas
          </h3>
          <p className="mt-1 text-sm text-text-muted max-w-md">
            No pudimos obtener la lista de tarjetas desde el servidor. Comprueba tu conexión.
          </p>
          <Button
            variant="outline"
            onClick={() => refetch()}
            className="mt-4 gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </Button>
        </div>
      ) : (
        <CardList
          cards={cards}
          statusFilter={currentStatus}
          onStatusFilterChange={handleStatusFilterChange}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onManageFees={(card) => setFeeCardTarget(card)}
          onCreateNew={handleCreateNew}
        />
      )}

      {/* Modales y Diálogos */}
      <CardFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        card={editingCard}
      />

      <CardFeesDialog
        open={Boolean(feeCardTarget)}
        onOpenChange={(open) => !open && setFeeCardTarget(null)}
        card={feeCardTarget}
      />

      <DeleteCardConfirmDialog
        open={Boolean(deletingCard)}
        onOpenChange={(open) => !open && setDeletingCard(null)}
        card={deletingCard}
        onConfirm={handleConfirmDelete}
        isDeleting={deleteCardMutation.isPending}
      />

      <ArchiveCardAlertDialog
        open={Boolean(conflictCard)}
        onOpenChange={(open) => !open && setConflictCard(null)}
        card={conflictCard}
      />
    </div>
  );
}
