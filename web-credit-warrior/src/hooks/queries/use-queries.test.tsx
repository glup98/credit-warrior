import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  useCards,
  useCard,
  useCreateCard,
  useUpdateCard,
  useDeleteCard,
} from './use-cards';
import {
  usePersons,
  usePerson,
  useCreatePerson,
  useUpdatePerson,
  useDeletePerson,
} from './use-persons';
import {
  useExpenses,
  useExpense,
  useExpenseSchedule,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
} from './use-expenses';
import {
  useDashboardSummary,
  useDashboardProjection,
} from './use-dashboard';
import { useHealthCheck } from './use-health';
import * as cardsService from '@/services/cards.service';
import * as personsService from '@/services/persons.service';
import * as expensesService from '@/services/expenses.service';
import * as dashboardService from '@/services/dashboard.service';
import * as healthService from '@/services/health.service';
import type {
  CardRead,
  PersonRead,
  ExpenseRead,
  ExpenseScheduleResponse,
  DashboardSummaryResponse,
  DashboardProjectionResponse,
  HealthResponse,
} from '@/types/api.types';

vi.mock('@/services/cards.service');
vi.mock('@/services/persons.service');
vi.mock('@/services/expenses.service');
vi.mock('@/services/dashboard.service');
vi.mock('@/services/health.service');

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

function createWrapper(queryClient: QueryClient) {
  return function QueryWrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe('Query Keys Factory', () => {
  it('generates consistent, deterministic hierarchical keys', () => {
    expect(queryKeys.health).toEqual(['health']);
    expect(queryKeys.cards.all).toEqual(['cards']);
    expect(queryKeys.cards.list()).toEqual(['cards', 'list', {}]);
    expect(queryKeys.cards.list({ is_active: true })).toEqual(['cards', 'list', { is_active: true }]);
    expect(queryKeys.cards.detail('card-1')).toEqual(['cards', 'detail', 'card-1']);

    expect(queryKeys.persons.all).toEqual(['persons']);
    expect(queryKeys.persons.list()).toEqual(['persons', 'list', {}]);
    expect(queryKeys.persons.detail('p-1')).toEqual(['persons', 'detail', 'p-1']);

    expect(queryKeys.expenses.all).toEqual(['expenses']);
    expect(queryKeys.expenses.list()).toEqual(['expenses', 'list', {}]);
    expect(queryKeys.expenses.list({ card_id: 'card-1' })).toEqual(['expenses', 'list', { card_id: 'card-1' }]);
    expect(queryKeys.expenses.detail('exp-1')).toEqual(['expenses', 'detail', 'exp-1']);
    expect(queryKeys.expenses.schedule('exp-1')).toEqual(['expenses', 'schedule', 'exp-1']);

    expect(queryKeys.dashboard.all).toEqual(['dashboard']);
    expect(queryKeys.dashboard.summary()).toEqual(['dashboard', 'summary', 'next']);
    expect(queryKeys.dashboard.summary('2026-11')).toEqual(['dashboard', 'summary', '2026-11']);
    expect(queryKeys.dashboard.projection()).toEqual(['dashboard', 'projection', { months: 6 }]);
    expect(queryKeys.dashboard.projection({ months: 12 })).toEqual(['dashboard', 'projection', { months: 12 }]);
  });
});

describe('Cards Hooks', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  it('useCards fetches and returns card list', async () => {
    const mockCards: CardRead[] = [
      {
        id: 'card-1',
        name: 'Visa',
        last_four_digits: '1234',
        currency: 'CLP',
        closing_day: 25,
        due_day: 10,
        is_active: true,
        created_at: '2026-10-01T00:00:00Z',
        updated_at: '2026-10-01T00:00:00Z',
      },
    ];
    vi.mocked(cardsService.listCards).mockResolvedValue(mockCards);

    const { result } = renderHook(() => useCards(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockCards);
    expect(cardsService.listCards).toHaveBeenCalledWith(undefined);
  });

  it('useCard fetches single card by id', async () => {
    const mockCard: CardRead = {
      id: 'card-1',
      name: 'Visa',
      last_four_digits: '1234',
      currency: 'CLP',
      closing_day: 25,
      due_day: 10,
      is_active: true,
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    };
    vi.mocked(cardsService.getCard).mockResolvedValue(mockCard);

    const { result } = renderHook(() => useCard('card-1'), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockCard);
  });

  it('useCreateCard invalidates cards and dashboard queries on success', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const newCard: CardRead = {
      id: 'card-2',
      name: 'Mastercard',
      last_four_digits: null,
      currency: 'CLP',
      closing_day: 20,
      due_day: 5,
      is_active: true,
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    };
    vi.mocked(cardsService.createCard).mockResolvedValue(newCard);

    const { result } = renderHook(() => useCreateCard(), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync({
      name: 'Mastercard',
      closing_day: 20,
      due_day: 5,
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.cards.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.dashboard.all });
  });

  it('useUpdateCard invalidates cards, card detail, and dashboard queries on success', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const updatedCard: CardRead = {
      id: 'card-1',
      name: 'Visa Gold',
      last_four_digits: '1234',
      currency: 'CLP',
      closing_day: 25,
      due_day: 10,
      is_active: true,
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    };
    vi.mocked(cardsService.updateCard).mockResolvedValue(updatedCard);

    const { result } = renderHook(() => useUpdateCard(), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync({
      id: 'card-1',
      data: { name: 'Visa Gold' },
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.cards.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.cards.detail('card-1') });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.dashboard.all });
  });

  it('useDeleteCard invalidates cards and dashboard queries on success', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    vi.mocked(cardsService.deleteCard).mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteCard(), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync('card-1');

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.cards.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.dashboard.all });
  });
});

describe('Persons Hooks', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  it('usePersons fetches and returns person list', async () => {
    const mockPersons: PersonRead[] = [
      {
        id: 'p-1',
        name: 'Anyi',
        color_hex: '#10B981',
        is_active: true,
        created_at: '2026-10-01T00:00:00Z',
        updated_at: '2026-10-01T00:00:00Z',
      },
    ];
    vi.mocked(personsService.listPersons).mockResolvedValue(mockPersons);

    const { result } = renderHook(() => usePersons(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockPersons);
  });

  it('usePerson fetches a single person by id', async () => {
    const mockPerson: PersonRead = {
      id: 'p-1',
      name: 'Anyi',
      color_hex: '#10B981',
      is_active: true,
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    };
    vi.mocked(personsService.getPerson).mockResolvedValue(mockPerson);

    const { result } = renderHook(() => usePerson('p-1'), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockPerson);
  });

  it('useCreatePerson invalidates persons and dashboard on success', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const created: PersonRead = {
      id: 'p-2',
      name: 'Augusto',
      color_hex: null,
      is_active: true,
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    };
    vi.mocked(personsService.createPerson).mockResolvedValue(created);

    const { result } = renderHook(() => useCreatePerson(), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync({ name: 'Augusto' });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.persons.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.dashboard.all });
  });

  it('useUpdatePerson invalidates persons, person detail, and dashboard on success', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const updated: PersonRead = {
      id: 'p-1',
      name: 'Anyi V',
      color_hex: '#10B981',
      is_active: true,
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    };
    vi.mocked(personsService.updatePerson).mockResolvedValue(updated);

    const { result } = renderHook(() => useUpdatePerson(), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync({
      id: 'p-1',
      data: { name: 'Anyi V' },
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.persons.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.persons.detail('p-1') });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.dashboard.all });
  });

  it('useDeletePerson invalidates persons and dashboard on success', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    vi.mocked(personsService.deletePerson).mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeletePerson(), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync('p-1');

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.persons.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.dashboard.all });
  });
});

describe('Expenses Hooks', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  it('useExpenses fetches and returns expenses list', async () => {
    const mockExpenses: ExpenseRead[] = [
      {
        id: 'exp-1',
        card_id: 'card-1',
        description: 'Supermercado',
        total_amount: '50000',
        purchase_date: '2026-10-15',
        installments_count: 1,
        first_billing_override: null,
        notes: null,
        splits: [],
        created_at: '2026-10-15T00:00:00Z',
        updated_at: '2026-10-15T00:00:00Z',
      },
    ];
    vi.mocked(expensesService.listExpenses).mockResolvedValue(mockExpenses);

    const { result } = renderHook(() => useExpenses(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockExpenses);
  });

  it('useExpense fetches a single expense by id', async () => {
    const mockExpense: ExpenseRead = {
      id: 'exp-1',
      card_id: 'card-1',
      description: 'Supermercado',
      total_amount: '50000',
      purchase_date: '2026-10-15',
      installments_count: 1,
      first_billing_override: null,
      notes: null,
      splits: [],
      created_at: '2026-10-15T00:00:00Z',
      updated_at: '2026-10-15T00:00:00Z',
    };
    vi.mocked(expensesService.getExpense).mockResolvedValue(mockExpense);

    const { result } = renderHook(() => useExpense('exp-1'), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockExpense);
  });

  it('useExpenseSchedule fetches installment schedule', async () => {
    const mockSchedule: ExpenseScheduleResponse = {
      expense_id: 'exp-1',
      description: 'Lavadora',
      card_id: 'card-1',
      card_name: 'Visa',
      currency: 'CLP',
      total_amount: '300000',
      installments_count: 3,
      schedule: [],
    };
    vi.mocked(expensesService.getExpenseSchedule).mockResolvedValue(mockSchedule);

    const { result } = renderHook(() => useExpenseSchedule('exp-1'), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockSchedule);
  });

  it('useCreateExpense invalidates expenses and dashboard on success', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const created: ExpenseRead = {
      id: 'exp-2',
      card_id: 'card-1',
      description: 'Cena',
      total_amount: '40000',
      purchase_date: '2026-10-20',
      installments_count: 1,
      first_billing_override: null,
      notes: null,
      splits: [],
      created_at: '2026-10-20T00:00:00Z',
      updated_at: '2026-10-20T00:00:00Z',
    };
    vi.mocked(expensesService.createExpense).mockResolvedValue(created);

    const { result } = renderHook(() => useCreateExpense(), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync({
      card_id: 'card-1',
      description: 'Cena',
      total_amount: '40000',
      purchase_date: '2026-10-20',
      splits: [],
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.expenses.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.dashboard.all });
  });

  it('useUpdateExpense invalidates expenses, detail, schedule and dashboard', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const updated: ExpenseRead = {
      id: 'exp-1',
      card_id: 'card-1',
      description: 'Supermercado Editado',
      total_amount: '60000',
      purchase_date: '2026-10-15',
      installments_count: 1,
      first_billing_override: null,
      notes: null,
      splits: [],
      created_at: '2026-10-15T00:00:00Z',
      updated_at: '2026-10-15T00:00:00Z',
    };
    vi.mocked(expensesService.updateExpense).mockResolvedValue(updated);

    const { result } = renderHook(() => useUpdateExpense(), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync({
      id: 'exp-1',
      data: {
        card_id: 'card-1',
        description: 'Supermercado Editado',
        total_amount: '60000',
        purchase_date: '2026-10-15',
        splits: [],
      },
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.expenses.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.expenses.detail('exp-1') });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.expenses.schedule('exp-1') });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.dashboard.all });
  });

  it('useDeleteExpense invalidates expenses and dashboard on success', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    vi.mocked(expensesService.deleteExpense).mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteExpense(), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync('exp-1');

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.expenses.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.dashboard.all });
  });
});

describe('Dashboard Hooks', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  it('useDashboardSummary fetches dashboard summary', async () => {
    const mockSummary: DashboardSummaryResponse = {
      period: '2026-11',
      totals_by_currency: { CLP: '150000', USD: '0' },
      by_card: [],
      by_person: [],
      active_installments: [],
    };
    vi.mocked(dashboardService.getDashboardSummary).mockResolvedValue(mockSummary);

    const { result } = renderHook(() => useDashboardSummary('2026-11'), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockSummary);
    expect(dashboardService.getDashboardSummary).toHaveBeenCalledWith({ period: '2026-11' });
  });

  it('useDashboardProjection fetches multi-period projections', async () => {
    const mockProjection: DashboardProjectionResponse = {
      start_period: '2026-11',
      months: 6,
      periods: [],
    };
    vi.mocked(dashboardService.getDashboardProjection).mockResolvedValue(mockProjection);

    const { result } = renderHook(() => useDashboardProjection({ months: 6 }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockProjection);
    expect(dashboardService.getDashboardProjection).toHaveBeenCalledWith({ months: 6 });
  });
});

describe('Health Hook', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  it('useHealthCheck queries health endpoint', async () => {
    const mockHealth: HealthResponse = { status: 'healthy' };
    vi.mocked(healthService.checkHealth).mockResolvedValue(mockHealth);

    const { result } = renderHook(() => useHealthCheck(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockHealth);
  });
});
