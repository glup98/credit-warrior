import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { prefetchNavigationTarget } from './prefetch';
import { queryKeys } from '@/lib/query-keys';
import * as cardsService from '@/services/cards.service';

vi.mock('@/services/dashboard.service', () => ({
  getDashboardSummary: vi.fn().mockResolvedValue({}),
  getDashboardProjection: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/services/expenses.service', () => ({
  listExpenses: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/services/cards.service', () => ({
  listCards: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/services/persons.service', () => ({
  listPersons: vi.fn().mockResolvedValue([]),
}));

describe('prefetchNavigationTarget (Spec 007 T1)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.spyOn(queryClient, 'prefetchQuery');
  });

  it('precarga todas las consultas requeridas para la ruta raíz "/" (Dashboard)', async () => {
    await prefetchNavigationTarget('/', queryClient);

    expect(queryClient.prefetchQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: queryKeys.dashboard.summary(),
      }),
    );
    expect(queryClient.prefetchQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: queryKeys.dashboard.projection({ months: 6 }),
      }),
    );
    expect(queryClient.prefetchQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: queryKeys.cards.list(),
      }),
    );
    expect(queryClient.prefetchQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: queryKeys.persons.list(),
      }),
    );
    expect(queryClient.prefetchQuery).toHaveBeenCalledTimes(4);
  });

  it('precarga consultas para la ruta "/expenses" (Compras)', async () => {
    await prefetchNavigationTarget('/expenses', queryClient);

    expect(queryClient.prefetchQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: queryKeys.expenses.list({}),
      }),
    );
    expect(queryClient.prefetchQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: queryKeys.cards.list(),
      }),
    );
    expect(queryClient.prefetchQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: queryKeys.persons.list(),
      }),
    );
    expect(queryClient.prefetchQuery).toHaveBeenCalledTimes(3);
  });

  it('precarga consultas para la ruta "/cards" (Tarjetas)', async () => {
    await prefetchNavigationTarget('/cards', queryClient);

    expect(queryClient.prefetchQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: queryKeys.cards.list({}),
      }),
    );
    expect(queryClient.prefetchQuery).toHaveBeenCalledTimes(1);
  });

  it('precarga consultas para la ruta "/persons" (Personas)', async () => {
    await prefetchNavigationTarget('/persons', queryClient);

    expect(queryClient.prefetchQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: queryKeys.persons.list({}),
      }),
    );
    expect(queryClient.prefetchQuery).toHaveBeenCalledTimes(1);
  });

  it('normaliza rutas con query parameters (ej. "/expenses?period=2026-11")', async () => {
    await prefetchNavigationTarget('/expenses?period=2026-11', queryClient);

    expect(queryClient.prefetchQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: queryKeys.expenses.list({}),
      }),
    );
    expect(queryClient.prefetchQuery).toHaveBeenCalledTimes(3);
  });

  it('maneja de forma segura rutas no mapeadas o externas sin invocar prefetchQuery', async () => {
    await prefetchNavigationTarget('/unknown-route', queryClient);
    await prefetchNavigationTarget('https://external-bank.com', queryClient);
    await prefetchNavigationTarget('', queryClient);

    expect(queryClient.prefetchQuery).not.toHaveBeenCalled();
  });

  it('captura errores de red de forma silenciosa para no interrumpir el hilo principal', async () => {
    vi.mocked(cardsService.listCards).mockRejectedValueOnce(new Error('Network failure'));

    await expect(prefetchNavigationTarget('/cards', queryClient)).resolves.not.toThrow();
  });
});
