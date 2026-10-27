import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { getDashboardSummary, getDashboardProjection } from '@/services/dashboard.service';
import { listExpenses } from '@/services/expenses.service';
import { listCards } from '@/services/cards.service';
import { listPersons } from '@/services/persons.service';

const EXPENSES_STALE_TIME = 30 * 1000; // 30s
const DASHBOARD_STALE_TIME = 30 * 1000; // 30s
const CATALOGS_STALE_TIME = 5 * 60 * 1000; // 5m

/**
 * Precarga de forma proactiva y segura las consultas en TanStack Query
 * requeridas para el segmento de ruta destino (`href`).
 *
 * Se ejecuta ante eventos de interacción temprana (`onTouchStart` y `onMouseEnter`)
 * en los elementos de navegación para que los datos estén frescos en memoria
 * al momento del clic, eliminando tiempos de espera pasivos.
 */
export async function prefetchNavigationTarget(
  href: string,
  queryClient: QueryClient,
): Promise<void> {
  if (!href || !href.startsWith('/')) {
    return;
  }

  // Normalizar separando query params y hashes
  const pathname = href.split('?')[0].split('#')[0];

  try {
    switch (pathname) {
      case '/':
        await Promise.allSettled([
          queryClient.prefetchQuery({
            queryKey: queryKeys.dashboard.summary(),
            queryFn: () => getDashboardSummary(),
            staleTime: DASHBOARD_STALE_TIME,
          }),
          queryClient.prefetchQuery({
            queryKey: queryKeys.dashboard.projection({ months: 6 }),
            queryFn: () => getDashboardProjection({ months: 6 }),
            staleTime: DASHBOARD_STALE_TIME,
          }),
          queryClient.prefetchQuery({
            queryKey: queryKeys.cards.list(),
            queryFn: () => listCards(),
            staleTime: CATALOGS_STALE_TIME,
          }),
          queryClient.prefetchQuery({
            queryKey: queryKeys.persons.list(),
            queryFn: () => listPersons(),
            staleTime: CATALOGS_STALE_TIME,
          }),
        ]);
        break;

      case '/expenses':
        await Promise.allSettled([
          queryClient.prefetchQuery({
            queryKey: queryKeys.expenses.list({}),
            queryFn: () => listExpenses({}),
            staleTime: EXPENSES_STALE_TIME,
          }),
          queryClient.prefetchQuery({
            queryKey: queryKeys.cards.list(),
            queryFn: () => listCards(),
            staleTime: CATALOGS_STALE_TIME,
          }),
          queryClient.prefetchQuery({
            queryKey: queryKeys.persons.list(),
            queryFn: () => listPersons(),
            staleTime: CATALOGS_STALE_TIME,
          }),
        ]);
        break;

      case '/cards':
        await queryClient.prefetchQuery({
          queryKey: queryKeys.cards.list({}),
          queryFn: () => listCards({}),
          staleTime: CATALOGS_STALE_TIME,
        });
        break;

      case '/persons':
        await queryClient.prefetchQuery({
          queryKey: queryKeys.persons.list({}),
          queryFn: () => listPersons({}),
          staleTime: CATALOGS_STALE_TIME,
        });
        break;

      default:
        // Rutas no configuradas o no críticas no disparan prefetching
        break;
    }
  } catch {
    // Falla silenciosa: la precarga es una optimización no bloqueante
  }
}
