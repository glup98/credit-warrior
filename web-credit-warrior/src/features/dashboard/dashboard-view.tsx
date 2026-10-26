'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, RefreshCw, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useDashboardSummary,
  useDashboardProjection,
} from '@/hooks/queries/use-dashboard';
import { useCards } from '@/hooks/queries/use-cards';
import { usePersons } from '@/hooks/queries/use-persons';
import { useQuickExpense } from '@/features/expenses/context/quick-expense-context';
import { isValidPeriod } from '@/lib/date-period';
import { toCents } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { DashboardSkeletons } from './components/dashboard-skeletons';
import { PeriodSelector } from './components/period-selector';
import { CurrencyKpiCards } from './components/currency-kpi-cards';
import { PersonBreakdownSection } from './components/person-breakdown-section';
import { CardBreakdownSection } from './components/card-breakdown-section';
import { ActiveInstallmentsSection } from './components/active-installments-section';
import { ProjectionChart } from './components/projection-chart';

export interface DashboardViewProps {
  className?: string;
}

/**
 * Orquestador principal de la vista del Panel Financiero (Dashboard).
 * Gestiona sincronización en URL, consultas remotas, resolución en memoria
 * de metadatos de tarjetas/personas y estados de error/vacío.
 */
export function DashboardView({ className }: DashboardViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const periodParam = searchParams.get('period');
  const isPeriodParamValid = isValidPeriod(periodParam);
  const queryPeriod = isPeriodParamValid ? (periodParam as string) : undefined;

  // 1. Consulta del resumen mensual
  const {
    data: summary,
    isLoading: isSummaryLoading,
    isError: isSummaryError,
    refetch: refetchSummary,
  } = useDashboardSummary(queryPeriod);

  // Sincronización automática de URL con el período retornado por el servidor
  React.useEffect(() => {
    if (!isPeriodParamValid && summary?.period) {
      router.replace(`?period=${summary.period}`, { scroll: false });
    }
  }, [isPeriodParamValid, summary?.period, router]);

  const activePeriod = isPeriodParamValid
    ? (periodParam as string)
    : (summary?.period ?? '');

  // 2. Consultas secundarias: Proyección y Catálogos
  const { data: projection } = useDashboardProjection({
    start_period: activePeriod || undefined,
    months: 6,
  });

  const { data: cards = [], isLoading: isCardsLoading } = useCards();
  const { data: persons = [], isLoading: isPersonsLoading } = usePersons();

  const { open: openQuickExpense } = useQuickExpense();

  // Indexación de metadatos en memoria para resolución instantánea
  const cardsMap = React.useMemo(
    () => new Map(cards.map((c) => [c.id, c])),
    [cards],
  );

  const personsMap = React.useMemo(
    () => new Map(persons.map((p) => [p.id, p])),
    [persons],
  );

  const handlePeriodChange = (newPeriod: string) => {
    router.push(`?period=${newPeriod}`, { scroll: false });
  };

  // 3. Estado de Carga Global
  if (isSummaryLoading || isCardsLoading || isPersonsLoading) {
    return <DashboardSkeletons className={className} />;
  }

  // 4. Estado de Error
  if (isSummaryError || !summary) {
    return (
      <div
        role="alert"
        className={cn(
          'flex flex-col items-center justify-center p-8 sm:p-12 text-center gap-4 rounded-xl border border-accent-danger/30 bg-surface shadow-xs max-w-2xl mx-auto my-8',
          className,
        )}
      >
        <AlertCircle className="w-10 h-10 text-accent-danger shrink-0" />
        <div className="flex flex-col gap-1">
          <h3 className="text-base sm:text-lg font-bold text-text-primary">
            No se pudo cargar el panel financiero
          </h3>
          <p className="text-xs sm:text-sm text-text-muted">
            Ocurrió un error al consultar el resumen financiero con el servidor.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => refetchSummary()}
          className="gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Reintentar</span>
        </Button>
      </div>
    );
  }

  // 5. Evaluación de período sin cobros
  const clpTotal = summary.totals_by_currency?.CLP ?? '0';
  const usdTotal = summary.totals_by_currency?.USD ?? '0.00';
  const installmentsCount = summary.active_installments?.length ?? 0;
  const hasNoDebt =
    toCents(clpTotal) === 0 &&
    toCents(usdTotal) === 0 &&
    installmentsCount === 0;

  return (
    <div className={cn('flex flex-col gap-5 sm:gap-6 w-full max-w-6xl mx-auto', className)}>
      {/* Selector de Período */}
      <PeriodSelector
        currentPeriod={activePeriod}
        defaultPeriod={summary.period}
        onPeriodChange={handlePeriodChange}
      />

      {/* Tarjetas de Resumen KPI (CLP y USD) */}
      <CurrencyKpiCards
        totalsByCurrency={summary.totals_by_currency}
        activeInstallments={summary.active_installments}
      />

      {/* Si no hay deuda en el período, muestra el estado amigable de tranquilidad */}
      {hasNoDebt ? (
        <div className="flex flex-col items-center justify-center p-8 sm:p-12 rounded-xl bg-surface border border-border-subtle text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-accent-clp/15 flex items-center justify-center text-accent-clp mb-1">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="flex flex-col gap-1 max-w-md">
            <h3 className="text-base sm:text-lg font-bold text-text-primary">
              Sin cobros en este período
            </h3>
            <p className="text-xs sm:text-sm text-text-muted">
              No se registran gastos ni cuotas por pagar para este mes.
            </p>
          </div>
          <Button
            type="button"
            onClick={openQuickExpense}
            className="mt-3 gap-2 bg-text-primary text-bg-canvas hover:bg-text-secondary"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar gasto</span>
          </Button>
        </div>
      ) : (
        <>
          {/* Desglose por Persona y Tarjeta */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <PersonBreakdownSection
              byPerson={summary.by_person}
              personsMap={personsMap}
            />

            <CardBreakdownSection
              byCard={summary.by_card}
              cardsMap={cardsMap}
            />
          </div>

          {/* Cuotas Activas del Período */}
          <ActiveInstallmentsSection
            activeInstallments={summary.active_installments}
            cardsMap={cardsMap}
            personsMap={personsMap}
            currentPeriod={activePeriod}
          />
        </>
      )}

      {/* Gráfico de Proyección a 6 Meses */}
      <ProjectionChart
        projection={projection}
        personsMap={personsMap}
        onSelectPeriod={handlePeriodChange}
      />
    </div>
  );
}
