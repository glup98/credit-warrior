import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BottomNav } from './bottom-nav';
import { DesktopSidebar } from './desktop-sidebar';
import { AppHeader } from './app-header';
import {
  QuickExpenseProvider,
  useQuickExpense,
} from '@/features/expenses/context/quick-expense-context';
import { QuickExpenseDrawer } from '@/features/expenses/components/quick-expense-drawer';
import { useCards } from '@/hooks/queries/use-cards';
import { usePersons } from '@/hooks/queries/use-persons';
import { useCreateExpense } from '@/hooks/queries/use-expenses';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn().mockReturnValue('/'),
  useRouter: vi.fn().mockReturnValue({
    replace: vi.fn(),
    push: vi.fn(),
  }),
}));

vi.mock('@/hooks/queries/use-health', () => ({
  useHealthCheck: vi.fn().mockReturnValue({
    data: { status: 'ok' },
    isLoading: false,
    isError: false,
  }),
}));

vi.mock('@/hooks/queries/use-cards', () => ({
  useCards: vi.fn(),
}));

vi.mock('@/hooks/queries/use-persons', () => ({
  usePersons: vi.fn(),
}));

vi.mock('@/hooks/queries/use-expenses', () => ({
  useCreateExpense: vi.fn(),
}));

function renderWithShell(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <QuickExpenseProvider>
        {ui}
        <QuickExpenseDrawer />
      </QuickExpenseProvider>
    </QueryClientProvider>,
  );
}

// Harness para inspeccionar el estado isOpen del contexto en tests
function ContextStateWatcher() {
  const { isOpen } = useQuickExpense();
  return <div data-testid="context-is-open">{isOpen ? 'open' : 'closed'}</div>;
}

describe('Navigation Triggers Connection (Spec 004 T9)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useCards).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useCards>);

    vi.mocked(usePersons).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof usePersons>);

    vi.mocked(useCreateExpense).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useCreateExpense>);
  });

  it('opens QuickExpenseDrawer when prominent + button in BottomNav is clicked', async () => {
    const user = userEvent.setup();

    renderWithShell(
      <>
        <ContextStateWatcher />
        <BottomNav />
      </>,
    );

    expect(screen.getByTestId('context-is-open')).toHaveTextContent('closed');

    const plusButton = screen.getByRole('button', {
      name: /registrar nueva compra compartida/i,
    });
    await user.click(plusButton);

    expect(screen.getByTestId('context-is-open')).toHaveTextContent('open');
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /registrar gasto/i }),
      ).toBeInTheDocument();
    });
  });

  it('opens QuickExpenseDrawer when primary action button in DesktopSidebar is clicked', async () => {
    const user = userEvent.setup();

    renderWithShell(
      <>
        <ContextStateWatcher />
        <DesktopSidebar />
      </>,
    );

    expect(screen.getByTestId('context-is-open')).toHaveTextContent('closed');

    const sidebarButton = screen.getByRole('button', {
      name: /registrar gasto/i,
    });
    await user.click(sidebarButton);

    expect(screen.getByTestId('context-is-open')).toHaveTextContent('open');
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /registrar gasto/i }),
      ).toBeInTheDocument();
    });
  });

  it('opens QuickExpenseDrawer when secondary action button in AppHeader is clicked', async () => {
    const user = userEvent.setup();

    renderWithShell(
      <>
        <ContextStateWatcher />
        <AppHeader />
      </>,
    );

    expect(screen.getByTestId('context-is-open')).toHaveTextContent('closed');

    const headerButton = screen.getByRole('button', {
      name: /registrar gasto/i,
    });
    await user.click(headerButton);

    expect(screen.getByTestId('context-is-open')).toHaveTextContent('open');
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /registrar gasto/i }),
      ).toBeInTheDocument();
    });
  });
});
