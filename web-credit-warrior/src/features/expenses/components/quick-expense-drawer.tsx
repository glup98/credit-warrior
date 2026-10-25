'use client';

import * as React from 'react';
import { Receipt } from 'lucide-react';
import { useQuickExpense } from '../context/quick-expense-context';
import { useMediaQuery } from '@/hooks/use-media-query';
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
import { QuickExpenseForm, type FormExpenseValues } from './quick-expense-form';
import { cn } from '@/lib/utils';

export interface QuickExpenseDrawerProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  defaultValues?: Partial<FormExpenseValues>;
}

/**
 * Contenedor modal adaptativo para el registro ultra-rápido de gastos.
 * - En escritorio (>= 768px): Renderiza un Dialog centrado con backdrop blur.
 * - En móvil (< 768px): Renderiza un Drawer táctil (Vaul) de arrastre hacia abajo.
 * - Protección Anti Cierre Accidental: Si el formulario contiene datos (isDirty),
 *   deshabilita el cierre por toque exterior (dismissible={false} en Vaul y preventDefault
 *   en Dialog), forzando el uso explícito del botón "Cancelar".
 * - Resiliencia ante Fallos de Red: Si la mutación falla, el modal permanece abierto
 *   y preserva los valores ingresados para permitir reintentar de inmediato.
 */
export function QuickExpenseDrawer({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  className,
  defaultValues,
}: QuickExpenseDrawerProps) {
  const context = useQuickExpense();
  const isDesktop = useMediaQuery('(min-width: 768px)', true);
  const [isDirty, setIsDirty] = React.useState(false);

  const isOpen = controlledOpen !== undefined ? controlledOpen : context.isOpen;

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen && isDirty) {
        return;
      }
      if (!nextOpen) {
        setIsDirty(false);
      }
      if (controlledOnOpenChange) {
        controlledOnOpenChange(nextOpen);
      } else {
        context.setIsOpen(nextOpen);
      }
    },
    [isDirty, controlledOnOpenChange, context],
  );

  const handleSuccess = React.useCallback(() => {
    setIsDirty(false);
    if (controlledOnOpenChange) {
      controlledOnOpenChange(false);
    } else {
      context.close();
    }
  }, [controlledOnOpenChange, context]);

  const handleCancel = React.useCallback(() => {
    setIsDirty(false);
    if (controlledOnOpenChange) {
      controlledOnOpenChange(false);
    } else {
      context.close();
    }
  }, [controlledOnOpenChange, context]);

  // Si el modal se cierra por cualquier razón externa, reseteamos isDirty
  React.useEffect(() => {
    if (!isOpen) {
      setIsDirty(false);
    }
  }, [isOpen]);

  const formElement = (
    <QuickExpenseForm
      onSuccess={handleSuccess}
      onCancel={handleCancel}
      onDirtyChange={setIsDirty}
      defaultValues={defaultValues}
    />
  );

  if (isDesktop) {
    return (
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent
          onPointerDownOutside={(e) => {
            if (isDirty) {
              e.preventDefault();
            }
          }}
          onEscapeKeyDown={(e) => {
            if (isDirty) {
              e.preventDefault();
            }
          }}
          className={cn(
            'max-w-lg max-h-[90dvh] overflow-y-auto border border-border-subtle bg-surface shadow-2xl sm:rounded-2xl p-6',
            className,
          )}
        >
          <DialogHeader className="space-y-1.5 pb-2 text-left">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-text-primary">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-clp/15 text-accent-clp">
                <Receipt className="h-4 w-4" />
              </span>
              <span>Registrar gasto</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-text-muted">
              Ingresa una nueva compra y asigna el reparto entre los participantes.
            </DialogDescription>
          </DialogHeader>

          <div className="pt-1">{formElement}</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer
      open={isOpen}
      onOpenChange={handleOpenChange}
      dismissible={!isDirty}
    >
      <DrawerContent
        className={cn(
          'max-h-[92dvh] overflow-y-auto px-4 pb-6 border-t border-border-subtle bg-surface',
          className,
        )}
      >
        <DrawerHeader className="px-0 pt-2 pb-3 text-left">
          <DrawerTitle className="flex items-center gap-2 text-lg font-bold text-text-primary">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-clp/15 text-accent-clp">
              <Receipt className="h-4 w-4" />
            </span>
            <span>Registrar gasto</span>
          </DrawerTitle>
          <DrawerDescription className="text-xs text-text-muted">
            Ingresa una nueva compra y asigna el reparto entre los participantes.
          </DrawerDescription>
        </DrawerHeader>

        <div className="pt-1">{formElement}</div>
      </DrawerContent>
    </Drawer>
  );
}
