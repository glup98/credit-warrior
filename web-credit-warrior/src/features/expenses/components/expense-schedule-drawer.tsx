'use client';

import * as React from 'react';
import {
  CalendarRange,
  AlertCircle,
  RefreshCw,
  Info,
  CreditCard,
} from 'lucide-react';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useExpenseSchedule } from '@/hooks/queries/use-expenses';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { CurrencyBadge } from '@/components/shared/currency-badge';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatCurrency, formatPeriod, type Currency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { CurrencyEnum } from '@/types/api.types';

export interface ExpenseScheduleDrawerProps {
  expenseId: string | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  activePeriod?: string | null;
  className?: string;
}

/**
 * Modal adaptativo que proyecta el cronograma de cuotas oficial del servidor.
 * - Dialog en pantallas de escritorio (>= 768px).
 * - Drawer en dispositivos móviles (< 768px).
 * - Cero cálculo financiero en cliente: renderiza exclusivamente los datos de useExpenseSchedule.
 * - Resalta la cuota vigente si su payment_period coincide con activePeriod.
 */
export function ExpenseScheduleDrawer({
  expenseId,
  open = false,
  onOpenChange,
  activePeriod,
  className,
}: ExpenseScheduleDrawerProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)', true);

  const {
    data: scheduleData,
    isLoading,
    isError,
    refetch,
  } = useExpenseSchedule(open && expenseId ? expenseId : '');

  const currency = (scheduleData?.currency ?? 'CLP') as Currency;

  const content = (
    <div className={cn('space-y-4 text-text-primary', className)}>
      {/* 1. Estado de carga con Skeleton */}
      {isLoading && (
        <div data-testid="schedule-skeleton" className="space-y-3 py-4 animate-pulse">
          <div className="h-6 w-1/3 rounded-md bg-elevated" />
          <div className="h-4 w-1/2 rounded-md bg-elevated/60" />
          <div className="space-y-2 pt-2">
            <div className="h-10 w-full rounded-lg bg-elevated/80" />
            <div className="h-12 w-full rounded-lg bg-elevated/60" />
            <div className="h-12 w-full rounded-lg bg-elevated/60" />
            <div className="h-12 w-full rounded-lg bg-elevated/60" />
          </div>
        </div>
      )}

      {/* 2. Estado de error */}
      {isError && !isLoading && (
        <div
          role="alert"
          className="flex flex-col items-center justify-center p-6 text-center gap-3 rounded-xl border border-accent-danger/30 bg-accent-danger/10"
        >
          <AlertCircle className="h-8 w-8 text-accent-danger shrink-0" />
          <div>
            <p className="text-sm font-semibold text-text-primary">
              No se pudo cargar el cronograma de amortización
            </p>
            <p className="text-xs text-text-muted mt-0.5">
              Ocurrió un error al consultar las cuotas del gasto con el servidor.
            </p>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-elevated px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-elevated/80 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-clp"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Reintentar</span>
          </button>
        </div>
      )}

      {/* 3. Contenido con cronograma oficial */}
      {scheduleData && !isLoading && (
        <div className="space-y-4">
          {/* Tarjeta resumen de cabecera */}
          <div className="rounded-xl border border-border-subtle bg-elevated/40 p-3.5 sm:p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-base font-bold text-text-primary leading-tight">
                    {scheduleData.description}
                  </h4>
                  <CurrencyBadge currency={currency as CurrencyEnum} />
                </div>
                <div className="flex items-center gap-1.5 text-xs text-text-muted">
                  <CreditCard className="h-3.5 w-3.5 shrink-0" />
                  <span>{scheduleData.card_name}</span>
                </div>
              </div>

              <div className="text-right">
                <div className="font-mono text-base sm:text-lg font-bold text-text-primary tabular-nums">
                  {formatCurrency(scheduleData.total_amount, currency)}
                </div>
                <div className="text-xs text-text-muted">
                  {scheduleData.installments_count === 1
                    ? '1 cuota'
                    : `${scheduleData.installments_count} cuotas`}
                </div>
              </div>
            </div>
          </div>

          {/* Tabla de amortización cuota a cuota */}
          <div className="overflow-x-auto rounded-xl border border-border-subtle bg-surface/50">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border-subtle bg-elevated/60 text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                  <th className="px-3 py-2.5">Cuota</th>
                  <th className="px-3 py-2.5">Facturación / Corte</th>
                  <th className="px-3 py-2.5">Vencimiento / Pago</th>
                  <th className="px-3 py-2.5 text-right">Monto</th>
                  <th className="px-3 py-2.5">Desglose</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/50">
                {scheduleData.schedule.map((item) => {
                  const isCurrent = Boolean(
                    activePeriod && item.payment_period === activePeriod,
                  );

                  return (
                    <tr
                      key={item.installment_number}
                      className={cn(
                        'transition-colors',
                        isCurrent
                          ? 'bg-accent-clp/15 border-y-2 border-accent-clp font-medium'
                          : 'hover:bg-elevated/30',
                      )}
                    >
                      {/* Cuota + Badge "Próximo pago" */}
                      <td className="px-3 py-3 align-top whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-text-primary">
                            {item.installment_label}
                          </span>
                          {isCurrent && (
                            <Badge className="bg-accent-clp/20 text-accent-clp border-accent-clp/40 text-[10px] py-0 px-1.5">
                              Próximo pago
                            </Badge>
                          )}
                        </div>
                      </td>

                      {/* Facturación / Corte */}
                      <td className="px-3 py-3 align-top whitespace-nowrap">
                        <div className="text-text-primary">
                          {formatDate(item.closing_date)}
                        </div>
                        <div className="text-[10px] text-text-muted">
                          {formatPeriod(item.statement_period, 'short')}
                        </div>
                      </td>

                      {/* Vencimiento / Pago */}
                      <td className="px-3 py-3 align-top whitespace-nowrap">
                        <div className="text-text-primary">
                          {formatDate(item.due_date)}
                        </div>
                        <div className="text-[10px] text-text-muted">
                          {formatPeriod(item.payment_period, 'short')}
                        </div>
                      </td>

                      {/* Monto de la cuota */}
                      <td className="px-3 py-3 align-top text-right font-mono font-semibold text-text-primary tabular-nums whitespace-nowrap">
                        {formatCurrency(item.installment_amount, currency)}
                      </td>

                      {/* Desglose individual de participantes */}
                      <td className="px-3 py-3 align-top">
                        <div className="flex flex-col gap-1 min-w-[140px]">
                          {item.person_shares.map((share) => (
                            <div
                              key={share.person_id}
                              className="flex items-center justify-between gap-2 text-[11px] text-text-muted"
                            >
                              <span className="truncate max-w-[90px]">
                                {share.person_name}
                              </span>
                              <span className="font-mono text-text-primary/90 tabular-nums font-medium">
                                {formatCurrency(share.amount, currency)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pie informativo: Garantía de zero-financial-math en cliente */}
          <div className="flex items-start gap-2.5 rounded-lg border border-border-subtle/50 bg-elevated/40 p-3 text-xs text-text-muted">
            <Info className="h-4 w-4 shrink-0 text-accent-clp mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              Los cronogramas y absorción de residuos de redondeo son calculados y
              proyectados exclusivamente por el servidor (api-credit-warrior).
            </p>
          </div>
        </div>
      )}
    </div>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90dvh] overflow-y-auto border border-border-subtle bg-surface shadow-2xl sm:rounded-2xl p-6">
          <DialogHeader className="pb-2 text-left">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-text-primary">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-clp/15 text-accent-clp">
                <CalendarRange className="h-4 w-4" />
              </span>
              <span>Cronograma de amortización</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-text-muted">
              Detalle oficial de cuotas, fechas de corte y vencimiento proyectadas por el servidor.
            </DialogDescription>
          </DialogHeader>
          <div className="pt-1">{content}</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90dvh] border-border-subtle bg-surface px-4 pb-6 pt-2">
        <DrawerHeader className="text-left pb-2">
          <DrawerTitle className="flex items-center gap-2 text-lg font-bold text-text-primary">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-clp/15 text-accent-clp">
              <CalendarRange className="h-4 w-4" />
            </span>
            <span>Cronograma de amortización</span>
          </DrawerTitle>
          <DrawerDescription className="text-xs text-text-muted">
            Detalle oficial de cuotas, fechas de corte y vencimiento proyectadas por el servidor.
          </DrawerDescription>
        </DrawerHeader>
        <div className="overflow-y-auto pt-1">{content}</div>
      </DrawerContent>
    </Drawer>
  );
}
