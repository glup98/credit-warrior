import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ExpensesView } from './expenses-view';
import { useExpenses } from '@/hooks/queries/use-expenses';
import { useCards } from '@/hooks/queries/use-cards';
import { usePersons } from '@/hooks/queries/use-persons';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { QuickExpenseProvider } from './context/quick-expense-context';
import type { ExpenseRead, CardRead, PersonRead } from '@/types/api.types';

vi.mock('@/hooks/queries/use-expenses', () => ({
  useExpenses: vi.fn(),
  useExpenseSchedule: vi.fn().mockReturnValue({ data: null, isLoading: false, isError: false }),
  useUpdateExpense: vi.fn().mockReturnValue({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteExpense: vi.fn().mockReturnValue({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/queries/use-cards', () => ({
  useCards: vi.fn(),
}));

vi.mock('@/hooks/queries/use-persons', () => ({
  usePersons: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(),
  useRouter: vi.fn(),
  usePathname: vi.fn(),
}));

const mockCard: CardRead = {
  id: 'card-111',
  name: 'Visa Santander',
  last_four_digits: '4321',
  currency: 'CLP',
  is_active: true,
  closing_day: 20,
  due_day: 5,
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
};

const mockPersons: PersonRead[] = [
  {
    id: 'person-111',
    name: 'Anyi Rojas',
    color_hex: '#10B981',
    is_active: true,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
  },
  {
    id: 'person-222',
    name: 'Augusto Soto',
    color_hex: '#38BDF8',
    is_active: true,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
  },
];

const mockExpensesList: ExpenseRead[] = [
  {
    id: 'exp-1',
    card_id: 'card-111',
    description: 'Supermercado Líder',
    total_amount: '120000',
    purchase_date: '2026-10-15',
    installments_count: 3,
    first_billing_override: '2026-11',
    notes: 'Despensa del mes',
    splits: [
      {
        id: 'split-1',
        person_id: 'person-111',
        split_type: 'EQUAL',
        percentage: null,
        fixed_amount: null,
      },
    ],
    created_at: '2026-10-15T12:00:00Z',
    updated_at: '2026-10-15T12:00:00Z',
  },
  {
    id: 'exp-2',
    card_id: 'card-111',
    description: 'Café Juan Valdez',
    total_amount: '8500',
    purchase_date: '2026-10-16',
    installments_count: 1,
    first_billing_override: null,
    notes: null,
    splits: [
      {
        id: 'split-2',
        person_id: 'person-222',
        split_type: 'EQUAL',
        percentage: null,
        fixed_amount: null,
      },
    ],
    created_at: '2026-10-16T10:00:00Z',
    updated_at: '2026-10-16T10:00:00Z',
  },
  {
    id: 'exp-3',
    card_id: 'card-111',
    description: 'Farmacia Ahumada',
    total_amount: '25000',
    purchase_date: '2026-10-17',
    installments_count: 1,
    first_billing_override: null,
    notes: null,
    splits: [
      {
        id: 'split-3',
        person_id: 'person-111',
        split_type: 'EQUAL',
        percentage: null,
        fixed_amount: null,
      },
    ],
    created_at: '2026-10-17T09:00:00Z',
    updated_at: '2026-10-17T09:00:00Z',
  },
];

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <QuickExpenseProvider>{children}</QuickExpenseProvider>
      </QueryClientProvider>
    );
  };
}

describe('ExpensesView Coordinator (Spec 005 T8)', () => {
  let queryClient: QueryClient;
  let mockRouterReplace: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    mockRouterReplace = vi.fn();
    vi.mocked(useRouter).mockReturnValue({
      replace: mockRouterReplace,
      push: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    } as unknown as ReturnType<typeof useRouter>);

    vi.mocked(usePathname).mockReturnValue('/expenses');
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams() as unknown as ReturnType<typeof useSearchParams>,
    );

    vi.mocked(useCards).mockReturnValue({
      data: [mockCard],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useCards>);

    vi.mocked(usePersons).mockReturnValue({
      data: mockPersons,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof usePersons>);

    vi.mocked(useExpenses).mockReturnValue({
      data: mockExpensesList,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useExpenses>);
  });

  it('solicita useExpenses mapeando los parámetros de red y excluyendo q', () => {
    const params = new URLSearchParams({
      card_id: 'card-111',
      person_id: 'person-111',
      period: '2026-11',
      q: 'supermercado',
    });
    vi.mocked(useSearchParams).mockReturnValue(
      params as unknown as ReturnType<typeof useSearchParams>,
    );

    const Wrapper = createWrapper(queryClient);
    render(<ExpensesView />, { wrapper: Wrapper });

    // useExpenses debe recibir card_id, person_id y active_in_period (mapeado de period), excluyendo q
    expect(useExpenses).toHaveBeenCalledWith({
      card_id: 'card-111',
      person_id: 'person-111',
      active_in_period: '2026-11',
    });
  });

  it('filtra en memoria por q insensible a mayúsculas y acentos sin peticiones de red adicionales', () => {
    // Buscar "cafe" sin acento debería encontrar "Café Juan Valdez"
    const params = new URLSearchParams({
      q: 'cafe',
    });
    vi.mocked(useSearchParams).mockReturnValue(
      params as unknown as ReturnType<typeof useSearchParams>,
    );

    const Wrapper = createWrapper(queryClient);
    render(<ExpensesView />, { wrapper: Wrapper });

    expect(screen.getByText('Café Juan Valdez')).toBeInTheDocument();
    expect(screen.queryByText('Supermercado Líder')).not.toBeInTheDocument();
    expect(screen.queryByText('Farmacia Ahumada')).not.toBeInTheDocument();

    // Comprueba que no se haya enviado q al hook useExpenses
    expect(useExpenses).toHaveBeenCalledWith({
      card_id: undefined,
      person_id: undefined,
      active_in_period: undefined,
    });
  });

  it('abre ExpenseScheduleDrawer al hacer clic en "Ver cronograma"', async () => {
    const user = userEvent.setup();
    const Wrapper = createWrapper(queryClient);

    render(<ExpensesView />, { wrapper: Wrapper });

    const scheduleBtns = screen.getAllByRole('button', { name: /ver cronograma/i });
    await user.click(scheduleBtns[0]);

    // Debe abrir el cronograma de "Supermercado Líder"
    expect(screen.getByRole('heading', { name: /cronograma de amortización/i })).toBeInTheDocument();
  });

  it('abre ExpenseEditDialog al seleccionar "Editar" en el menú de una compra', async () => {
    const user = userEvent.setup();
    const Wrapper = createWrapper(queryClient);

    render(<ExpensesView />, { wrapper: Wrapper });

    const menuBtns = screen.getAllByRole('button', { name: /acciones para/i });
    await user.click(menuBtns[0]);

    const editItem = screen.getByRole('menuitem', { name: /editar/i });
    await user.click(editItem);

    // Debe abrir el diálogo de edición
    expect(screen.getByRole('heading', { name: /editar compra/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/descripción/i)).toHaveValue('Supermercado Líder');
  });

  it('abre ExpenseDeleteDialog al seleccionar "Eliminar" en el menú de una compra', async () => {
    const user = userEvent.setup();
    const Wrapper = createWrapper(queryClient);

    render(<ExpensesView />, { wrapper: Wrapper });

    const menuBtns = screen.getAllByRole('button', { name: /acciones para/i });
    await user.click(menuBtns[0]);

    const deleteItem = screen.getByRole('menuitem', { name: /eliminar/i });
    await user.click(deleteItem);

    // Debe abrir el diálogo destructivo de confirmación
    expect(screen.getByRole('heading', { name: /¿eliminar esta compra\?/i })).toBeInTheDocument();
  });

  it('limpia filtros al pulsar "Limpiar filtros" cuando no hay coincidencias', async () => {
    const user = userEvent.setup();
    // Búsqueda que no arroja resultados
    const params = new URLSearchParams({
      q: 'inexistente_xyz',
    });
    vi.mocked(useSearchParams).mockReturnValue(
      params as unknown as ReturnType<typeof useSearchParams>,
    );

    const Wrapper = createWrapper(queryClient);
    render(<ExpensesView />, { wrapper: Wrapper });

    expect(screen.getByText(/no se encontraron compras/i)).toBeInTheDocument();

    const clearBtns = screen.getAllByRole('button', { name: /limpiar filtros/i });
    expect(clearBtns.length).toBeGreaterThanOrEqual(1);
    await user.click(clearBtns[0]);

    expect(mockRouterReplace).toHaveBeenCalledWith('/expenses', { scroll: false });
  });

  it('renderiza mensaje de error y botón de reintento si useExpenses falla', async () => {
    const user = userEvent.setup();
    const mockRefetch = vi.fn();
    vi.mocked(useExpenses).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: mockRefetch,
    } as unknown as ReturnType<typeof useExpenses>);

    const Wrapper = createWrapper(queryClient);
    render(<ExpensesView />, { wrapper: Wrapper });

    expect(
      screen.getByText(/error al cargar el historial de compras/i),
    ).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: /reintentar/i });
    await user.click(retryBtn);

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });
});
