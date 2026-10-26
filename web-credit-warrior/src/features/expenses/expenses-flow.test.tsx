import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ExpensesView } from './expenses-view';
import { QuickExpenseProvider } from './context/quick-expense-context';
import {
  useExpenses,
  useExpenseSchedule,
  useUpdateExpense,
  useDeleteExpense,
} from '@/hooks/queries/use-expenses';
import { useCards } from '@/hooks/queries/use-cards';
import { usePersons } from '@/hooks/queries/use-persons';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { ApiError } from '@/services/api-client';
import { queryKeys } from '@/lib/query-keys';
import type {
  ExpenseRead,
  CardRead,
  PersonRead,
  ExpenseScheduleResponse,
} from '@/types/api.types';

vi.mock('@/hooks/queries/use-expenses', () => ({
  useExpenses: vi.fn(),
  useExpenseSchedule: vi.fn(),
  useUpdateExpense: vi.fn(),
  useDeleteExpense: vi.fn(),
}));

vi.mock('@/hooks/queries/use-cards', () => ({
  useCards: vi.fn(),
}));

vi.mock('@/hooks/queries/use-persons', () => ({
  usePersons: vi.fn(),
}));

vi.mock('@/hooks/use-media-query', () => ({
  useMediaQuery: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(),
  useRouter: vi.fn(),
  usePathname: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

// Mock Cards
const mockCardCLP: CardRead = {
  id: 'card-clp-1',
  name: 'Visa Santander',
  last_four_digits: '1234',
  currency: 'CLP',
  is_active: true,
  closing_day: 25,
  due_day: 10,
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
};

const mockCardUSD: CardRead = {
  id: 'card-usd-2',
  name: 'Mastercard Black',
  last_four_digits: '9876',
  currency: 'USD',
  is_active: true,
  closing_day: 20,
  due_day: 5,
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
};

// Mock Persons
const mockPerson1: PersonRead = {
  id: 'person-111',
  name: 'Anyi Rojas',
  color_hex: '#10B981',
  is_active: true,
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
};

const mockPerson2: PersonRead = {
  id: 'person-222',
  name: 'Augusto Soto',
  color_hex: '#38BDF8',
  is_active: true,
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
};

// Mock Expenses
const mockExpensesData: ExpenseRead[] = [
  {
    id: 'exp-super-1',
    card_id: 'card-clp-1',
    description: 'Supermercado Líder',
    total_amount: '120000',
    purchase_date: '2026-10-15',
    installments_count: 3,
    first_billing_override: '2026-11',
    notes: 'Compra mensual de despensa',
    splits: [
      {
        id: 'split-s1',
        person_id: 'person-111',
        split_type: 'EQUAL',
        percentage: null,
        fixed_amount: null,
      },
      {
        id: 'split-s2',
        person_id: 'person-222',
        split_type: 'EQUAL',
        percentage: null,
        fixed_amount: null,
      },
    ],
    created_at: '2026-10-15T12:00:00Z',
    updated_at: '2026-10-15T12:00:00Z',
  },
  {
    id: 'exp-cafe-2',
    card_id: 'card-usd-2',
    description: 'Café Juan Valdez',
    total_amount: '45.50',
    purchase_date: '2026-10-16',
    installments_count: 1,
    first_billing_override: null,
    notes: 'Café de grano en aeropuerto',
    splits: [
      {
        id: 'split-c1',
        person_id: 'person-111',
        split_type: 'EQUAL',
        percentage: null,
        fixed_amount: null,
      },
    ],
    created_at: '2026-10-16T10:00:00Z',
    updated_at: '2026-10-16T10:00:00Z',
  },
  {
    id: 'exp-farmacia-3',
    card_id: 'card-clp-1',
    description: 'Farmacia Ahumada',
    total_amount: '35000',
    purchase_date: '2026-10-17',
    installments_count: 1,
    first_billing_override: null,
    notes: null,
    splits: [
      {
        id: 'split-f1',
        person_id: 'person-222',
        split_type: 'EQUAL',
        percentage: null,
        fixed_amount: null,
      },
    ],
    created_at: '2026-10-17T09:00:00Z',
    updated_at: '2026-10-17T09:00:00Z',
  },
];

// Mock Schedule
const mockScheduleResponse: ExpenseScheduleResponse = {
  expense_id: 'exp-super-1',
  description: 'Supermercado Líder',
  card_id: 'card-clp-1',
  card_name: 'Visa Santander',
  currency: 'CLP',
  total_amount: '120000',
  installments_count: 3,
  schedule: [
    {
      installment_number: 1,
      installments_count: 3,
      installment_label: '1/3',
      statement_period: '2026-10',
      payment_period: '2026-11',
      closing_date: '2026-10-25',
      due_date: '2026-11-10',
      installment_amount: '40000',
      person_shares: [
        { person_id: 'person-111', person_name: 'Anyi Rojas', amount: '20000' },
        { person_id: 'person-222', person_name: 'Augusto Soto', amount: '20000' },
      ],
    },
    {
      installment_number: 2,
      installments_count: 3,
      installment_label: '2/3',
      statement_period: '2026-11',
      payment_period: '2026-12',
      closing_date: '2026-11-25',
      due_date: '2026-12-10',
      installment_amount: '40000',
      person_shares: [
        { person_id: 'person-111', person_name: 'Anyi Rojas', amount: '20000' },
        { person_id: 'person-222', person_name: 'Augusto Soto', amount: '20000' },
      ],
    },
    {
      installment_number: 3,
      installments_count: 3,
      installment_label: '3/3',
      statement_period: '2026-12',
      payment_period: '2027-01',
      closing_date: '2026-12-25',
      due_date: '2027-01-10',
      installment_amount: '40000',
      person_shares: [
        { person_id: 'person-111', person_name: 'Anyi Rojas', amount: '20000' },
        { person_id: 'person-222', person_name: 'Augusto Soto', amount: '20000' },
      ],
    },
  ],
};

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <QuickExpenseProvider>{children}</QuickExpenseProvider>
      </QueryClientProvider>
    );
  };
}

describe('Spec 005: End-to-End Expenses Flow & Concurrency Resilience', () => {
  let queryClient: QueryClient;
  let mockRouterReplace: ReturnType<typeof vi.fn>;
  let mockUpdateMutateAsync: ReturnType<typeof vi.fn>;
  let mockDeleteMutateAsync: ReturnType<typeof vi.fn>;

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
    vi.mocked(useMediaQuery).mockReturnValue(true); // Desktop default

    vi.mocked(useCards).mockReturnValue({
      data: [mockCardCLP, mockCardUSD],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useCards>);

    vi.mocked(usePersons).mockReturnValue({
      data: [mockPerson1, mockPerson2],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof usePersons>);

    vi.mocked(useExpenses).mockReturnValue({
      data: mockExpensesData,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useExpenses>);

    vi.mocked(useExpenseSchedule).mockReturnValue({
      data: mockScheduleResponse,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useExpenseSchedule>);

    mockUpdateMutateAsync = vi.fn().mockResolvedValue({ ...mockExpensesData[0] });
    vi.mocked(useUpdateExpense).mockReturnValue({
      mutateAsync: mockUpdateMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateExpense>);

    mockDeleteMutateAsync = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useDeleteExpense).mockReturnValue({
      mutateAsync: mockDeleteMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useDeleteExpense>);
  });

  // --------------------------------------------------------------------------
  // Flujo 1: Exploración del catálogo cronológico de compras
  // --------------------------------------------------------------------------
  it('Flujo 1: Renderiza el catálogo cronológico de compras con tarjetas, divisas y participantes', () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams() as unknown as ReturnType<typeof useSearchParams>,
    );

    const Wrapper = createWrapper(queryClient);
    render(<ExpensesView />, { wrapper: Wrapper });

    // Comprobamos la visualización de las descripciones de compra
    expect(screen.getByText('Supermercado Líder')).toBeInTheDocument();
    expect(screen.getByText('Café Juan Valdez')).toBeInTheDocument();
    expect(screen.getByText('Farmacia Ahumada')).toBeInTheDocument();

    // Verificamos formato monetario tabular determinista por divisa
    expect(screen.getByText('$120.000')).toBeInTheDocument();
    expect(screen.getByText('US$45.50')).toBeInTheDocument();
    expect(screen.getByText('$35.000')).toBeInTheDocument();

    // Verificamos enmascaramiento de tarjeta
    expect(screen.getAllByText('•••• 1234').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('•••• 9876').length).toBeGreaterThanOrEqual(1);

    // Verificamos badges de moneda
    expect(screen.getAllByText('CLP').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('USD').length).toBeGreaterThanOrEqual(1);

    // Verificamos chips de participantes
    expect(screen.getAllByText('Anyi Rojas').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Augusto Soto').length).toBeGreaterThanOrEqual(1);
  });

  // --------------------------------------------------------------------------
  // Flujo 2: Aplicación de filtros remotos y búsqueda en memoria
  // --------------------------------------------------------------------------
  it('Flujo 2: Aplica filtros combinados en red (period a active_in_period) y búsqueda en memoria insensible a mayúsculas/acentos', () => {
    // URL con period='2026-11' y q='lider' (sin tilde)
    const searchParams = new URLSearchParams({
      period: '2026-11',
      q: 'lider',
    });
    vi.mocked(useSearchParams).mockReturnValue(
      searchParams as unknown as ReturnType<typeof useSearchParams>,
    );

    const Wrapper = createWrapper(queryClient);
    render(<ExpensesView />, { wrapper: Wrapper });

    // Verifica que useExpenses mapea 'period' hacia 'active_in_period' y omite 'q'
    expect(useExpenses).toHaveBeenCalledWith({
      card_id: undefined,
      person_id: undefined,
      active_in_period: '2026-11',
    });

    // En memoria, "lider" coincide con "Supermercado Líder" y oculta los demás
    expect(screen.getByText('Supermercado Líder')).toBeInTheDocument();
    expect(screen.queryByText('Café Juan Valdez')).not.toBeInTheDocument();
    expect(screen.queryByText('Farmacia Ahumada')).not.toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // Flujo 3: Cronograma de amortización al vuelo sin matemáticas en cliente
  // --------------------------------------------------------------------------
  it('Flujo 3: Proyecta el cronograma de amortización oficial, cuotas, fechas y resaltado de período activo', async () => {
    const user = userEvent.setup();
    // Establecemos activePeriod en 2026-11 vía searchParams
    const searchParams = new URLSearchParams({
      period: '2026-11',
    });
    vi.mocked(useSearchParams).mockReturnValue(
      searchParams as unknown as ReturnType<typeof useSearchParams>,
    );

    const Wrapper = createWrapper(queryClient);
    render(<ExpensesView />, { wrapper: Wrapper });

    // Pulsamos "Ver cronograma" de Supermercado Líder
    const scheduleButtons = screen.getAllByRole('button', { name: /ver cronograma/i });
    await user.click(scheduleButtons[0]);

    // Modal de cronograma abierto
    expect(
      screen.getByRole('heading', { name: /cronograma de amortización/i }),
    ).toBeInTheDocument();

    // Verificamos cuotas devueltas por el servidor (1/3, 2/3, 3/3)
    expect(screen.getByText('1/3')).toBeInTheDocument();
    expect(screen.getByText('2/3')).toBeInTheDocument();
    expect(screen.getByText('3/3')).toBeInTheDocument();

    // Verificamos resaltado literal "Próximo pago" en la cuota cuyo payment_period es 2026-11
    expect(screen.getByText('Próximo pago')).toBeInTheDocument();

    // Verificamos nota informativa de cero cálculo en cliente
    expect(
      screen.getByText(/exclusivamente por el servidor/i),
    ).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // Flujo 4: Edición de un gasto con sanitización de splits y despacho de PUT
  // --------------------------------------------------------------------------
  it('Flujo 4: Edita un gasto sanitizando splits (sin id/created_at/updated_at), despacha PUT y muestra toast', async () => {
    const user = userEvent.setup();
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams() as unknown as ReturnType<typeof useSearchParams>,
    );

    const Wrapper = createWrapper(queryClient);
    render(<ExpensesView />, { wrapper: Wrapper });

    // Abrimos menú contextual de Supermercado Líder
    const menuButtons = screen.getAllByRole('button', { name: /acciones para/i });
    await user.click(menuButtons[0]);

    // Pulsamos "Editar"
    const editItem = screen.getByRole('menuitem', { name: /editar/i });
    await user.click(editItem);

    // Diálogo de edición abierto con datos informativos protegidos
    expect(screen.getByRole('heading', { name: /editar compra/i })).toBeInTheDocument();
    expect(
      screen.getByText(/modificaciones no auditadas/i),
    ).toBeInTheDocument();

    // Modificamos la descripción y notas
    const descInput = screen.getByLabelText(/descripción/i);
    await user.clear(descInput);
    await user.type(descInput, 'Supermercado Líder Express');

    const submitBtn = screen.getByRole('button', { name: /guardar cambios/i });
    await user.click(submitBtn);

    // Verificamos despacho de useUpdateExpense con payload sanitizado
    await waitFor(() => {
      expect(mockUpdateMutateAsync).toHaveBeenCalledTimes(1);
    });

    expect(mockUpdateMutateAsync).toHaveBeenCalledWith({
      id: 'exp-super-1',
      data: expect.objectContaining({
        card_id: 'card-clp-1',
        description: 'Supermercado Líder Express',
        total_amount: '120000',
        installments_count: 3,
        first_billing_override: '2026-11',
        splits: [
          {
            person_id: 'person-111',
            split_type: 'EQUAL',
            percentage: null,
            fixed_amount: null,
          },
          {
            person_id: 'person-222',
            split_type: 'EQUAL',
            percentage: null,
            fixed_amount: null,
          },
        ],
      }),
    });

    expect(toast.success).toHaveBeenCalledWith(
      expect.stringMatching(/compra actualizada exitosamente/i),
    );
  });

  // --------------------------------------------------------------------------
  // Flujo 5: Eliminación de gasto con recuperación ante 404 concurrente
  // --------------------------------------------------------------------------
  it('Flujo 5: Diálogo de eliminación accesible y recuperación tolerante ante 404 Not Found concurrente', async () => {
    const user = userEvent.setup();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    // Simulamos fallo 404 concurrente (la compra ya fue eliminada en otro cliente)
    const notFoundError = new ApiError(404, 'Expense not found');
    mockDeleteMutateAsync.mockRejectedValueOnce(notFoundError);

    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams() as unknown as ReturnType<typeof useSearchParams>,
    );

    const Wrapper = createWrapper(queryClient);
    render(<ExpensesView />, { wrapper: Wrapper });

    // Abrimos menú contextual de Farmacia Ahumada
    const menuButtons = screen.getAllByRole('button', { name: /acciones para/i });
    await user.click(menuButtons[2]);

    // Pulsamos "Eliminar"
    const deleteItem = screen.getByRole('menuitem', { name: /eliminar/i });
    await user.click(deleteItem);

    // Diálogo de eliminación destructivo abierto
    expect(
      screen.getByRole('heading', { name: /¿eliminar esta compra\?/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/cronograma de cuotas asociado/i),
    ).toBeInTheDocument();

    // Confirmamos la eliminación
    const confirmDeleteBtn = screen.getByRole('button', { name: /eliminar compra/i });
    await user.click(confirmDeleteBtn);

    // Validamos que capturó el error 404 con elegancia: toast informativo, invalidación y cierre
    await waitFor(() => {
      expect(toast.info).toHaveBeenCalledWith(
        expect.stringMatching(/la compra seleccionada ya no existe/i),
      );
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.expenses.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.dashboard.all });
  });
});
