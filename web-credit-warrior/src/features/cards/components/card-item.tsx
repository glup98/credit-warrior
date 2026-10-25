'use client';

import * as React from 'react';
import {
  MoreVertical,
  Pencil,
  Archive,
  ArchiveRestore,
  Trash2,
  Calendar,
  Receipt,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatMaskedCard, formatCurrency } from '@/lib/formatters';
import { CurrencyBadge } from '@/components/shared/currency-badge';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useUpdateCard } from '@/hooks/queries/use-cards';
import type { CardRead } from '@/types/api.types';

export interface CardItemProps {
  card: CardRead;
  onEdit?: (card: CardRead) => void;
  onDelete?: (card: CardRead) => void;
  onManageFees?: (card: CardRead) => void;
  className?: string;
}

/**
 * Ficha visual de tarjeta de crédito con metadatos de ciclo, tarifa base de mantención y menú contextual de acciones.
 */
export function CardItem({
  card,
  onEdit,
  onDelete,
  onManageFees,
  className,
}: CardItemProps) {
  const updateCardMutation = useUpdateCard();
  const maskedDigits = formatMaskedCard(card.last_four_digits);

  const feeValue = card.default_monthly_fee ?? '0';
  const hasFee = Boolean(feeValue && Number(feeValue) > 0);
  const formattedFee = `${formatCurrency(feeValue, card.currency)}/mes`;

  const handleToggleActive = async () => {
    const nextActive = !card.is_active;
    try {
      await updateCardMutation.mutateAsync({
        id: card.id,
        data: { is_active: nextActive },
      });
      toast.success(
        nextActive ? 'Tarjeta reactivada exitosamente' : 'Tarjeta archivada exitosamente',
      );
    } catch {
      toast.error('No se pudo actualizar el estado de la tarjeta');
    }
  };

  return (
    <article
      className={cn(
        'group relative flex flex-col justify-between rounded-xl border border-border-subtle bg-surface p-4 sm:p-5 shadow-sm transition-all hover:border-border-subtle/80 hover:bg-surface/90',
        !card.is_active && 'opacity-75 bg-canvas/60',
        className,
      )}
      aria-label={`Tarjeta ${card.name}`}
    >
      {/* Cabecera de la tarjeta: Nombre, máscara, divisas y menú de acciones */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="truncate text-base font-semibold text-text-primary">
              {card.name}
            </h3>
            <CurrencyBadge currency={card.currency} />
            <Badge
              variant={card.is_active ? 'default' : 'secondary'}
              className={cn(
                'text-[10px] font-medium tracking-wide uppercase',
                card.is_active
                  ? 'border-accent-clp/30 bg-accent-clp/15 text-accent-clp'
                  : 'border-border-subtle bg-canvas text-text-muted',
              )}
            >
              {card.is_active ? 'Activa' : 'Archivada'}
            </Badge>
          </div>

          {maskedDigits ? (
            <p className="font-mono text-xs text-text-muted tracking-wider">
              {maskedDigits}
            </p>
          ) : null}
        </div>

        {/* Menú de acciones contextuales */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-elevated hover:text-text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-clp"
              aria-label={`Acciones para ${card.name}`}
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit?.(card)}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => onManageFees?.(card)}>
              <Receipt className="mr-2 h-4 w-4" />
              Gestionar mantención
            </DropdownMenuItem>

            <DropdownMenuItem onClick={handleToggleActive}>
              {card.is_active ? (
                <>
                  <Archive className="mr-2 h-4 w-4" />
                  Archivar
                </>
              ) : (
                <>
                  <ArchiveRestore className="mr-2 h-4 w-4" />
                  Reactivar
                </>
              )}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDelete?.(card)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Metadatos de facturación y mantención mensual base */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle/50 pt-3 text-xs text-text-muted">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-text-muted/70" />
            <span>Cierre: día {card.closing_day}</span>
          </div>
          <div className="h-3 w-px bg-border-subtle" />
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-text-muted/70" />
            <span>Vencimiento: día {card.due_day}</span>
          </div>
        </div>

        <div
          className={cn(
            'flex items-center gap-1.5 font-medium tabular-nums font-mono',
            hasFee ? 'text-text-primary' : 'text-text-muted',
          )}
          title="Mantención mensual base"
        >
          <Receipt className="h-3.5 w-3.5 text-text-muted/70" />
          <span>{formattedFee}</span>
        </div>
      </div>
    </article>
  );
}
