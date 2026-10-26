'use client';

import * as React from 'react';
import { TrendingUp, BarChart3 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency, formatPeriod, toCents } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type {
  CurrencyEnum,
  DashboardProjectionResponse,
  PersonRead,
} from '@/types/api.types';

export interface ProjectionChartProps {
  projection?: DashboardProjectionResponse | null;
  personsMap?: Map<string, PersonRead>;
  onSelectPeriod?: (period: string) => void;
  defaultCurrency?: CurrencyEnum;
  className?: string;
}

const FALLBACK_PERSON_COLOR = '#8A93A6';

/**
 * Gráfico interactivo de barras apiladas multimoneda para el horizonte de endeudamiento a 6 meses.
 * Segmentado por participante con tipografía tabular inmutable y navegación reactiva por clic.
 */
export function ProjectionChart({
  projection,
  personsMap,
  onSelectPeriod,
  defaultCurrency = 'CLP',
  className,
}: ProjectionChartProps) {
  const [selectedCurrency, setSelectedCurrency] = React.useState<CurrencyEnum>(defaultCurrency);

  // Mapa de participantes únicos presentes en toda la proyección
  const participantsList = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string; color: string }>();
    if (!projection?.periods) return [];

    for (const p of projection.periods) {
      for (const person of p.by_person ?? []) {
        if (!map.has(person.person_id)) {
          const personMeta = personsMap?.get(person.person_id);
          const color = personMeta?.color_hex?.trim() || FALLBACK_PERSON_COLOR;
          map.set(person.person_id, {
            id: person.person_id,
            name: person.person_name,
            color,
          });
        }
      }
    }
    return Array.from(map.values());
  }, [projection, personsMap]);

  // Transformación estructurada de datos para Recharts
  const chartData = React.useMemo(() => {
    if (!projection?.periods) return [];

    return projection.periods.map((p) => {
      const periodLabel = formatPeriod(p.period, 'short');
      const totalAmountStr = p.totals_by_currency?.[selectedCurrency] ?? '0';
      const totalCents = toCents(totalAmountStr);

      const entry: Record<string, unknown> = {
        period: p.period,
        periodLabel,
        totalAmountStr,
        totalNumber: totalCents / 100,
      };

      for (const person of p.by_person ?? []) {
        const personAmountStr = person.totals_by_currency?.[selectedCurrency] ?? '0';
        const personCents = toCents(personAmountStr);
        // Exclusivamente para altura vectorial SVG:
        entry[person.person_id] = personCents / 100;
        entry[`${person.person_id}_str`] = personAmountStr;
      }

      return entry;
    });
  }, [projection, selectedCurrency]);

  const hasDataInCurrency = chartData.some((d) => (d.totalNumber as number) > 0);

  if (!projection || !projection.periods || projection.periods.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center p-6 sm:p-8 rounded-xl bg-surface border border-border-subtle text-center',
          className,
        )}
      >
        <div className="w-10 h-10 rounded-full bg-elevated flex items-center justify-center text-text-muted mb-2.5">
          <BarChart3 className="w-5 h-5" />
        </div>
        <h3 className="text-sm sm:text-base font-semibold text-text-primary">
          No hay datos de proyección disponibles
        </h3>
        <p className="text-xs sm:text-sm text-text-muted mt-1 max-w-sm">
          No se pudieron cargar los períodos de proyección financiera.
        </p>
      </div>
    );
  }

  return (
    <section className={cn('flex flex-col gap-3', className)}>
      {/* Cabecera y Selector de Moneda */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-1">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-text-muted" />
          <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-text-muted">
            Proyección a 6 meses
          </h2>
        </div>

        <div className="flex items-center rounded-lg border border-border-subtle bg-elevated/40 p-0.5 self-start sm:self-auto">
          <button
            type="button"
            data-active={selectedCurrency === 'CLP'}
            onClick={() => setSelectedCurrency('CLP')}
            className={cn(
              'px-3 py-1 rounded-md text-xs font-mono font-medium transition-colors',
              selectedCurrency === 'CLP'
                ? 'bg-accent-clp/20 text-accent-clp border border-accent-clp/30 shadow-xs'
                : 'text-text-muted hover:text-text-primary',
            )}
          >
            CLP
          </button>
          <button
            type="button"
            data-active={selectedCurrency === 'USD'}
            onClick={() => setSelectedCurrency('USD')}
            className={cn(
              'px-3 py-1 rounded-md text-xs font-mono font-medium transition-colors',
              selectedCurrency === 'USD'
                ? 'bg-accent-usd/20 text-accent-usd border border-accent-usd/30 shadow-xs'
                : 'text-text-muted hover:text-text-primary',
            )}
          >
            USD
          </button>
        </div>
      </div>

      {/* Contenedor del Gráfico o Estado Vacío */}
      <div className="flex flex-col p-4 sm:p-5 rounded-xl bg-surface border border-border-subtle shadow-xs">
        {!hasDataInCurrency ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-10 h-10 rounded-full bg-elevated flex items-center justify-center text-text-muted mb-2.5">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="text-sm sm:text-base font-semibold text-text-primary">
              Sin compromisos proyectados en {selectedCurrency}
            </h3>
            <p className="text-xs sm:text-sm text-text-muted mt-1 max-w-sm">
              No se registran compras ni cuotas futuras en esta moneda para los próximos meses.
            </p>
          </div>
        ) : (
          <>
            <div className="w-full h-[280px]">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  onClick={(state: unknown) => {
                    const chartEvent = state as {
                      activePayload?: Array<{ payload?: Record<string, unknown> }>;
                    } | null;
                    const period = chartEvent?.activePayload?.[0]?.payload?.period;
                    if (typeof period === 'string') {
                      onSelectPeriod?.(period);
                    }
                  }}
                >
                  <XAxis
                    dataKey="periodLabel"
                    stroke="#8A93A6"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#232736' }}
                  />
                  <YAxis
                    stroke="#8A93A6"
                    fontSize={10}
                    tickLine={false}
                    axisLine={{ stroke: '#232736' }}
                    tickFormatter={(val) => {
                      if (val === 0) return '0';
                      if (selectedCurrency === 'CLP') {
                        return val >= 1000 ? `${Math.round(val / 1000)}k` : `${val}`;
                      }
                      return `${val}`;
                    }}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(26, 29, 40, 0.4)' }}
                    content={<CustomChartTooltip selectedCurrency={selectedCurrency} participantsList={participantsList} />}
                  />
                  {participantsList.map((p) => (
                    <Bar
                      key={p.id}
                      dataKey={p.id}
                      name={p.name}
                      stackId="a"
                      fill={p.color}
                      radius={[2, 2, 0, 0]}
                      className="cursor-pointer transition-opacity hover:opacity-90"
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Leyenda de participantes y navegación rápida por período */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border-subtle/40 mt-2">
              {/* Leyenda de participantes */}
              <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-start">
                {participantsList.map((p) => (
                  <div key={p.id} className="flex items-center gap-1.5 text-xs text-text-secondary">
                    <span
                      style={{ backgroundColor: p.color }}
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                    />
                    <span className="truncate max-w-[120px]">{p.name}</span>
                  </div>
                ))}
              </div>

              {/* Botones accesibles de salto a período */}
              <div className="flex items-center gap-1.5 flex-wrap justify-center">
                {chartData.map((d) => (
                  <button
                    key={d.period as string}
                    type="button"
                    onClick={() => onSelectPeriod?.(d.period as string)}
                    aria-label={`Ver período ${d.periodLabel as string}`}
                    className="px-2 py-1 rounded text-[11px] font-mono font-medium border border-border-subtle/50 bg-elevated/40 text-text-muted hover:text-text-primary hover:bg-elevated transition-colors"
                  >
                    {d.periodLabel as string}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

interface CustomChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: Record<string, unknown>;
  }>;
  selectedCurrency: CurrencyEnum;
  participantsList: Array<{ id: string; name: string; color: string }>;
}

function CustomChartTooltip({
  active,
  payload,
  selectedCurrency,
  participantsList,
}: CustomChartTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  const period = data.period as string;
  const totalStr = data.totalAmountStr as string;

  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-3 shadow-xl flex flex-col gap-2 min-w-[190px]">
      <div className="flex items-center justify-between gap-2 border-b border-border-subtle/50 pb-1.5">
        <span className="text-xs font-semibold text-text-primary capitalize">
          {formatPeriod(period, 'full')}
        </span>
        <span className="font-mono tabular-nums text-xs font-bold text-text-primary">
          {formatCurrency(totalStr, selectedCurrency)}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        {participantsList.map((p) => {
          const amountStr = data[`${p.id}_str`] as string | undefined;
          if (!amountStr || toCents(amountStr) === 0) return null;

          return (
            <div key={p.id} className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 truncate pr-2">
                <span
                  style={{ backgroundColor: p.color }}
                  className="w-2 h-2 rounded-full shrink-0"
                />
                <span className="text-text-muted truncate max-w-[110px]">{p.name}</span>
              </div>
              <span className="font-mono tabular-nums font-medium text-text-primary shrink-0">
                {formatCurrency(amountStr, selectedCurrency)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
