import * as React from 'react';
import { CreditCard, Calendar, CalendarCheck } from 'lucide-react';
import { CurrencyBadge } from '@/components/shared/currency-badge';
import { formatCurrency, formatDate, formatMaskedCard } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { CardMonthlySummary, CardRead } from '@/types/api.types';

export interface CardBreakdownSectionProps {
  byCard: CardMonthlySummary[];
  cardsMap?: Map<string, CardRead>;
  className?: string;
}

/**
 * Sección que presenta el desglose de cobros mensuales organizados por tarjeta de crédito emisora.
 * Incluye resolución de últimos 4 dígitos enmascarados, estado de archivado,
 * transparencia contable entre compras y mantención, fechas clave del ciclo bancario y desglose por participante.
 */
export function CardBreakdownSection({
  byCard,
  cardsMap,
  className,
}: CardBreakdownSectionProps) {
  if (!byCard || byCard.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center p-6 sm:p-8 rounded-xl bg-surface border border-border-subtle text-center',
          className,
        )}
      >
        <div className="w-10 h-10 rounded-full bg-elevated flex items-center justify-center text-text-muted mb-2.5">
          <CreditCard className="w-5 h-5" />
        </div>
        <h3 className="text-sm sm:text-base font-semibold text-text-primary">
          No hay pagos a tarjetas de crédito
        </h3>
        <p className="text-xs sm:text-sm text-text-muted mt-1 max-w-sm">
          No se registran cobros pendientes para ninguna tarjeta en este período.
        </p>
      </div>
    );
  }

  return (
    <section className={cn('flex flex-col gap-2.5', className)}>
      <div className="flex items-center gap-2 px-1">
        <CreditCard className="w-4 h-4 text-text-muted" />
        <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-text-muted">
          Estado por tarjeta
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
        {byCard.map((cardItem) => {
          const card = cardsMap?.get(cardItem.card_id);
          const maskedCard = card?.last_four_digits
            ? formatMaskedCard(card.last_four_digits)
            : null;
          const isArchived = card ? !card.is_active : false;
          const isClp = cardItem.currency === 'CLP';

          const purchasesTotal = cardItem.purchases_total ?? cardItem.total_due;
          const maintenanceFee = cardItem.maintenance_fee ?? '0';
          const isInactive = purchasesTotal === '0' || Number(purchasesTotal) === 0;

          const formattedTotal = formatCurrency(cardItem.total_due, cardItem.currency);
          const formattedPurchases = formatCurrency(purchasesTotal, cardItem.currency);
          const formattedMaintenance = formatCurrency(maintenanceFee, cardItem.currency);
          const formattedClosing = formatDate(cardItem.closing_date);
          const formattedDue = formatDate(cardItem.due_date);

          return (
            <div
              key={cardItem.card_id}
              className={cn(
                'flex flex-col justify-between p-4 sm:p-5 rounded-xl bg-surface border border-border-subtle shadow-xs transition-all duration-200',
                isClp
                  ? 'border-l-4 border-l-accent-clp hover:border-r-accent-clp/20 hover:border-y-accent-clp/20'
                  : 'border-l-4 border-l-accent-usd hover:border-r-accent-usd/20 hover:border-y-accent-usd/20',
              )}
            >
              {/* Encabezado de la tarjeta */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base font-semibold text-text-primary truncate">
                      {cardItem.card_name}
                    </span>
                    {isArchived && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-border-subtle bg-elevated text-text-muted">
                        Archivada
                      </span>
                    )}
                  </div>
                  {maskedCard && (
                    <span className="font-mono text-xs text-text-muted">
                      {maskedCard}
                    </span>
                  )}
                </div>

                <CurrencyBadge currency={cardItem.currency} />
              </div>

              {/* Total adeudado destacado */}
              <div className="flex flex-col gap-0.5 mb-3">
                <span className="text-xs text-text-muted font-medium">
                  Total a pagar en estado de cuenta
                </span>
                <span className="text-xl sm:text-2xl font-mono tabular-nums font-bold text-text-primary tracking-tight">
                  {formattedTotal}
                </span>
              </div>

              {/* Transparencia Contable: Compras vs Mantención (RF-05, RF-06) */}
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-elevated/40 border border-border-subtle/50 text-xs mb-3">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[11px] text-text-muted truncate">
                    Compras del mes
                  </span>
                  <span className="font-mono tabular-nums font-semibold text-text-primary truncate">
                    {formattedPurchases}
                  </span>
                </div>

                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[11px] text-text-muted truncate">
                    Mantención mensual
                  </span>
                  <div className="flex flex-col sm:flex-row sm:items-baseline gap-1">
                    <span
                      className={cn(
                        'font-mono tabular-nums font-semibold truncate',
                        isInactive || maintenanceFee === '0'
                          ? 'text-text-muted'
                          : 'text-text-primary',
                      )}
                    >
                      {formattedMaintenance}
                    </span>
                    {isInactive && (
                      <span className="text-[10px] text-accent-clp font-medium truncate">
                        Sin mantención por inactividad
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Fechas del ciclo bancario */}
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-elevated/20 border border-border-subtle/30 text-xs mb-3.5">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-1 text-text-muted">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Corte</span>
                  </div>
                  <span className="font-medium text-text-secondary truncate">
                    {formattedClosing}
                  </span>
                </div>

                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-1 text-text-muted">
                    <CalendarCheck className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Vencimiento</span>
                  </div>
                  <span className="font-medium text-text-secondary truncate">
                    {formattedDue}
                  </span>
                </div>
              </div>

              {/* Sub-desglose por persona */}
              {cardItem.by_person && cardItem.by_person.length > 0 && (
                <div className="pt-2.5 border-t border-border-subtle/40 flex flex-col gap-1.5">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-text-muted">
                    Aporte por participante
                  </span>
                  <div className="flex flex-col divide-y divide-border-subtle/30">
                    {cardItem.by_person.map((person) => {
                      const purchasesAmount = person.purchases_amount ?? person.amount_due;
                      const feeShare = person.fee_share ?? '0';
                      const hasDetailedBreakdown =
                        person.purchases_amount !== undefined || person.fee_share !== undefined;

                      return (
                        <div
                          key={person.person_id}
                          className="flex flex-col py-1.5 gap-0.5 text-xs sm:text-sm"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-text-secondary truncate font-medium">
                              {person.person_name}
                            </span>
                            <span className="font-mono tabular-nums font-semibold text-text-primary">
                              {formatCurrency(person.amount_due, cardItem.currency)}
                            </span>
                          </div>

                          {hasDetailedBreakdown && (
                            <div className="flex items-center gap-2 text-[11px] text-text-muted flex-wrap">
                              <span>
                                Compras:{' '}
                                <span className="font-mono tabular-nums text-text-secondary">
                                  {formatCurrency(purchasesAmount, cardItem.currency)}
                                </span>
                              </span>
                              <span>•</span>
                              <span>
                                Mantención:{' '}
                                <span
                                  className={cn(
                                    'font-mono tabular-nums',
                                    feeShare === '0'
                                      ? 'text-text-muted/60'
                                      : 'text-text-secondary',
                                  )}
                                >
                                  {formatCurrency(feeShare, cardItem.currency)}
                                </span>
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
