'use client';

import * as React from 'react';
import {
  MoreVertical,
  Pencil,
  Trash2,
  Calendar,
  CalendarRange,
  CreditCard,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  formatDate,
  formatCurrency,
  formatMaskedCard,
  formatPeriod,
} from '@/lib/formatters';
import { CurrencyBadge } from '@/components/shared/currency-badge';
import { PersonChip } from '@/components/shared/person-chip';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import type { ExpenseRead, CardRead, PersonRead } from '@/types/api.types';

export interface ExpenseCardProps {
  expense: ExpenseRead;
  card?: CardRead;
  persons?: PersonRead[];
  onViewSchedule?: (expense: ExpenseRead) => void;
  onEdit?: (expense: ExpenseRead) => void;
  onDelete?: (expense: ExpenseRead) => void;
  className?: string;
}

/**
 * Ficha semántica individual de gasto (<article>) con formateo determinista,
 * números tabulares y controles accesibles sin anidamientos.
 */
export function ExpenseCard({
  expense,
  card,
  persons = [],
  onViewSchedule,
  onEdit,
  onDelete,
  className,
}: ExpenseCardProps) {
  const currency = card?.currency ?? 'CLP';
  const maskedCard = formatMaskedCard(card?.last_four_digits);
  const formattedDate = formatDate(expense.purchase_date);
  const formattedAmount = formatCurrency(expense.total_amount, currency);

  const personsMap = React.useMemo(() => {
    return new Map(persons.map((p) => [p.id, p]));
  }, [persons]);

  const installmentsLabel =
    expense.installments_count === 1
      ? '1 cuota'
      : `${expense.installments_count} cuotas`;

  return (
    <article
      aria-labelledby={`expense-title-${expense.id}`}
      className={cn(
        'group relative flex flex-col justify-between gap-3.5 rounded-xl border border-border-subtle bg-surface p-4 sm:p-5 shadow-xs transition-all hover:border-border-subtle/80 hover:bg-surface/90',
        className,
      )}
    >
      {/* 1. Cabecera: Título del comercio, tarjeta, divisa y menú contextual */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3
              id={`expense-title-${expense.id}`}
              className="truncate text-base font-semibold text-text-primary"
            >
              {expense.description}
            </h3>
            <CurrencyBadge currency={currency} />
          </div>

          {/* Tarjeta y máscara */}
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <CreditCard className="h-3.5 w-3.5 shrink-0 opacity-70" />
            <span className="font-medium truncate max-w-[160px]">
              {card?.name ?? 'Tarjeta'}
            </span>
            {maskedCard && (
              <span className="font-mono text-[11px] text-text-muted/80">
                {maskedCard}
              </span>
            )}
          </div>
        </div>

        {/* Menú de opciones (Editar / Eliminar) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-elevated hover:text-text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-clp"
              aria-label={`Acciones para ${expense.description}`}
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit?.(expense)}>
              <Pencil className="mr-2 h-4 w-4" />
              <span>Editar</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete?.(expense)}
              className="text-accent-danger hover:text-accent-danger focus:text-accent-danger"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              <span>Eliminar</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 2. Opciones avanzadas: Badges de first_billing_override y notas si existen */}
      {(expense.first_billing_override || expense.notes) && (
        <div className="space-y-1.5 pt-0.5">
          {expense.first_billing_override && (
            <div className="inline-flex items-center gap-1.5 rounded-md border border-accent-clp/30 bg-accent-clp/10 px-2 py-0.5 text-[11px] font-medium text-accent-clp">
              <Calendar className="h-3 w-3 shrink-0" />
              <span>
                1ra facturación:{' '}
                {formatPeriod(expense.first_billing_override, 'short')}
              </span>
            </div>
          )}

          {expense.notes && (
            <p className="flex items-start gap-1.5 text-xs text-text-muted/90 bg-elevated/40 border border-border-subtle/40 rounded-md p-2">
              <FileText className="h-3.5 w-3.5 shrink-0 mt-0.5 text-text-muted" />
              <span className="truncate">{expense.notes}</span>
            </p>
          )}
        </div>
      )}

      {/* 3. Chips de participantes */}
      {expense.splits.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {expense.splits.map((split) => {
            const person = personsMap.get(split.person_id);
            return (
              <PersonChip
                key={split.person_id}
                name={person?.name ?? 'Participante'}
                colorHex={person?.color_hex}
                size="sm"
              />
            );
          })}
        </div>
      )}

      {/* 4. Pie de la tarjeta: Fecha, Cuotas, Monto y Acción "Ver cronograma" */}
      <div className="flex items-end justify-between gap-3 border-t border-border-subtle/50 pt-3 mt-1 flex-wrap sm:flex-nowrap">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span>{formattedDate}</span>
            <span>•</span>
            <span className="font-medium text-text-primary/90">
              {installmentsLabel}
            </span>
          </div>
          <div className="font-mono text-lg font-bold text-text-primary tracking-tight tabular-nums">
            {formattedAmount}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onViewSchedule?.(expense)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-elevated/60 px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-elevated hover:border-border-subtle/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-clp ml-auto shrink-0"
        >
          <CalendarRange className="h-3.5 w-3.5 text-text-muted" />
          <span>Ver cronograma</span>
        </button>
      </div>
    </article>
  );
}
