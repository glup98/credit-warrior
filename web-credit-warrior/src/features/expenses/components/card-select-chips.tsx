'use client';

import * as React from 'react';
import Link from 'next/link';
import { CreditCard, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCards } from '@/hooks/queries/use-cards';
import { CurrencyBadge } from '@/components/shared/currency-badge';
import { formatMaskedCard } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { CardRead, CurrencyEnum } from '@/types/api.types';

export interface CardSelectChipsProps {
  value?: string;
  onChange: (cardId: string, card: CardRead) => void;
  hasEnteredAmount?: boolean;
  onResetAmounts?: () => void;
  onCurrencyChange?: (newCurrency: CurrencyEnum, previousCurrency: CurrencyEnum) => void;
  className?: string;
  error?: boolean;
  errorMessage?: string;
}

/**
 * Selector horizontal táctil de tarjetas activas con máscara, badge de divisa y
 * detección de cambio de moneda con reseteo preventivo de montos.
 */
export function CardSelectChips({
  value,
  onChange,
  hasEnteredAmount = false,
  onResetAmounts,
  onCurrencyChange,
  className,
  error,
  errorMessage,
}: CardSelectChipsProps) {
  const { data: cards = [], isLoading, isError } = useCards({ is_active: true });

  // Preselección automática si existe una única tarjeta activa registrada y ninguna seleccionada
  React.useEffect(() => {
    if (cards.length === 1 && !value) {
      onChange(cards[0].id, cards[0]);
    }
  }, [cards, value, onChange]);

  const handleSelectCard = (selectedCard: CardRead) => {
    if (selectedCard.id === value) return;

    const currentCard = cards.find((c) => c.id === value);
    if (currentCard && currentCard.currency !== selectedCard.currency) {
      onCurrencyChange?.(selectedCard.currency, currentCard.currency);
      if (hasEnteredAmount) {
        onResetAmounts?.();
        toast.info(
          `Moneda cambiada a ${selectedCard.currency}: se restablecieron los montos para evitar discrepancias de escala`,
        );
      }
    }

    onChange(selectedCard.id, selectedCard);
  };

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
        <span>Cargando tarjetas disponibles...</span>
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
        <span>Error al cargar tarjetas de crédito activas. Comprueba tu conexión.</span>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div
        role="alert"
        className={cn(
          'flex flex-col gap-3 rounded-xl border border-accent-usd/30 bg-surface/50 p-4 text-sm sm:flex-row sm:items-center sm:justify-between',
          className,
        )}
      >
        <div className="flex items-start gap-3">
          <CreditCard className="h-5 w-5 shrink-0 text-accent-usd mt-0.5" />
          <div className="space-y-0.5">
            <h4 className="font-semibold text-text-primary">Sin tarjetas activas</h4>
            <p className="text-xs text-text-muted">
              Debes registrar o activar una tarjeta de crédito para registrar compras.
            </p>
          </div>
        </div>
        <Link
          href="/cards"
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border-subtle bg-elevated px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-surface hover:text-accent-clp sm:self-center"
        >
          <span>Ir a Tarjetas</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div
        role="radiogroup"
        aria-label="Seleccionar tarjeta de crédito"
        className="flex flex-wrap items-center gap-2.5"
      >
        {cards.map((card) => {
          const isSelected = card.id === value;
          const isClp = card.currency === 'CLP';

          return (
            <button
              key={card.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`${card.name} ${card.currency}`}
              onClick={() => handleSelectCard(card)}
              className={cn(
                'group relative flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left text-sm transition-all',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-clp focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
                isSelected
                  ? isClp
                    ? 'border-accent-clp bg-accent-clp/15 text-text-primary ring-1 ring-accent-clp shadow-sm'
                    : 'border-accent-usd bg-accent-usd/15 text-text-primary ring-1 ring-accent-usd shadow-sm'
                  : 'border-border-subtle bg-elevated/70 text-text-muted hover:border-border-subtle/80 hover:bg-elevated hover:text-text-primary',
                error && !isSelected && 'border-accent-danger/60',
              )}
            >
              <CreditCard
                className={cn(
                  'h-4 w-4 shrink-0 transition-colors',
                  isSelected
                    ? isClp
                      ? 'text-accent-clp'
                      : 'text-accent-usd'
                    : 'text-text-muted/60 group-hover:text-text-muted',
                )}
              />

              <div className="flex flex-col">
                <span className="font-medium text-text-primary leading-tight">
                  {card.name}
                </span>
                {card.last_four_digits && (
                  <span className="font-mono text-[11px] text-text-muted">
                    {formatMaskedCard(card.last_four_digits)}
                  </span>
                )}
              </div>

              <CurrencyBadge currency={card.currency} className="ml-1 scale-90" />
            </button>
          );
        })}
      </div>

      {errorMessage && (
        <p className="text-xs text-accent-danger">{errorMessage}</p>
      )}
    </div>
  );
}
