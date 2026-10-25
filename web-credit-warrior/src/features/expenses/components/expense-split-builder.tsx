'use client';

import * as React from 'react';
import Link from 'next/link';
import { Users, AlertCircle, ArrowRight, Check, HelpCircle, Loader2, Plus } from 'lucide-react';
import { usePersons } from '@/hooks/queries/use-persons';
import { PersonChip } from '@/components/shared/person-chip';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toCents, formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { CurrencyEnum, PersonRead } from '@/types/api.types';
import { PercentageSplitBalance } from './percentage-split-balance';
import { FixedSplitBalance } from './fixed-split-balance';

export type SplitType = 'EQUAL' | 'PERCENTAGE' | 'FIXED_AMOUNT';

export interface SplitItem {
  person_id: string;
  split_type: SplitType;
  percentage?: string | null;
  fixed_amount?: string | null;
}

export interface ExpenseSplitBuilderProps {
  splitType: SplitType;
  onSplitTypeChange: (type: SplitType) => void;
  splits: SplitItem[];
  onSplitsChange: (splits: SplitItem[]) => void;
  totalAmount?: string;
  currency?: CurrencyEnum;
  className?: string;
  error?: string;
}

/**
 * Calcula la distribución porcentual equitativa estricta en centésimas enteras (100.00% = 10000).
 * Asigna los centavos residuales a los primeros participantes para totalizar exactamente 100.00%.
 */
export function calculateEqualPercentages(count: number): string[] {
  if (count <= 0) return [];
  const totalCents = 10000;
  const baseCents = Math.floor(totalCents / count);
  const remainder = totalCents % count;

  return Array.from({ length: count }, (_, i) => {
    const cents = baseCents + (i < remainder ? 1 : 0);
    return (cents / 100).toFixed(2);
  });
}

/**
 * Contenedor del constructor interactivo de repartos de gastos (splits).
 * Gestiona modos EQUAL, PERCENTAGE y FIXED_AMOUNT, con preselección automática,
 * auto-distribución asistida al 100%, asignación rápida de saldo restante a $0,
 * estimación referencial sin math financiera en cliente y validación estricta de minItems: 1.
 */
export function ExpenseSplitBuilder({
  splitType,
  onSplitTypeChange,
  splits,
  onSplitsChange,
  totalAmount,
  currency = 'CLP',
  className,
  error,
}: ExpenseSplitBuilderProps) {
  const { data: persons = [], isLoading, isError } = usePersons({ is_active: true });

  // Preselección de todos los participantes activos si la lista está vacía en modo EQUAL
  React.useEffect(() => {
    if (splitType === 'EQUAL' && persons.length > 0 && splits.length === 0) {
      onSplitsChange(
        persons.map((p) => ({
          person_id: p.id,
          split_type: 'EQUAL',
          percentage: null,
          fixed_amount: null,
        })),
      );
    }
  }, [splitType, persons, splits.length, onSplitsChange]);

  const handleTabChange = (val: string) => {
    const newType = val as SplitType;

    if (newType === 'PERCENTAGE') {
      // Inicialización Asistida: auto-distribución equitativa para comenzar directamente en verde al 100.00%
      const targetPersons =
        splits.length > 0
          ? splits
          : persons.map((p) => ({
              person_id: p.id,
              split_type: 'PERCENTAGE' as const,
              percentage: null,
              fixed_amount: null,
            }));

      const percentages = calculateEqualPercentages(targetPersons.length);
      const updatedSplits = targetPersons.map((item, idx) => ({
        person_id: item.person_id,
        split_type: 'PERCENTAGE' as const,
        percentage: percentages[idx] ?? '0.00',
        fixed_amount: null,
      }));
      onSplitsChange(updatedSplits);
    } else if (newType === 'EQUAL') {
      const updatedSplits = splits.map((item) => ({
        person_id: item.person_id,
        split_type: 'EQUAL' as const,
        percentage: null,
        fixed_amount: null,
      }));
      onSplitsChange(updatedSplits);
    } else if (newType === 'FIXED_AMOUNT') {
      const updatedSplits = splits.map((item) => ({
        person_id: item.person_id,
        split_type: 'FIXED_AMOUNT' as const,
        percentage: null,
        fixed_amount: item.fixed_amount ?? null,
      }));
      onSplitsChange(updatedSplits);
    }

    onSplitTypeChange(newType);
  };

  const handleTogglePerson = (personId: string) => {
    const isSelected = splits.some((s) => s.person_id === personId);
    if (isSelected) {
      onSplitsChange(splits.filter((s) => s.person_id !== personId));
    } else {
      onSplitsChange([
        ...splits,
        {
          person_id: personId,
          split_type: splitType,
          percentage: splitType === 'PERCENTAGE' ? '' : null,
          fixed_amount: splitType === 'FIXED_AMOUNT' ? '' : null,
        },
      ]);
    }
  };

  const handlePercentageChange = (personId: string, value: string) => {
    onSplitsChange(
      splits.map((s) =>
        s.person_id === personId
          ? { ...s, split_type: 'PERCENTAGE' as const, percentage: value }
          : s,
      ),
    );
  };

  const handleDistributeEqually = () => {
    if (splits.length === 0) return;
    const percentages = calculateEqualPercentages(splits.length);
    onSplitsChange(
      splits.map((item, idx) => ({
        ...item,
        split_type: 'PERCENTAGE' as const,
        percentage: percentages[idx] ?? '0.00',
        fixed_amount: null,
      })),
    );
  };

  const handleFixedAmountChange = (personId: string, value: string) => {
    onSplitsChange(
      splits.map((s) =>
        s.person_id === personId
          ? { ...s, split_type: 'FIXED_AMOUNT' as const, fixed_amount: value }
          : s,
      ),
    );
  };

  // Cálculo en centavos para saldo restante en FIXED_AMOUNT
  const totalCents = React.useMemo(() => {
    return totalAmount ? toCents(totalAmount) : 0;
  }, [totalAmount]);

  const assignedFixedCents = React.useMemo(() => {
    return splits.reduce((acc, s) => acc + toCents(s.fixed_amount), 0);
  }, [splits]);

  const remainingCents = totalCents - assignedFixedCents;

  const handleAssignRemaining = (personId: string) => {
    if (remainingCents <= 0) return;
    const targetSplit = splits.find((s) => s.person_id === personId);
    if (!targetSplit) return;

    const currentPersonCents = toCents(targetSplit.fixed_amount);
    const newPersonCents = currentPersonCents + remainingCents;
    const newFixedAmount =
      currency === 'CLP'
        ? String(Math.floor(newPersonCents / 100))
        : (newPersonCents / 100).toFixed(2);

    const updatedSplits = splits.map((s) =>
      s.person_id === personId
        ? { ...s, split_type: 'FIXED_AMOUNT' as const, fixed_amount: newFixedAmount }
        : s,
    );
    onSplitsChange(updatedSplits);
  };

  // Cálculo referencial estimado de cuota por persona (solo visual para el usuario)
  const estimatedShareText = React.useMemo(() => {
    if (!totalAmount || splits.length === 0) return null;
    if (totalCents <= 0) return null;

    const shareCents = Math.floor(totalCents / splits.length);
    const amountStr =
      currency === 'CLP'
        ? String(Math.floor(shareCents / 100))
        : (shareCents / 100).toFixed(2);

    return formatCurrency(amountStr, currency);
  }, [totalAmount, totalCents, splits.length, currency]);

  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn(
          'flex items-center gap-3 rounded-lg border border-border-subtle bg-surface/40 p-4 text-sm text-text-muted animate-pulse',
          className,
        )}
      >
        <Loader2 className="h-5 w-5 animate-spin text-accent-clp" />
        <span>Cargando participantes disponibles...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div
        role="alert"
        className={cn(
          'flex items-center gap-3 rounded-lg border border-accent-danger/40 bg-accent-danger/10 p-4 text-sm text-accent-danger',
          className,
        )}
      >
        <AlertCircle className="h-5 w-5 shrink-0" />
        <span>Error al cargar participantes activos. Comprueba tu conexión.</span>
      </div>
    );
  }

  if (persons.length === 0) {
    return (
      <div
        role="alert"
        className={cn(
          'flex flex-col gap-3 rounded-xl border border-accent-usd/30 bg-surface/50 p-4 text-sm sm:flex-row sm:items-center sm:justify-between',
          className,
        )}
      >
        <div className="flex items-start gap-3">
          <Users className="h-5 w-5 shrink-0 text-accent-usd mt-0.5" />
          <div className="space-y-0.5">
            <h4 className="font-semibold text-text-primary">Sin participantes activos</h4>
            <p className="text-xs text-text-muted">
              No tienes participantes activos para dividir compras. Crea al menos un participante para registrar el reparto.
            </p>
          </div>
        </div>
        <Link
          href="/persons"
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border-subtle bg-elevated px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-surface hover:text-accent-clp sm:self-center"
        >
          <span>Crear participante</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  const hasNoSelectedPersons = splits.length === 0;

  return (
    <div className={cn('space-y-3.5', className)}>
      <Tabs value={splitType} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="EQUAL">Partes iguales</TabsTrigger>
          <TabsTrigger value="PERCENTAGE">Porcentaje</TabsTrigger>
          <TabsTrigger value="FIXED_AMOUNT">Monto fijo</TabsTrigger>
        </TabsList>

        {/* MODO EQUAL */}
        <TabsContent value="EQUAL" className="space-y-3 pt-1">
          <p className="text-xs text-text-muted">
            Toca a los participantes que compartirán el gasto en partes iguales:
          </p>

          <div
            role="group"
            aria-label="Participantes en partes iguales"
            className="flex flex-wrap items-center gap-2"
          >
            {persons.map((person: PersonRead) => {
              const isSelected = splits.some((s) => s.person_id === person.id);

              return (
                <button
                  key={person.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => handleTogglePerson(person.id)}
                  className={cn(
                    'group relative inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-all',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-clp focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
                    isSelected
                      ? 'border-accent-clp bg-accent-clp/15 text-text-primary ring-1 ring-accent-clp shadow-xs'
                      : 'border-border-subtle bg-elevated/40 text-text-muted hover:border-border-subtle/80 hover:text-text-primary opacity-65 hover:opacity-100',
                  )}
                >
                  <PersonChip
                    name={person.name}
                    colorHex={person.color_hex}
                    size="sm"
                    className="border-0 bg-transparent p-0 shadow-none"
                  />
                  {isSelected && (
                    <Check className="h-3.5 w-3.5 text-accent-clp shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Alerta de validación: mínimo 1 persona seleccionada */}
          {hasNoSelectedPersons && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-lg border border-accent-danger/40 bg-accent-danger/10 p-2.5 text-xs text-accent-danger"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Debes seleccionar al menos un participante para dividir el gasto.</span>
            </div>
          )}

          {/* Cuota estimada referencial */}
          {estimatedShareText && !hasNoSelectedPersons && (
            <div className="flex items-start gap-2 rounded-lg border border-border-subtle/60 bg-surface/50 p-2.5 text-xs text-text-muted">
              <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-text-muted/70" />
              <div>
                <p className="font-medium text-text-primary">
                  Aprox. {estimatedShareText} por persona
                </p>
                <p className="text-[11px] text-text-muted/80">
                  Ajuste de redondeo por servidor en la cuota 1 y último participante.
                </p>
              </div>
            </div>
          )}
        </TabsContent>

        {/* MODO PERCENTAGE (Implementado en T4) */}
        <TabsContent value="PERCENTAGE" className="space-y-3 pt-1">
          {/* Barra reactiva de balance con botón de distribución equitativa */}
          <PercentageSplitBalance
            splits={splits}
            onDistributeEqually={handleDistributeEqually}
          />

          {/* Chips para activar/desactivar participantes */}
          <div className="space-y-1.5">
            <p className="text-xs text-text-muted">
              Toca para incluir o excluir participantes del reparto porcentual:
            </p>
            <div
              role="group"
              aria-label="Participantes en reparto porcentual"
              className="flex flex-wrap items-center gap-2"
            >
              {persons.map((person) => {
                const isSelected = splits.some((s) => s.person_id === person.id);
                return (
                  <button
                    key={person.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => handleTogglePerson(person.id)}
                    className={cn(
                      'group relative inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-all',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-clp focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
                      isSelected
                        ? 'border-accent-clp bg-accent-clp/15 text-text-primary ring-1 ring-accent-clp shadow-xs'
                        : 'border-border-subtle bg-elevated/40 text-text-muted hover:border-border-subtle/80 hover:text-text-primary opacity-65 hover:opacity-100',
                    )}
                  >
                    <PersonChip
                      name={person.name}
                      colorHex={person.color_hex}
                      size="sm"
                      className="border-0 bg-transparent p-0 shadow-none"
                    />
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 text-accent-clp shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Alerta de validación: mínimo 1 persona seleccionada */}
          {hasNoSelectedPersons ? (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-lg border border-accent-danger/40 bg-accent-danger/10 p-2.5 text-xs text-accent-danger"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Debes seleccionar al menos un participante para dividir el gasto.</span>
            </div>
          ) : (
            <div className="space-y-2 pt-1">
              {splits.map((split) => {
                const person = persons.find((p) => p.id === split.person_id);
                if (!person) return null;

                return (
                  <div
                    key={split.person_id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border-subtle bg-surface/60 p-2.5 transition-colors hover:border-border-subtle/80"
                  >
                    <PersonChip
                      name={person.name}
                      colorHex={person.color_hex}
                      size="sm"
                      className="truncate"
                    />

                    <div className="relative flex items-center">
                      <input
                        type="text"
                        inputMode="decimal"
                        aria-label={`Porcentaje para ${person.name}`}
                        value={split.percentage ?? ''}
                        onChange={(e) =>
                          handlePercentageChange(split.person_id, e.target.value)
                        }
                        placeholder="0.00"
                        className={cn(
                          'h-8 w-24 rounded-md border border-border-subtle bg-elevated px-2.5 pr-6 text-right text-xs font-semibold text-text-primary placeholder:text-text-muted/50',
                          'focus:border-accent-clp focus:outline-none focus:ring-1 focus:ring-accent-clp transition-all',
                        )}
                      />
                      <span className="pointer-events-none absolute right-2 text-xs font-medium text-text-muted">
                        %
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* MODO FIXED_AMOUNT (Implementado en T5) */}
        <TabsContent value="FIXED_AMOUNT" className="space-y-3 pt-1">
          {/* Indicador reactivo de saldo restante con barra de cobertura */}
          <FixedSplitBalance
            splits={splits}
            totalAmount={totalAmount}
            currency={currency}
          />

          {/* Chips para activar/desactivar participantes */}
          <div className="space-y-1.5">
            <p className="text-xs text-text-muted">
              Toca para incluir o excluir participantes del reparto por monto fijo:
            </p>
            <div
              role="group"
              aria-label="Participantes en reparto por monto fijo"
              className="flex flex-wrap items-center gap-2"
            >
              {persons.map((person) => {
                const isSelected = splits.some((s) => s.person_id === person.id);
                return (
                  <button
                    key={person.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => handleTogglePerson(person.id)}
                    className={cn(
                      'group relative inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-all',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-clp focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
                      isSelected
                        ? 'border-accent-clp bg-accent-clp/15 text-text-primary ring-1 ring-accent-clp shadow-xs'
                        : 'border-border-subtle bg-elevated/40 text-text-muted hover:border-border-subtle/80 hover:text-text-primary opacity-65 hover:opacity-100',
                    )}
                  >
                    <PersonChip
                      name={person.name}
                      colorHex={person.color_hex}
                      size="sm"
                      className="border-0 bg-transparent p-0 shadow-none"
                    />
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 text-accent-clp shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Alerta de validación: mínimo 1 persona seleccionada */}
          {hasNoSelectedPersons ? (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-lg border border-accent-danger/40 bg-accent-danger/10 p-2.5 text-xs text-accent-danger"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Debes seleccionar al menos un participante para dividir el gasto.</span>
            </div>
          ) : (
            <div className="space-y-2 pt-1">
              {splits.map((split) => {
                const person = persons.find((p) => p.id === split.person_id);
                if (!person) return null;

                return (
                  <div
                    key={split.person_id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border-subtle bg-surface/60 p-2.5 transition-colors hover:border-border-subtle/80 flex-wrap sm:flex-nowrap"
                  >
                    <PersonChip
                      name={person.name}
                      colorHex={person.color_hex}
                      size="sm"
                      className="truncate"
                    />

                    <div className="flex items-center gap-2 ml-auto">
                      {remainingCents > 0 && (
                        <button
                          type="button"
                          onClick={() => handleAssignRemaining(split.person_id)}
                          className={cn(
                            'inline-flex items-center gap-1 rounded-md border border-accent-clp/30 bg-accent-clp/10 px-2 py-1 text-[11px] font-medium text-accent-clp transition-colors',
                            'hover:bg-accent-clp/20 hover:border-accent-clp/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-clp',
                          )}
                        >
                          <Plus className="h-3 w-3" />
                          <span>Asignar restante</span>
                        </button>
                      )}

                      <div className="relative flex items-center">
                        <span className="pointer-events-none absolute left-2.5 text-xs font-medium text-text-muted">
                          {currency === 'CLP' ? '$' : 'US$'}
                        </span>
                        <input
                          type="text"
                          inputMode="decimal"
                          aria-label={`Monto para ${person.name}`}
                          value={split.fixed_amount ?? ''}
                          onChange={(e) =>
                            handleFixedAmountChange(split.person_id, e.target.value)
                          }
                          placeholder="0"
                          className={cn(
                            'h-8 w-28 rounded-md border border-border-subtle bg-elevated text-right text-xs font-semibold text-text-primary placeholder:text-text-muted/50',
                            currency === 'CLP' ? 'pl-6 pr-2.5' : 'pl-9 pr-2.5',
                            'focus:border-accent-clp focus:outline-none focus:ring-1 focus:ring-accent-clp transition-all',
                          )}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {error && <p className="text-xs text-accent-danger">{error}</p>}
    </div>
  );
}
