import React from 'react';

/**
 * Segmento de carga nativo de Next.js 15 App Router para el grupo de rutas (main).
 * Provee un límite de <Suspense> instantáneo durante las transiciones de página,
 * sustituyendo inmediatamente la pantalla anterior y eliminando cualquier
 * sensación de interfaz congelada o latencia perceptual.
 */
export default function Loading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Cargando contenido..."
      className="flex flex-col gap-6 w-full max-w-6xl mx-auto"
    >
      <span className="sr-only">Cargando sección...</span>

      {/* 1. Skeleton de Cabecera / Título */}
      <div data-testid="loading-header" className="space-y-2 animate-pulse">
        <div className="h-8 w-48 rounded-md bg-elevated/80" />
        <div className="h-4 w-72 rounded-md bg-elevated/50" />
      </div>

      {/* 2. Grid de Métricas / Tarjetas KPI */}
      <div
        data-testid="loading-kpi-grid"
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        <div
          data-testid="loading-kpi-card"
          className="p-5 rounded-xl bg-surface border border-border-subtle flex flex-col gap-3 animate-pulse"
        >
          <div className="flex justify-between items-center">
            <div className="w-28 h-4 rounded bg-elevated/70" />
            <div className="w-10 h-5 rounded bg-elevated/70" />
          </div>
          <div className="w-36 h-8 rounded bg-elevated/80" />
          <div className="w-24 h-3.5 rounded bg-elevated/60" />
        </div>

        <div
          data-testid="loading-kpi-card"
          className="p-5 rounded-xl bg-surface border border-border-subtle flex flex-col gap-3 animate-pulse"
        >
          <div className="flex justify-between items-center">
            <div className="w-28 h-4 rounded bg-elevated/70" />
            <div className="w-10 h-5 rounded bg-elevated/70" />
          </div>
          <div className="w-36 h-8 rounded bg-elevated/80" />
          <div className="w-24 h-3.5 rounded bg-elevated/60" />
        </div>
      </div>

      {/* 3. Bloque Principal de Contenido Estructurado */}
      <div
        data-testid="loading-content-block"
        className="h-64 w-full rounded-xl bg-surface border border-border-subtle p-6 flex flex-col gap-4 animate-pulse"
      >
        <div className="w-48 h-5 rounded bg-elevated/70" />
        <div className="flex-1 rounded-lg bg-elevated/40" />
      </div>
    </div>
  );
}
