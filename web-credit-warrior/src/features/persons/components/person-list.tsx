'use client';

import * as React from 'react';
import { Users } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PersonItem } from '@/features/persons/components/person-item';
import { EmptyState } from '@/components/shared/empty-state';
import { cn } from '@/lib/utils';
import type { PersonRead } from '@/types/api.types';

export type PersonStatusFilter = 'active' | 'archived' | 'all';

export interface PersonListProps {
  persons: PersonRead[];
  statusFilter: PersonStatusFilter;
  onStatusFilterChange: (status: PersonStatusFilter) => void;
  onEdit: (person: PersonRead) => void;
  onDelete: (person: PersonRead) => void;
  onCreateNew: () => void;
  className?: string;
}

export function PersonList({
  persons,
  statusFilter,
  onStatusFilterChange,
  onEdit,
  onDelete,
  onCreateNew,
  className,
}: PersonListProps) {
  const activeCount = React.useMemo(
    () => persons.filter((p) => p.is_active).length,
    [persons],
  );
  const archivedCount = React.useMemo(
    () => persons.filter((p) => !p.is_active).length,
    [persons],
  );
  const totalCount = persons.length;

  const filteredPersons = React.useMemo(() => {
    if (statusFilter === 'active') return persons.filter((p) => p.is_active);
    if (statusFilter === 'archived') return persons.filter((p) => !p.is_active);
    return persons;
  }, [persons, statusFilter]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Pestañas de estado con contadores en memoria */}
      <Tabs
        value={statusFilter}
        onValueChange={(val) => onStatusFilterChange(val as PersonStatusFilter)}
      >
        <TabsList aria-label="Filtro de estado de participantes">
          <TabsTrigger value="active">Activas ({activeCount})</TabsTrigger>
          <TabsTrigger value="archived">Archivadas ({archivedCount})</TabsTrigger>
          <TabsTrigger value="all">Todas ({totalCount})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Grid de personas o Estado Vacío */}
      {filteredPersons.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPersons.map((person) => (
            <PersonItem
              key={person.id}
              person={person}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border-subtle bg-surface/40 p-6">
          {statusFilter === 'active' && (
            <EmptyState
              icon={Users}
              title="Sin participantes activos"
              description="No tienes participantes activos disponibles para asociar compras."
              actionLabel="Crear Participante"
              onAction={onCreateNew}
            />
          )}
          {statusFilter === 'archived' && (
            <EmptyState
              icon={Users}
              title="Sin participantes archivados"
              description="Los participantes archivados aparecerán aquí."
            />
          )}
          {statusFilter === 'all' && (
            <EmptyState
              icon={Users}
              title="No tienes participantes registrados"
              description="Comienza registrando tu primer participante para compartir gastos."
              actionLabel="Crear Participante"
              onAction={onCreateNew}
            />
          )}
        </div>
      )}
    </div>
  );
}
