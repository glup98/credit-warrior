'use client';

import * as React from 'react';
import { Receipt, CalendarRange, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CurrencyBadge } from '@/components/shared/currency-badge';
import { ExpenseScheduleDrawer } from '@/features/expenses/components/expense-schedule-drawer';
import { formatCurrency, formatDate, formatMaskedCard } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type {
  ActiveInstallmentItem,
  CardRead,
  PersonRead,
} from '@/types/api.types';

export interface ActiveInstallmentsSectionProps {
  activeInstallments: ActiveInstallmentItem[];
  cardsMap?: Map<string, CardRead>;
  personsMap?: Map<string, PersonRead>;
  currentPeriod: string;
  className?: string;
}

const FALLBACK_PERSON_COLOR = '#8A93A6';

/**
 * Sección que lista las compras puntuales y en cuotas que impactan el mes seleccionado.
 * Ofrece acceso rápido al cronograma de amortización oficial del backend mediante
 * el modal adaptativo ExpenseScheduleDrawer.
 */
export function ActiveInstallmentsSection({
  activeInstallments,
  cardsMap,
  personsMap,
  currentPeriod,
  className,
}: ActiveInstallmentsSectionProps) {
  const [selectedExpenseId, setSelectedExpenseId] = React.useState<string | null>(null);

  if (!activeInstallments || activeInstallments.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center p-6 sm:p-8 rounded-xl bg-surface border border-border-subtle text-center',
          className,
        )}
      >
        <div className="w-10 h-10 rounded-full bg-elevated flex items-center justify-center text-text-muted mb-2.5">
          <Receipt className="w-5 h-5" />
        </div>
        <h3 className="text-sm sm:text-base font-semibold text-text-primary">
          No hay cuotas activas este mes
        </h3>
        <p className="text-xs sm:text-sm text-text-muted mt-1 max-w-sm">
          No se registran compras ni cuotas pendientes para el período seleccionado.
        </p>
      </div>
    );
  }

  return (
    <section className={cn('flex flex-col gap-2.5', className)}>
      <div className="flex items-center gap-2 px-1">
        <Receipt className="w-4 h-4 text-text-muted" />
        <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-text-muted">
          Cuotas activas del período
        </h2>
      </div>

      <div className="flex flex-col gap-2.5">
        {activeInstallments.map((item) => {
          const card = cardsMap?.get(item.card_id);
          const maskedCard = card?.last_four_digits
            ? formatMaskedCard(card.last_four_digits)
            : null;

          const formattedAmount = formatCurrency(item.installment_amount, item.currency);
          const formattedDate = formatDate(item.purchase_date);

          return (
            <div
              key={`${item.expense_id}-${item.installment_number}`}
              className="flex flex-col gap-3 p-3.5 sm:p-4 rounded-xl bg-surface border border-border-subtle shadow-xs hover:border-border-subtle/80 transition-colors"
            >
              {/* Fila superior: Concepto, tarjeta y badges */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm sm:text-base font-semibold text-text-primary break-words">
                      {item.description}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium border border-border-subtle bg-elevated text-text-secondary shrink-0">
                      {item.installment_label}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-text-muted flex-wrap">
                    <CreditCard className="w-3.5 h-3.5 shrink-0" />
                    <span>{item.card_name}</span>
                    {maskedCard && (
                      <span className="font-mono text-xs text-text-muted">
                        {maskedCard}
                      </span>
                    )}
                    <span>•</span>
                    <span>{formattedDate}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                  <CurrencyBadge currency={item.currency} />
                  <span className="text-base sm:text-lg font-mono tabular-nums font-bold text-text-primary">
                    {formattedAmount}
                  </span>
                </div>
              </div>

              {/* Fila inferior: Desglose por persona y botón Ver cronograma */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2.5 border-t border-border-subtle/40">
                {/* Chips de participantes */}
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  {item.person_shares.map((share) => {
                    const person = personsMap?.get(share.person_id);
                    const colorHex = person?.color_hex?.trim()
                      ? person.color_hex
                      : FALLBACK_PERSON_COLOR;

                    return (
                      <div
                        key={share.person_id}
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-border-subtle/60 bg-elevated/50 text-xs"
                      >
                        <span
                          style={{ backgroundColor: colorHex }}
                          className="w-2 h-2 rounded-full shrink-0"
                          aria-hidden="true"
                        />
                        <span className="font-medium text-text-primary truncate max-w-[100px]">
                          {share.person_name}
                        </span>
                        <span className="font-mono tabular-nums text-text-muted font-medium">
                          {formatCurrency(share.amount, item.currency)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Botón Ver cronograma accesible e independiente */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedExpenseId(item.expense_id)}
                  aria-label={`Ver cronograma de amortización de ${item.description}`}
                  className="h-10 sm:h-8 px-3 gap-1.5 text-xs text-text-primary border-border-subtle hover:bg-elevated hover:border-accent-usd/40 transition-colors w-full sm:w-auto shrink-0"
                >
                  <CalendarRange className="w-3.5 h-3.5 text-accent-usd" />
                  <span>Ver cronograma</span>
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Drawer adaptativo reutilizado */}
      <ExpenseScheduleDrawer
        expenseId={selectedExpenseId}
        open={Boolean(selectedExpenseId)}
        onOpenChange={(open) => {
          if (!open) setSelectedExpenseId(null);
        }}
        activePeriod={currentPeriod}
      />
    </section>
  );
}
