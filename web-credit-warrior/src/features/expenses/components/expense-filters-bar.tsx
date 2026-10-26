'use client';

import * as React from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Search, X, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCards } from '@/hooks/queries/use-cards';
import { usePersons } from '@/hooks/queries/use-persons';

export interface ExpenseFiltersBarProps {
  className?: string;
}

/**
 * Mapea los parámetros de búsqueda de la URL a los filtros aceptados por la API:
 * - 'period' se mapea a 'active_in_period'.
 * - 'card_id' y 'person_id' se mantienen.
 * - 'q' se excluye puesto que se evalúa exclusivamente en memoria del cliente.
 */
export function mapSearchParamsToApiFilters(
  searchParams: URLSearchParams | { get: (key: string) => string | null },
) {
  const cardId = searchParams.get('card_id') || undefined;
  const personId = searchParams.get('person_id') || undefined;
  const period = searchParams.get('period') || undefined;

  return {
    card_id: cardId,
    person_id: personId,
    active_in_period: period,
  };
}

/**
 * Barra reactiva de filtros y búsqueda en memoria para la lista de compras.
 * Sincroniza bidireccionalmente los parámetros en la URL con useSearchParams.
 */
export function ExpenseFiltersBar({ className }: ExpenseFiltersBarProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const { data: cards = [] } = useCards();
  const { data: persons = [] } = usePersons();

  const currentCardId = searchParams.get('card_id') ?? '';
  const currentPersonId = searchParams.get('person_id') ?? '';
  const currentPeriod = searchParams.get('period') ?? '';
  const currentQuery = searchParams.get('q') ?? '';

  const hasActiveFilters = Boolean(
    currentCardId || currentPersonId || currentPeriod || currentQuery,
  );

  const handleParamChange = (key: string, value: string) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    if (value.trim()) {
      nextParams.set(key, value.trim());
    } else {
      nextParams.delete(key);
    }
    const queryString = nextParams.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    });
  };

  const handleClearFilters = () => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete('card_id');
    nextParams.delete('person_id');
    nextParams.delete('period');
    nextParams.delete('q');
    const queryString = nextParams.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    });
  };

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-border-subtle bg-surface/80 p-3 sm:p-4 shadow-xs backdrop-blur-xs',
        className,
      )}
    >
      {/* Fila 1: Buscador por texto libre */}
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
        <input
          type="search"
          role="searchbox"
          aria-label="Buscar compras"
          value={currentQuery}
          onChange={(e) => handleParamChange('q', e.target.value)}
          placeholder="Buscar compras por concepto o notas..."
          className="h-9 w-full rounded-lg border border-border-subtle bg-elevated pl-9 pr-3 text-xs text-text-primary placeholder:text-text-muted focus:border-accent-clp focus:outline-none focus:ring-1 focus:ring-accent-clp transition-colors"
        />
      </div>

      {/* Fila 2: Selectores de tarjeta, participante, período y botón limpiar */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex items-center gap-1.5 text-xs font-medium text-text-muted mr-1 shrink-0 hidden sm:flex">
          <Filter className="h-3.5 w-3.5 text-text-muted/80" />
          <span>Filtros:</span>
        </div>

        {/* Selector de tarjeta */}
        <select
          aria-label="Filtrar por tarjeta"
          value={currentCardId}
          onChange={(e) => handleParamChange('card_id', e.target.value)}
          className="h-9 rounded-lg border border-border-subtle bg-elevated px-2.5 text-xs text-text-primary focus:border-accent-clp focus:outline-none focus:ring-1 focus:ring-accent-clp transition-colors min-w-[150px]"
        >
          <option value="">Todas las tarjetas</option>
          {cards.map((card) => (
            <option key={card.id} value={card.id}>
              {card.name} ({card.currency}) •••• {card.last_four_digits}
            </option>
          ))}
        </select>

        {/* Selector de participante */}
        <select
          aria-label="Filtrar por participante"
          value={currentPersonId}
          onChange={(e) => handleParamChange('person_id', e.target.value)}
          className="h-9 rounded-lg border border-border-subtle bg-elevated px-2.5 text-xs text-text-primary focus:border-accent-clp focus:outline-none focus:ring-1 focus:ring-accent-clp transition-colors min-w-[140px]"
        >
          <option value="">Todos los participantes</option>
          {persons.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </select>

        {/* Selector de período (YYYY-MM) */}
        <div className="flex items-center gap-1">
          <input
            type="month"
            aria-label="Filtrar por período"
            value={currentPeriod}
            onChange={(e) => handleParamChange('period', e.target.value)}
            className="h-9 rounded-lg border border-border-subtle bg-elevated px-2.5 text-xs text-text-primary focus:border-accent-clp focus:outline-none focus:ring-1 focus:ring-accent-clp transition-colors"
          />
        </div>

        {/* Botón "Limpiar filtros" condicional */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClearFilters}
            aria-label="Limpiar filtros"
            className="inline-flex items-center gap-1 rounded-lg border border-border-subtle bg-elevated/70 px-2.5 py-1.5 text-xs font-medium text-text-muted hover:text-text-primary hover:border-border-subtle/80 hover:bg-elevated transition-colors ml-auto"
          >
            <X className="h-3.5 w-3.5" />
            <span>Limpiar filtros</span>
          </button>
        )}
      </div>
    </div>
  );
}
