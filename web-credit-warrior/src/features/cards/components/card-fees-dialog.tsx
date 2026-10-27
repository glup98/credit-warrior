'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useCardFees, useSetCardFee, useDeleteCardFee } from '@/hooks/queries/use-cards';
import { formatCurrency, formatPeriod } from '@/lib/formatters';
import { integerStringRegex, decimalStringRegex } from '@/schemas/card.schema';
import { toast } from 'sonner';
import {
  CreditCard,
  Calendar,
  Trash2,
  Loader2,
  Info,
  Plus,
  Coins,
} from 'lucide-react';
import type { CardRead } from '@/types/api.types';
import { cn } from '@/lib/utils';

export interface CardFeesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: CardRead | null;
}

function getDefaultPeriod(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function CardFeesDialog({
  open,
  onOpenChange,
  card,
}: CardFeesDialogProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)', true);
  const cardId = card?.id ?? '';

  const { data: fees = [], isLoading } = useCardFees(cardId);
  const setCardFeeMutation = useSetCardFee();
  const deleteCardFeeMutation = useDeleteCardFee();

  const [period, setPeriod] = React.useState<string>(getDefaultPeriod);
  const [fee, setFee] = React.useState<string>('0');
  const [feeError, setFeeError] = React.useState<string | null>(null);

  // Sincronizar estado inicial al abrir
  React.useEffect(() => {
    if (open) {
      setPeriod(getDefaultPeriod());
      setFee('0');
      setFeeError(null);
    }
  }, [open, cardId]);

  if (!card) return null;

  const currency = card.currency;
  const defaultFeeFormatted = formatCurrency(card.default_monthly_fee ?? '0', currency);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeeError(null);

    const trimmedPeriod = period.trim();
    if (!trimmedPeriod) {
      setFeeError('Debes seleccionar un período válido');
      return;
    }

    const trimmedFee = fee.trim() === '' ? '0' : fee.trim();

    if (currency === 'CLP') {
      if (!integerStringRegex.test(trimmedFee)) {
        setFeeError('Para CLP el monto no debe tener decimales');
        return;
      }
    } else {
      if (!decimalStringRegex.test(trimmedFee)) {
        setFeeError('Para USD ingresa un monto válido con hasta 2 decimales');
        return;
      }
    }

    try {
      await setCardFeeMutation.mutateAsync({
        cardId: card.id,
        period: trimmedPeriod,
        data: { fee: trimmedFee },
      });
      toast.success('Tarifa mensual actualizada');
      setFee('0');
    } catch {
      toast.error('Error al actualizar la tarifa mensual');
    }
  };

  const handleDelete = async (feePeriod: string) => {
    try {
      await deleteCardFeeMutation.mutateAsync({
        cardId: card.id,
        period: feePeriod,
      });
      toast.success('Sobreescritura eliminada, se restauró la tarifa base');
    } catch {
      toast.error('Error al eliminar la tarifa mensual');
    }
  };

  const isSaving = setCardFeeMutation.isPending;
  const isDeleting = deleteCardFeeMutation.isPending;

  const contentBody = (
    <div className="space-y-5 py-1 text-text-primary">
      {/* 1. Banner informativo de Tarifa Base */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-border-subtle bg-elevated/60">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-surface border border-border-subtle shrink-0">
            <Coins className="h-4 w-4 text-accent-clp" />
          </div>
          <div>
            <div className="text-xs font-medium text-text-muted">
              Tarifa base de la tarjeta
            </div>
            <div className="text-sm text-text-muted mt-0.5">
              Costo estándar aplicado a la tarjeta en cada ciclo de facturación.
            </div>
          </div>
        </div>
        <div className="sm:text-right shrink-0">
          <div className="text-lg font-bold font-mono tabular-nums text-text-primary">
            {defaultFeeFormatted}
            <span className="text-xs font-normal text-text-muted">/mes</span>
          </div>
          <Badge variant="outline" className="text-[10px] tracking-wide uppercase mt-0.5">
            Tarifa Base
          </Badge>
        </div>
      </div>

      {/* 2. Formulario compacto para sobreescribir una tarifa */}
      <form
        onSubmit={handleSubmit}
        className="p-3.5 rounded-xl border border-border-subtle bg-surface space-y-3"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
            <Plus className="h-3.5 w-3.5 text-accent-clp" />
            Nueva sobreescritura mensual
          </span>
          <span className="text-[11px] text-text-muted font-mono">{currency}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="card-fee-period" className="text-xs text-text-secondary">
              Mes de facturación
            </Label>
            <div className="relative">
              <Input
                id="card-fee-period"
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                disabled={isSaving}
                className="h-9 text-xs font-mono"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="card-fee-amount" className="text-xs text-text-secondary">
              Tarifa para este mes
            </Label>
            <Input
              id="card-fee-amount"
              type="text"
              inputMode="decimal"
              placeholder={currency === 'CLP' ? '0' : '0.00'}
              value={fee}
              onChange={(e) => {
                setFee(e.target.value);
                setFeeError(null);
              }}
              disabled={isSaving}
              className={cn(
                'h-9 text-xs font-mono tabular-nums',
                feeError && 'border-accent-danger focus-visible:ring-accent-danger',
              )}
            />
          </div>
        </div>

        {feeError && (
          <p className="text-xs text-accent-danger font-medium mt-1">{feeError}</p>
        )}

        <div className="flex justify-end pt-1">
          <Button
            type="submit"
            size="sm"
            disabled={isSaving}
            className="bg-accent-clp text-canvas hover:brightness-110 active:scale-[0.98] transition-all text-xs font-medium h-8 px-3"
          >
            {isSaving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Guardar tarifa
          </Button>
        </div>
      </form>

      {/* 3. Listado de Sobreescrituras */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs font-medium text-text-muted">
          <span>Sobreescrituras registradas</span>
          <span className="font-mono text-[11px]">{fees.length} meses</span>
        </div>

        {/* Skeleton de carga */}
        {isLoading && (
          <div data-testid="fees-skeleton" className="space-y-2 py-2 animate-pulse">
            <div className="h-12 w-full rounded-lg bg-elevated/70" />
            <div className="h-12 w-full rounded-lg bg-elevated/50" />
          </div>
        )}

        {/* Estado vacío neutral */}
        {!isLoading && fees.length === 0 && (
          <div
            data-testid="fees-empty-state"
            className="flex flex-col items-center justify-center p-6 text-center gap-2 rounded-xl border border-dashed border-border-subtle bg-elevated/20"
          >
            <Info className="h-5 w-5 text-text-muted shrink-0" />
            <p className="text-xs font-semibold text-text-primary">
              Sin sobreescrituras registradas
            </p>
            <p className="text-[11px] text-text-muted max-w-xs">
              Se aplicará la tarifa base de la tarjeta en todos los meses. Si en algún período
              el banco cobra una comisión diferente o aplica costo cero por promoción,
              regístrala arriba.
            </p>
          </div>
        )}

        {/* Lista de tarifas */}
        {!isLoading && fees.length > 0 && (
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {fees.map((item) => (
              <div
                key={item.period}
                className="flex items-center justify-between p-2.5 rounded-lg border border-border-subtle bg-elevated/40 hover:bg-elevated/70 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-md bg-surface border border-border-subtle">
                    <Calendar className="h-3.5 w-3.5 text-accent-usd" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-text-primary capitalize">
                      {formatPeriod(item.period, 'full')}
                    </div>
                    <div className="text-[10px] text-text-muted font-mono">
                      {item.period}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    data-testid="fee-override-badge"
                    variant="outline"
                    className="border-accent-warning/30 bg-accent-warning/15 text-accent-warning text-[10px] py-0 px-2 uppercase font-medium tracking-wider"
                  >
                    Sobreescritura
                  </Badge>

                  <div className="text-xs font-bold font-mono tabular-nums text-text-primary px-1">
                    {formatCurrency(item.fee, currency)}
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Eliminar tarifa de ${item.period}`}
                    disabled={isDeleting}
                    onClick={() => handleDelete(item.period)}
                    className="h-7 w-7 text-text-muted hover:text-accent-danger hover:bg-accent-danger/10 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const titleHeader = (
    <>
      <div className="flex items-center gap-2">
        <CreditCard className="h-5 w-5 text-accent-clp" />
        <span>Tarifas Mensuales — {card.name}</span>
      </div>
      <div className="text-xs text-text-muted flex items-center gap-2 mt-1 font-normal">
        {card.last_four_digits && <span>•••• {card.last_four_digits}</span>}
        <span>•</span>
        <span>{currency}</span>
      </div>
    </>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex flex-col text-left">
              {titleHeader}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Configuración y excepciones mensuales de mantención bancaria.
            </DialogDescription>
          </DialogHeader>

          {contentBody}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="px-4 pb-6">
        <DrawerHeader className="text-left px-0">
          <DrawerTitle className="flex flex-col">
            {titleHeader}
          </DrawerTitle>
          <DrawerDescription className="sr-only">
            Configuración y excepciones mensuales de mantención bancaria.
          </DrawerDescription>
        </DrawerHeader>

        <div className="max-h-[75vh] overflow-y-auto px-1">
          {contentBody}
        </div>

        <DrawerFooter className="px-0 pt-4">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            Cerrar
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
