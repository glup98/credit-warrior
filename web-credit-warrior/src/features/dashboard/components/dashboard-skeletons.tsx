import * as React from 'react';
import { cn } from '@/lib/utils';

export interface DashboardSkeletonsProps {
  className?: string;
}

/**
 * Esqueleto estructurado del Dashboard que reproduce fielmente la geometría
 * del panel financiero para evitar saltos acumulativos de diseño (CLS).
 */
export function DashboardSkeletons({ className }: DashboardSkeletonsProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Cargando panel financiero..."
      className={cn('flex flex-col gap-6 w-full max-w-6xl mx-auto', className)}
    >
      {/* 1. Esqueleto Selector de Período */}
      <div
        data-testid="skeleton-period-selector"
        className="h-14 rounded-xl bg-surface border border-border-subtle p-2.5 flex items-center justify-between animate-pulse"
      >
        <div className="w-10 h-10 rounded-lg bg-elevated/70" />
        <div className="w-36 h-5 rounded bg-elevated/70" />
        <div className="w-10 h-10 rounded-lg bg-elevated/70" />
      </div>

      {/* 2. Esqueleto Tarjetas KPI (CLP y USD) */}
      <div
        data-testid="skeleton-kpis"
        className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4"
      >
        <div className="p-4 sm:p-5 rounded-xl bg-surface border border-border-subtle border-l-4 border-l-border-subtle flex flex-col gap-3 animate-pulse">
          <div className="flex justify-between items-center">
            <div className="w-28 h-4 rounded bg-elevated/70" />
            <div className="w-10 h-5 rounded bg-elevated/70" />
          </div>
          <div className="w-36 h-8 rounded bg-elevated/80" />
          <div className="w-28 h-3.5 rounded bg-elevated/60" />
        </div>

        <div className="p-4 sm:p-5 rounded-xl bg-surface border border-border-subtle border-l-4 border-l-border-subtle flex flex-col gap-3 animate-pulse">
          <div className="flex justify-between items-center">
            <div className="w-28 h-4 rounded bg-elevated/70" />
            <div className="w-10 h-5 rounded bg-elevated/70" />
          </div>
          <div className="w-36 h-8 rounded bg-elevated/80" />
          <div className="w-28 h-3.5 rounded bg-elevated/60" />
        </div>
      </div>

      {/* 3. Esqueleto Desglose por Persona y Tarjeta */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div
          data-testid="skeleton-persons"
          className="p-4 rounded-xl bg-surface border border-border-subtle flex flex-col gap-3 animate-pulse"
        >
          <div className="w-36 h-4 rounded bg-elevated/70" />
          <div className="flex flex-col gap-2.5 divide-y divide-border-subtle/30 pt-1">
            <div className="flex justify-between items-center py-2">
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full bg-elevated/80" />
                <div className="w-24 h-4 rounded bg-elevated/70" />
              </div>
              <div className="w-16 h-4 rounded bg-elevated/80" />
            </div>
            <div className="flex justify-between items-center py-2">
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full bg-elevated/80" />
                <div className="w-28 h-4 rounded bg-elevated/70" />
              </div>
              <div className="w-20 h-4 rounded bg-elevated/80" />
            </div>
          </div>
        </div>

        <div
          data-testid="skeleton-cards"
          className="p-4 rounded-xl bg-surface border border-border-subtle flex flex-col gap-3 animate-pulse"
        >
          <div className="w-36 h-4 rounded bg-elevated/70" />
          <div className="flex flex-col gap-2.5 pt-1">
            <div className="p-3 rounded-lg bg-elevated/40 border border-border-subtle/40 flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <div className="w-28 h-4 rounded bg-elevated/80" />
                <div className="w-10 h-5 rounded bg-elevated/80" />
              </div>
              <div className="w-24 h-6 rounded bg-elevated/70" />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Esqueleto Cuotas Activas */}
      <div
        data-testid="skeleton-installments"
        className="flex flex-col gap-3 animate-pulse"
      >
        <div className="w-44 h-4 rounded bg-elevated/70" />
        <div className="p-4 rounded-xl bg-surface border border-border-subtle flex flex-col gap-3">
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-1.5">
              <div className="w-44 h-4 rounded bg-elevated/80" />
              <div className="w-32 h-3 rounded bg-elevated/60" />
            </div>
            <div className="w-20 h-6 rounded bg-elevated/80" />
          </div>
          <div className="pt-2 border-t border-border-subtle/40 flex justify-between items-center">
            <div className="w-28 h-5 rounded-full bg-elevated/60" />
            <div className="w-24 h-8 rounded-lg bg-elevated/70" />
          </div>
        </div>
      </div>

      {/* 5. Esqueleto Gráfico de Proyección */}
      <div
        data-testid="skeleton-projection"
        className="p-4 sm:p-5 rounded-xl bg-surface border border-border-subtle flex flex-col gap-4 animate-pulse"
      >
        <div className="flex justify-between items-center">
          <div className="w-36 h-4 rounded bg-elevated/70" />
          <div className="w-20 h-7 rounded-lg bg-elevated/70" />
        </div>
        <div className="h-44 w-full rounded-lg bg-elevated/40 flex items-end justify-around p-4 gap-2">
          <div className="w-8 h-28 rounded-t bg-elevated/60" />
          <div className="w-8 h-36 rounded-t bg-elevated/70" />
          <div className="w-8 h-20 rounded-t bg-elevated/60" />
          <div className="w-8 h-16 rounded-t bg-elevated/50" />
          <div className="w-8 h-12 rounded-t bg-elevated/40" />
          <div className="w-8 h-8 rounded-t bg-elevated/30" />
        </div>
      </div>
    </div>
  );
}
