'use client';

import * as React from 'react';
import { Plus, Users, AlertCircle, RefreshCw } from 'lucide-react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { usePersons, useDeletePerson } from '@/hooks/queries/use-persons';
import { PersonList, type PersonStatusFilter } from '@/features/persons/components/person-list';
import { PersonFormDialog } from '@/features/persons/components/person-form-dialog';
import { DeletePersonConfirmDialog } from '@/features/persons/components/delete-person-confirm-dialog';
import { ArchivePersonAlertDialog } from '@/features/persons/components/archive-person-alert-dialog';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/services/api-client';
import type { PersonRead } from '@/types/api.types';

export function PersonsView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const { data: persons = [], isLoading, isError, refetch } = usePersons();
  const deletePersonMutation = useDeletePerson();

  // Estados locales para la orquestación de modales
  const [isFormOpen, setIsFormOpen] = React.useState<boolean>(false);
  const [editingPerson, setEditingPerson] = React.useState<PersonRead | null>(null);
  const [deletingPerson, setDeletingPerson] = React.useState<PersonRead | null>(null);
  const [conflictPerson, setConflictPerson] = React.useState<PersonRead | null>(null);

  // Sincronización en URL Search Params
  const rawStatus = searchParams.get('status');
  const currentStatus: PersonStatusFilter =
    rawStatus === 'archived' || rawStatus === 'all' ? rawStatus : 'active';

  const handleStatusFilterChange = (nextStatus: PersonStatusFilter) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('status', nextStatus);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleCreateNew = () => {
    setEditingPerson(null);
    setIsFormOpen(true);
  };

  const handleEdit = (person: PersonRead) => {
    setEditingPerson(person);
    setIsFormOpen(true);
  };

  const handleDelete = (person: PersonRead) => {
    setDeletingPerson(person);
  };

  const handleConfirmDelete = async (person: PersonRead) => {
    try {
      await deletePersonMutation.mutateAsync(person.id);
      toast.success('Participante eliminado exitosamente');
      setDeletingPerson(null);
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 409) {
        // Conflicto por gastos asociados: cerramos confirmación y abrimos diálogo de archivado inteligente
        setDeletingPerson(null);
        setConflictPerson(person);
      } else if (error instanceof ApiError && error.status === 404) {
        toast.error('El registro ya no existe');
        setDeletingPerson(null);
      } else {
        toast.error('No se pudo eliminar al participante');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabecera de la vista */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary sm:text-2xl">
            Participantes
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            Administración de personas para la asignación y división de gastos compartidos.
          </p>
        </div>

        <Button
          onClick={handleCreateNew}
          className="inline-flex items-center gap-2 bg-accent-clp text-canvas hover:bg-accent-clp/90 font-medium shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Nueva persona
        </Button>
      </div>

      {/* Contenido principal con estados de carga y error */}
      {isLoading ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-border-subtle bg-surface/30 p-8 text-center animate-pulse">
          <Users className="h-10 w-10 text-text-muted/40 mb-3" />
          <p className="text-sm text-text-muted">Cargando participantes...</p>
        </div>
      ) : isError ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-accent-danger/30 bg-surface/40 p-8 text-center">
          <AlertCircle className="h-10 w-10 text-accent-danger mb-3" />
          <h3 className="text-base font-semibold text-text-primary">
            Error al sincronizar participantes
          </h3>
          <p className="mt-1 text-sm text-text-muted max-w-md">
            No pudimos obtener la lista de participantes desde el servidor. Comprueba tu conexión.
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
        <PersonList
          persons={persons}
          statusFilter={currentStatus}
          onStatusFilterChange={handleStatusFilterChange}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onCreateNew={handleCreateNew}
        />
      )}

      {/* Modales y Diálogos */}
      <PersonFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        person={editingPerson}
      />

      <DeletePersonConfirmDialog
        open={Boolean(deletingPerson)}
        onOpenChange={(open) => !open && setDeletingPerson(null)}
        person={deletingPerson}
        onConfirm={handleConfirmDelete}
        isDeleting={deletePersonMutation.isPending}
      />

      <ArchivePersonAlertDialog
        open={Boolean(conflictPerson)}
        onOpenChange={(open) => !open && setConflictPerson(null)}
        person={conflictPerson}
      />
    </div>
  );
}
