import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ExpensesPage from './page';
import { QuickExpenseProvider } from '@/features/expenses/context/quick-expense-context';

vi.mock('@/features/expenses/expenses-view', () => ({
  ExpensesView: () => <div data-testid="mock-expenses-view">Mock Expenses View Content</div>,
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <QuickExpenseProvider>{children}</QuickExpenseProvider>
      </QueryClientProvider>
    );
  };
}

describe('ExpensesPage (Spec 005 T9)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza la cabecera semántica con título "Compras y Cuotas" y descripción contextual', () => {
    render(<ExpensesPage />, { wrapper: createWrapper() });

    expect(
      screen.getByRole('heading', { level: 2, name: /compras y cuotas/i }),
    ).toBeInTheDocument();

    expect(
      screen.getByText(/historial auditable de tus transacciones/i),
    ).toBeInTheDocument();
  });

  it('monta ExpensesView dentro de un límite de Suspense para Next.js 15 App Router', () => {
    render(<ExpensesPage />, { wrapper: createWrapper() });

    expect(screen.getByTestId('mock-expenses-view')).toBeInTheDocument();
  });
});
