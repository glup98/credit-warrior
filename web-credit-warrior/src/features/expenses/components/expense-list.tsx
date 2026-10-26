'use client';

import * as React from 'react';
import { Receipt, FilterX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/shared/empty-state';
import { ExpenseCard } from './expense-card';
import { useQuickExpense } from '../context/quick-expense-context';
import type { ExpenseRead, CardRead, PersonRead } from '@/types/api.types';

export interface ExpenseListProps {
  expenses: ExpenseRead[];
  isLoading?: boolean;
  isFiltered?: boolean;
  cards?: CardRead[];
  persons?: PersonRead[];
  onViewSchedule?: (expense: ExpenseRead) => void;
  onEdit?: (expense: ExpenseRead) => void;
  onDelete?: (expense: ExpenseRead) => void;
  onClearFilters?: () => void;
  onRegisterExpense?: () => void;
  className?: string;
}

/**
 * Silueta animada (Skeleton) estructurada que replica las proporciones de una ficha ExpenseCard
 * para evitar cambios visuales bruscos (Layout Shifts) durante la carga.
 */
export function ExpenseCardSkeleton() {
  return (
    <div
      data-testid="expense-skeleton"
      className="animate-pulse rounded-xl border border-border-subtle bg-surface p-4 space-y-3"
      role="status"
      aria-label="Cargando compra"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5 flex-1">
          <div className="h-5 w-40 sm:w-56 rounded bg-elevated" />
          <div className="h-3 w-28 rounded bg-elevated/80" />
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="h-6 w-24 rounded bg-elevated" />
          <div className="h-3.5 w-14 rounded bg-elevated/70" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-border-subtle/40">
        <div className="h-4 w-28 rounded bg-elevated/80" />
        <div className="h-4 w-24 rounded bg-elevated/80" />
        <div className="h-4 w-20 rounded bg-elevated/80" />
      </div>

      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1.5">
          <div className="h-5 w-16 rounded-full bg-elevated" />
          <div className="h-5 w-20 rounded-full bg-elevated" />
        </div>
        <div className="h-8 w-28 rounded-lg bg-elevated" />
      </div>
    </div>
  );
}

/**
 * Hook seguro para consumir useQuickExpense cuando esté disponible en el árbol,
 * evitando excepciones si el componente se monta fuera de un QuickExpenseProvider.
 */
function useOptionalQuickExpense() {
  try {
    return useQuickExpense();
  } catch {
    return null;
  }
}

/**
 * Contenedor visual de lista de compras con manejo de estados de carga, vacío global y vacío por filtros (Spec 005 T7).
 * - Skeletons estructurados durante la carga (isLoading).
 * - Estado vacío global con CTA "Registrar gasto" conectado al QuickExpenseContext o prop onRegisterExpense.
 * - Estado vacío por filtros con acción "Limpiar filtros".
 * - Renderizado accesible de fichas ExpenseCard delegando acciones de cronograma, edición y eliminación.
 */
export function ExpenseList({
  expenses,
  isLoading = false,
  isFiltered = false,
  cards = [],
  persons = [],
  onViewSchedule,
  onEdit,
  onDelete,
  onClearFilters,
  onRegisterExpense,
  className,
}: ExpenseListProps) {
  const quickExpense = useOptionalQuickExpense();

  const handleRegisterExpense = React.useCallback(() => {
    if (onRegisterExpense) {
      onRegisterExpense();
    } else if (quickExpense) {
      quickExpense.open();
    }
  }, [onRegisterExpense, quickExpense]);

  // Mapa optimizado para resolución inmediata O(1) de tarjetas por gasto
  const cardsMap = React.useMemo(() => {
    return new Map(cards.map((c) => [c.id, c]));
  }, [cards]);

  // 1. Estado de carga con siluetas skeleton
  if (isLoading) {
    return (
      <div
        className={cn('space-y-3', className)}
        aria-busy="true"
        aria-label="Cargando historial de compras"
      >
        <ExpenseCardSkeleton />
        <ExpenseCardSkeleton />
        <ExpenseCardSkeleton />
      </div>
    );
  }

  // 2. Estado vacío (sin gastos)
  if (expenses.length === 0) {
    // 2a. Vacío por filtros aplicados
    if (isFiltered) {
      return (
        <EmptyState
          icon={FilterX}
          title="No se encontraron compras"
          description="No hay compras que coincidan con los filtros aplicados o tu término de búsqueda. Intenta ajustar los criterios."
          actionLabel="Limpiar filtros"
          onAction={onClearFilters}
          className={className}
        />
      );
    }

    // 2b. Vacío global inicial
    return (
      <EmptyState
        icon={Receipt}
        title="No hay compras registradas"
        description="Comienza registrando tu primera compra con tarjeta de crédito para proyectar tus cuotas y presupuestos mensuales."
        actionLabel="Registrar gasto"
        onAction={handleRegisterExpense}
        className={className}
      />
    );
  }

  // 3. Lista con compras activas
  return (
    <div
      role="feed"
      aria-label="Historial de compras"
      className={cn('space-y-3', className)}
    >
      {expenses.map((expense) => {
        const card = cardsMap.get(expense.card_id);
        return (
          <ExpenseCard
            key={expense.id}
            expense={expense}
            card={card}
            persons={persons}
            onViewSchedule={onViewSchedule}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        );
      })}
    </div>
  );
}
