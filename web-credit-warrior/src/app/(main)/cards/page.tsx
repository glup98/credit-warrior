import React, { Suspense } from 'react';
import { CreditCard } from 'lucide-react';
import { CardsView } from '@/features/cards/cards-view';

export default function CardsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-border-subtle bg-surface/30 p-8 text-center animate-pulse">
          <CreditCard className="mb-3 h-10 w-10 text-text-muted/40" />
          <p className="text-sm text-text-muted">Cargando tarjetas de crédito...</p>
        </div>
      }
    >
      <CardsView />
    </Suspense>
  );
}
