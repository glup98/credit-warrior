import React from 'react';
import { ShieldCheck, Receipt, Coins, Calculator, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface WelcomeStepProps {
  onNext: () => void;
}

const VALUE_PILLARS = [
  {
    icon: Receipt,
    title: 'Compras en cuotas transparentes',
    description:
      'Cada compra se divide automáticamente mes a mes en el estado de cuenta que corresponde sin descuadres.',
  },
  {
    icon: Coins,
    title: 'Soporte multimoneda nativo',
    description:
      'Control segregado para gastos en Pesos Chilenos (CLP) y Dólares (USD) con total claridad.',
  },
  {
    icon: Calculator,
    title: 'Cero cálculos manuales',
    description:
      'El motor financiero calcula con precisión centesimal cuánto debe transferir cada participante cada mes.',
  },
];

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center text-center">
      {/* Isotipo y Marca */}
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-border-subtle bg-surface text-accent-clp shadow-xl">
        <ShieldCheck className="h-9 w-9 text-accent-clp" />
      </div>

      <h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
        Tus tarjetas compartidas, sin enredos de cuentas
      </h1>
      <p className="mt-3 text-sm text-text-muted leading-relaxed max-w-md">
        Bienvenido a Credit Warrior. Configura tu primera tarjeta de crédito y los participantes para comenzar a tener control absoluto.
      </p>

      {/* 3 Pilares de Valor */}
      <div className="mt-8 w-full space-y-4 text-left">
        {VALUE_PILLARS.map((pillar) => {
          const Icon = pillar.icon;
          return (
            <div
              key={pillar.title}
              className="flex items-start gap-4 rounded-xl border border-border-subtle bg-surface/70 p-4 transition-colors hover:bg-surface"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-elevated text-accent-clp">
                <Icon className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-text-primary">
                  {pillar.title}
                </h2>
                <p className="text-xs text-text-muted leading-relaxed">
                  {pillar.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Botón CTA */}
      <div className="mt-8 w-full">
        <Button
          type="button"
          onClick={onNext}
          className="w-full justify-center gap-2 bg-accent-clp py-5 text-base font-semibold text-canvas hover:brightness-110 active:scale-[0.98] transition-all shadow-lg"
        >
          <span>Comenzar configuración</span>
          <ArrowRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
