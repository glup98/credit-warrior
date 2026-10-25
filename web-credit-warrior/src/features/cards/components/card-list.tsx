'use client';

import * as React from 'react';
import { CreditCard } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CardItem } from '@/features/cards/components/card-item';
import { EmptyState } from '@/components/shared/empty-state';
import { cn } from '@/lib/utils';
import type { CardRead } from '@/types/api.types';

export type CardStatusFilter = 'active' | 'archived' | 'all';

export interface CardListProps {
  cards: CardRead[];
  statusFilter: CardStatusFilter;
  onStatusFilterChange: (status: CardStatusFilter) => void;
  onEdit: (card: CardRead) => void;
  onDelete: (card: CardRead) => void;
  onManageFees?: (card: CardRead) => void;
  onCreateNew: () => void;
  className?: string;
}

export function CardList({
  cards,
  statusFilter,
  onStatusFilterChange,
  onEdit,
  onDelete,
  onManageFees,
  onCreateNew,
  className,
}: CardListProps) {
  const activeCount = React.useMemo(
    () => cards.filter((c) => c.is_active).length,
    [cards],
  );
  const archivedCount = React.useMemo(
    () => cards.filter((c) => !c.is_active).length,
    [cards],
  );
  const totalCount = cards.length;

  const filteredCards = React.useMemo(() => {
    if (statusFilter === 'active') return cards.filter((c) => c.is_active);
    if (statusFilter === 'archived') return cards.filter((c) => !c.is_active);
    return cards;
  }, [cards, statusFilter]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Pestañas de estado con contadores en memoria */}
      <Tabs
        value={statusFilter}
        onValueChange={(val) => onStatusFilterChange(val as CardStatusFilter)}
      >
        <TabsList aria-label="Filtro de estado de tarjetas">
          <TabsTrigger value="active">Activas ({activeCount})</TabsTrigger>
          <TabsTrigger value="archived">Archivadas ({archivedCount})</TabsTrigger>
          <TabsTrigger value="all">Todas ({totalCount})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Grid de tarjetas o Estado Vacío */}
      {filteredCards.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCards.map((card) => (
            <CardItem
              key={card.id}
              card={card}
              onEdit={onEdit}
              onDelete={onDelete}
              onManageFees={onManageFees}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border-subtle bg-surface/40 p-6">
          {statusFilter === 'active' && (
            <EmptyState
              icon={CreditCard}
              title="Sin tarjetas activas"
              description="No tienes tarjetas activas disponibles para registrar compras."
              actionLabel="Crear Tarjeta"
              onAction={onCreateNew}
            />
          )}
          {statusFilter === 'archived' && (
            <EmptyState
              icon={CreditCard}
              title="Sin tarjetas archivadas"
              description="Las tarjetas archivadas que ya no uses aparecerán aquí."
            />
          )}
          {statusFilter === 'all' && (
            <EmptyState
              icon={CreditCard}
              title="No tienes tarjetas registradas"
              description="Comienza registrando tu primera tarjeta de crédito."
              actionLabel="Crear Tarjeta"
              onAction={onCreateNew}
            />
          )}
        </div>
      )}
    </div>
  );
}
