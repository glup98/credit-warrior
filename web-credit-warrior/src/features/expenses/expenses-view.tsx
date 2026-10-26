'use client';

import * as React from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useExpenses } from '@/hooks/queries/use-expenses';
import { useCards } from '@/hooks/queries/use-cards';
import { usePersons } from '@/hooks/queries/use-persons';
import { ExpenseFiltersBar, mapSearchParamsToApiFilters } from './components/expense-filters-bar';
import { ExpenseList } from './components/expense-list';
import { ExpenseScheduleDrawer } from './components/expense-schedule-drawer';
import { ExpenseEditDialog } from './components/expense-edit-dialog';
import { ExpenseDeleteDialog } from './components/expense-delete-dialog';
import { Button } from '@/components/ui/button';
import type { ExpenseRead } from '@/types/api.types';

export interface ExpensesViewProps {
  className?: string;
}

/**
 * Normaliza una cadena de texto a minúsculas y elimina marcas diacríticas/acentos
 * para comparaciones de búsqueda flexibles e insensibles.
 */
function normalizeSearchText(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Coordinador principal de la vista de Compras y Cuotas (/expenses) (Spec 005 T8).
 * - Sincroniza filtros de URL con useSearchParams (card_id, person_id, period, q).
 * - Despacha peticiones al backend mapeando period -> active_in_period y excluyendo q.
 * - Aplica filtrado en memoria sobre 'q' insensible a acentos y mayúsculas.
 * - Orquesta los modales secundarios: cronograma (ExpenseScheduleDrawer), edición (ExpenseEditDialog)
 *   y confirmación destructiva (ExpenseDeleteDialog).
 */
export function ExpensesView({ className }: ExpensesViewProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // 1. Mapeo de parámetros para la consulta remota
  const apiFilters = React.useMemo(() => {
    return mapSearchParamsToApiFilters(searchParams);
  }, [searchParams]);

  const rawPeriod = searchParams.get('period') ?? undefined;
  const rawQuery = searchParams.get('q') ?? '';

  // 2. Carga de datos remotos
  const {
    data: expenses = [],
    isLoading: isExpensesLoading,
    isError: isExpensesError,
    refetch,
  } = useExpenses(apiFilters);

  const { data: cards = [], isLoading: isCardsLoading } = useCards();
  const { data: persons = [], isLoading: isPersonsLoading } = usePersons();

  // 3. Filtrado en memoria para el parámetro de búsqueda 'q'
  const filteredExpenses = React.useMemo(() => {
    const trimmedQuery = rawQuery.trim();
    if (!trimmedQuery) {
      return expenses;
    }
    const normalizedQuery = normalizeSearchText(trimmedQuery);
    return expenses.filter((item) =>
      normalizeSearchText(item.description).includes(normalizedQuery),
    );
  }, [expenses, rawQuery]);

  // 4. Indicador de filtros activos
  const hasActiveFilters = Boolean(
    apiFilters.card_id ||
      apiFilters.person_id ||
      apiFilters.active_in_period ||
      rawQuery.trim(),
  );

  // 5. Estado local de modales
  const [selectedScheduleExpense, setSelectedScheduleExpense] =
    React.useState<ExpenseRead | null>(null);
  const [editingExpense, setEditingExpense] = React.useState<ExpenseRead | null>(null);
  const [deletingExpense, setDeletingExpense] = React.useState<ExpenseRead | null>(null);

  // 6. Acción para limpiar filtros
  const handleClearFilters = React.useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [router, pathname]);

  const isLoading = isExpensesLoading || isCardsLoading || isPersonsLoading;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Barra superior de filtros reactivos */}
      <ExpenseFiltersBar />

      {/* Manejo de error de red */}
      {isExpensesError ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-6 text-center space-y-3"
        >
          <div className="flex justify-center text-rose-500">
            <AlertCircle className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-text-primary">
              Error al cargar el historial de compras
            </h3>
            <p className="text-sm text-text-muted">
              No pudimos conectar con el servidor para obtener tus compras. Verifica tu conexión.
            </p>
          </div>
          <div>
            <Button
              type="button"
              variant="outline"
              onClick={() => refetch()}
              className="inline-flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Reintentar</span>
            </Button>
          </div>
        </div>
      ) : (
        /* Lista de compras con soporte para skeletons y estados vacíos */
        <ExpenseList
          expenses={filteredExpenses}
          isLoading={isLoading}
          isFiltered={hasActiveFilters}
          cards={cards}
          persons={persons}
          onViewSchedule={(exp) => setSelectedScheduleExpense(exp)}
          onEdit={(exp) => setEditingExpense(exp)}
          onDelete={(exp) => setDeletingExpense(exp)}
          onClearFilters={handleClearFilters}
        />
      )}

      {/* Modal adaptativo de cronograma oficial */}
      <ExpenseScheduleDrawer
        expenseId={selectedScheduleExpense?.id ?? null}
        open={Boolean(selectedScheduleExpense)}
        onOpenChange={(open) => {
          if (!open) setSelectedScheduleExpense(null);
        }}
        activePeriod={rawPeriod ?? null}
      />

      {/* Modal adaptativo de edición */}
      <ExpenseEditDialog
        expense={editingExpense}
        cards={cards}
        persons={persons}
        open={Boolean(editingExpense)}
        onOpenChange={(open) => {
          if (!open) setEditingExpense(null);
        }}
      />

      {/* Diálogo destructivo de eliminación */}
      <ExpenseDeleteDialog
        expense={deletingExpense}
        open={Boolean(deletingExpense)}
        onOpenChange={(open) => {
          if (!open) setDeletingExpense(null);
        }}
      />
    </div>
  );
}
