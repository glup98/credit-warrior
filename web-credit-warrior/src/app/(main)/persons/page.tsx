import React, { Suspense } from 'react';
import { Users } from 'lucide-react';
import { PersonsView } from '@/features/persons/persons-view';

export default function PersonsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-border-subtle bg-surface/30 p-8 text-center animate-pulse">
          <Users className="mb-3 h-10 w-10 text-text-muted/40" />
          <p className="text-sm text-text-muted">Cargando participantes...</p>
        </div>
      }
    >
      <PersonsView />
    </Suspense>
  );
}
