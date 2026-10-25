import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  listExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenseSchedule,
} from '@/services/expenses.service';
import type {
  ExpenseCreate,
  ExpenseUpdate,
  ExpenseRead,
  ExpenseFilters,
  ExpenseScheduleResponse,
} from '@/types/api.types';

const EXPENSES_STALE_TIME = 30 * 1000; // 30 seconds

/**
 * Hook to retrieve filtered list of expenses.
 */
export function useExpenses(filters?: ExpenseFilters) {
  return useQuery<ExpenseRead[]>({
    queryKey: queryKeys.expenses.list(filters),
    queryFn: () => listExpenses(filters),
    staleTime: EXPENSES_STALE_TIME,
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook to retrieve a single expense by id.
 */
export function useExpense(id: string) {
  return useQuery<ExpenseRead>({
    queryKey: queryKeys.expenses.detail(id),
    queryFn: () => getExpense(id),
    enabled: Boolean(id),
    staleTime: EXPENSES_STALE_TIME,
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook to retrieve installment billing schedule for an expense.
 */
export function useExpenseSchedule(id: string) {
  return useQuery<ExpenseScheduleResponse>({
    queryKey: queryKeys.expenses.schedule(id),
    queryFn: () => getExpenseSchedule(id),
    enabled: Boolean(id),
    staleTime: EXPENSES_STALE_TIME,
    refetchOnWindowFocus: true,
  });
}

/**
 * Mutation hook to create an expense and its splits with cascade dashboard invalidation.
 */
export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ExpenseCreate) => createExpense(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

/**
 * Mutation hook to update an expense and replace its splits with cascade dashboard invalidation.
 */
export function useUpdateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ExpenseUpdate }) => updateExpense(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.schedule(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

/**
 * Mutation hook to delete an expense with cascade dashboard invalidation.
 */
export function useDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}
