import React, { Suspense } from 'react';
import { ExpensesView } from '@/features/expenses/expenses-view';

/**
 * Fallback de carga estructurado que mantiene la geometría visual de la barra de filtros
 * y las fichas de compra mientras se inicializan los parámetros de búsqueda de la URL.
 */
function ExpensesLoadingFallback() {
  return (
    <div
      className="space-y-6"
      aria-busy="true"
      aria-label="Cargando compras y cuotas"
    >
      {/* Skeleton de la barra de filtros */}
      <div className="h-28 w-full rounded-xl border border-border-subtle bg-surface/50 p-4 animate-pulse" />

      {/* Skeletons de las fichas de compra */}
      <div className="space-y-3">
        <div className="h-32 rounded-xl border border-border-subtle bg-surface p-4 animate-pulse" />
        <div className="h-32 rounded-xl border border-border-subtle bg-surface p-4 animate-pulse" />
        <div className="h-32 rounded-xl border border-border-subtle bg-surface p-4 animate-pulse" />
      </div>
    </div>
  );
}

/**
 * Página principal de Compras y Cuotas (/expenses) (Spec 005 T9).
 * Envuelve ExpensesView dentro de un límite <Suspense> para compatibilidad total
 * con useSearchParams() en Next.js 15 App Router sin desoptimizar el renderizado.
 */
export default function ExpensesPage() {
  return (
    <div className="space-y-6">
      {/* Cabecera descriptiva de la vista */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-text-primary">
          Compras y Cuotas
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          Explora el historial auditable de tus transacciones, proyecciones de cuotas y desgloses por participante.
        </p>
      </div>

      {/* Límite de Suspense para parámetros de búsqueda en Next.js 15 App Router */}
      <Suspense fallback={<ExpensesLoadingFallback />}>
        <ExpensesView />
      </Suspense>
    </div>
  );
}
