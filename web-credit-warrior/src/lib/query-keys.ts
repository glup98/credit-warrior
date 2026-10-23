import type {
  CardFilters,
  PersonFilters,
  ExpenseFilters,
  DashboardProjectionParams,
} from '@/types/api.types';

/**
 * Centralized hierarchical Query Key Factory for TanStack Query.
 * Ensures deterministic query caching and coordinated cascade invalidations.
 */
export const queryKeys = {
  health: ['health'] as const,
  cards: {
    all: ['cards'] as const,
    list: (filters?: CardFilters) => [...queryKeys.cards.all, 'list', filters ?? {}] as const,
    detail: (id: string) => [...queryKeys.cards.all, 'detail', id] as const,
    fees: (cardId: string) => [...queryKeys.cards.detail(cardId), 'fees'] as const,
    feeDetail: (cardId: string, period: string) =>
      [...queryKeys.cards.fees(cardId), period] as const,
  },
  persons: {
    all: ['persons'] as const,
    list: (filters?: PersonFilters) => [...queryKeys.persons.all, 'list', filters ?? {}] as const,
    detail: (id: string) => [...queryKeys.persons.all, 'detail', id] as const,
  },
  expenses: {
    all: ['expenses'] as const,
    list: (filters?: ExpenseFilters) => [...queryKeys.expenses.all, 'list', filters ?? {}] as const,
    detail: (id: string) => [...queryKeys.expenses.all, 'detail', id] as const,
    schedule: (id: string) => [...queryKeys.expenses.all, 'schedule', id] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
    summary: (period?: string) =>
      [...queryKeys.dashboard.all, 'summary', period ?? 'next'] as const,
    projection: (params?: DashboardProjectionParams) =>
      [...queryKeys.dashboard.all, 'projection', params ?? { months: 6 }] as const,
  },
};
