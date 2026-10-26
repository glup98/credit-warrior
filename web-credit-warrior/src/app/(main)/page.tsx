import React, { Suspense } from 'react';
import { DashboardView } from '@/features/dashboard/dashboard-view';
import { DashboardSkeletons } from '@/features/dashboard/components/dashboard-skeletons';

/**
 * Página principal del Dashboard (/ o /?period=YYYY-MM).
 * Envuelve DashboardView dentro de un límite <Suspense> con DashboardSkeletons
 * para garantizar compatibilidad con useSearchParams() en Next.js 15 App Router
 * y prevenir cambios acumulativos de diseño (CLS).
 */
export default function HomePage() {
  return (
    <Suspense fallback={<DashboardSkeletons />}>
      <DashboardView />
    </Suspense>
  );
}
