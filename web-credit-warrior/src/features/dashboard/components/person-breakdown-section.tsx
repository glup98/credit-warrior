import * as React from 'react';
import { Users } from 'lucide-react';
import { formatCurrency, toCents } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { PersonMonthlySummary, PersonRead } from '@/types/api.types';

export interface PersonBreakdownSectionProps {
  byPerson: PersonMonthlySummary[];
  personsMap?: Map<string, PersonRead>;
  className?: string;
}

const FALLBACK_PERSON_COLOR = '#8A93A6';

/**
 * Sección que presenta el desglose consolidado de la deuda mensual
 * dividida por cada participante ("Cuánto paga cada uno").
 * Cruza con el catálogo general de personas para resolver el color corporativo.
 */
export function PersonBreakdownSection({
  byPerson,
  personsMap,
  className,
}: PersonBreakdownSectionProps) {
  if (!byPerson || byPerson.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center p-6 sm:p-8 rounded-xl bg-surface border border-border-subtle text-center',
          className,
        )}
      >
        <div className="w-10 h-10 rounded-full bg-elevated flex items-center justify-center text-text-muted mb-2.5">
          <Users className="w-5 h-5" />
        </div>
        <h3 className="text-sm sm:text-base font-semibold text-text-primary">
          No hay cobros a participantes
        </h3>
        <p className="text-xs sm:text-sm text-text-muted mt-1 max-w-sm">
          Ningún participante registra deudas pendientes en este período.
        </p>
      </div>
    );
  }

  return (
    <section className={cn('flex flex-col gap-2.5', className)}>
      <div className="flex items-center gap-2 px-1">
        <Users className="w-4 h-4 text-text-muted" />
        <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-text-muted">
          Cuánto paga cada uno
        </h2>
      </div>

      <div className="flex flex-col rounded-xl bg-surface border border-border-subtle p-2 sm:p-3 divide-y divide-border-subtle/40">
        {byPerson.map((personItem) => {
          const person = personsMap?.get(personItem.person_id);
          const colorHex = person?.color_hex?.trim() ? person.color_hex : FALLBACK_PERSON_COLOR;

          const clpAmount = personItem.totals_by_currency?.CLP;
          const usdAmount = personItem.totals_by_currency?.USD;

          const hasClp = toCents(clpAmount) > 0;
          const hasUsd = toCents(usdAmount) > 0;

          return (
            <div
              key={personItem.person_id}
              className="flex items-center justify-between py-2.5 px-1.5 sm:px-2 first:pt-1 last:pb-1"
            >
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 pr-3">
                <span
                  data-testid="person-color-badge"
                  style={{ backgroundColor: colorHex }}
                  className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full shrink-0 ring-2 ring-border-subtle/30"
                  aria-hidden="true"
                />
                <span className="text-sm font-medium text-text-primary truncate">
                  {personItem.person_name}
                </span>
              </div>

              <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                {hasClp && (
                  <span className="font-mono tabular-nums text-sm sm:text-base font-semibold text-text-primary">
                    {formatCurrency(clpAmount, 'CLP')}
                  </span>
                )}
                {hasUsd && (
                  <span className="font-mono tabular-nums text-sm sm:text-base font-semibold text-accent-usd">
                    {formatCurrency(usdAmount, 'USD')}
                  </span>
                )}
                {!hasClp && !hasUsd && (
                  <span className="text-xs text-text-muted font-mono">
                    $0
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
