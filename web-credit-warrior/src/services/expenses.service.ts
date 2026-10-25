import { apiClient } from './api-client';
import type {
  ExpenseCreate,
  ExpenseUpdate,
  ExpenseRead,
  ExpenseFilters,
  ExpenseScheduleResponse,
} from '@/types/api.types';

/**
 * Retrieves list of expenses with optional card, person, and date range filters.
 */
export async function listExpenses(filters?: ExpenseFilters): Promise<ExpenseRead[]> {
  return apiClient.get<ExpenseRead[]>('/api/v1/expenses', filters as Record<string, unknown>);
}

/**
 * Retrieves a single expense by unique identifier.
 */
export async function getExpense(id: string): Promise<ExpenseRead> {
  return apiClient.get<ExpenseRead>(`/api/v1/expenses/${id}`);
}

/**
 * Creates a new expense along with its splits.
 */
export async function createExpense(data: ExpenseCreate): Promise<ExpenseRead> {
  return apiClient.post<ExpenseRead>('/api/v1/expenses', data);
}

/**
 * Fully updates an existing expense and replaces its splits.
 */
export async function updateExpense(id: string, data: ExpenseUpdate): Promise<ExpenseRead> {
  return apiClient.put<ExpenseRead>(`/api/v1/expenses/${id}`, data);
}

/**
 * Deletes an expense. Returns 204 No Content.
 */
export async function deleteExpense(id: string): Promise<void> {
  return apiClient.delete<void>(`/api/v1/expenses/${id}`);
}

/**
 * Retrieves installment billing projection schedule for a single expense.
 */
export async function getExpenseSchedule(id: string): Promise<ExpenseScheduleResponse> {
  return apiClient.get<ExpenseScheduleResponse>(`/api/v1/expenses/${id}/schedule`);
}

export const expensesService = {
  list: listExpenses,
  getById: getExpense,
  create: createExpense,
  update: updateExpense,
  remove: deleteExpense,
  getSchedule: getExpenseSchedule,
};
