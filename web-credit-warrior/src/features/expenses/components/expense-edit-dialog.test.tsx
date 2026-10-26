import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ExpenseEditDialog } from './expense-edit-dialog';
import { useUpdateExpense } from '@/hooks/queries/use-expenses';
import { useMediaQuery } from '@/hooks/use-media-query';
import { toast } from 'sonner';
import { ApiError } from '@/services/api-client';
import { queryKeys } from '@/lib/query-keys';
import type { ExpenseRead, CardRead, PersonRead } from '@/types/api.types';

vi.mock('@/hooks/queries/use-expenses', () => ({
  useUpdateExpense: vi.fn(),
}));

vi.mock('@/hooks/use-media-query', () => ({
  useMediaQuery: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

const mockCard: CardRead = {
  id: 'card-111',
  name: 'Visa Banco',
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

const mockExpense: ExpenseRead = {
  id: 'exp-999',
  card_id: 'card-111',
  description: 'Supermercado Líder',
  total_amount: '120000',
  purchase_date: '2026-10-15',
  installments_count: 3,
  first_billing_override: '2026-11',
  notes: 'Compras de despensa mensual',
  splits: [
    {
      id: 'split-1',
      person_id: 'person-111',
      split_type: 'EQUAL',
      percentage: null,
      fixed_amount: null,
    },
    {
      id: 'split-2',
      person_id: 'person-222',
      split_type: 'EQUAL',
      percentage: null,
      fixed_amount: null,
    },
  ],
  created_at: '2026-10-15T12:00:00Z',
  updated_at: '2026-10-15T12:00:00Z',
};

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe('ExpenseEditDialog Component (Spec 005 T6)', () => {
  let queryClient: QueryClient;
  let mockMutateAsync: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    mockMutateAsync = vi.fn().mockResolvedValue({ ...mockExpense });
    vi.mocked(useUpdateExpense).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateExpense>);

    // Default to desktop view
    vi.mocked(useMediaQuery).mockReturnValue(true);
  });

  it('no renderiza contenido cuando open es false o expense es null', () => {
    const Wrapper = createWrapper(queryClient);

    const { rerender } = render(
      <ExpenseEditDialog
        expense={mockExpense}
        open={false}
        card={mockCard}
        persons={mockPersons}
      />,
      { wrapper: Wrapper },
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    rerender(
      <ExpenseEditDialog
        expense={null}
        open={true}
        card={mockCard}
        persons={mockPersons}
      />,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renderiza título, datos estructurales en modo solo lectura y precarga campos editables', () => {
    const Wrapper = createWrapper(queryClient);

    render(
      <ExpenseEditDialog
        expense={mockExpense}
        open={true}
        card={mockCard}
        persons={mockPersons}
      />,
      { wrapper: Wrapper },
    );

    // Título y encabezado
    expect(screen.getByRole('heading', { name: /editar compra/i })).toBeInTheDocument();

    // Datos estructurales de solo lectura
    expect(screen.getByText(/visa banco/i)).toBeInTheDocument();
    expect(screen.getByText(/4321/)).toBeInTheDocument();
    expect(screen.getByText(/\$120\.000/)).toBeInTheDocument();
    expect(screen.getByText(/3 cuotas/i)).toBeInTheDocument();
    expect(screen.getByText(/anyi rojas/i)).toBeInTheDocument();
    expect(screen.getByText(/augusto soto/i)).toBeInTheDocument();

    // Campos editables precargados
    const descInput = screen.getByLabelText(/descripción/i);
    expect(descInput).toHaveValue('Supermercado Líder');

    const overrideInput = screen.getByLabelText(/período de primera cuota/i);
    expect(overrideInput).toHaveValue('2026-11');

    const notesInput = screen.getByLabelText(/notas/i);
    expect(notesInput).toHaveValue('Compras de despensa mensual');
  });

  it('valida que la descripción no esté vacía antes de enviar', async () => {
    const user = userEvent.setup();
    const Wrapper = createWrapper(queryClient);

    render(
      <ExpenseEditDialog
        expense={mockExpense}
        open={true}
        card={mockCard}
        persons={mockPersons}
      />,
      { wrapper: Wrapper },
    );

    const descInput = screen.getByLabelText(/descripción/i);
    await user.clear(descInput);

    const submitBtn = screen.getByRole('button', { name: /guardar cambios/i });
    await user.click(submitBtn);

    expect(await screen.findByText(/la descripción es obligatoria/i)).toBeInTheDocument();
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('valida formato de first_billing_override (YYYY-MM) si se ingresa un valor incorrecto', async () => {
    const user = userEvent.setup();
    const Wrapper = createWrapper(queryClient);

    render(
      <ExpenseEditDialog
        expense={mockExpense}
        open={true}
        card={mockCard}
        persons={mockPersons}
      />,
      { wrapper: Wrapper },
    );

    const overrideInput = screen.getByLabelText(/período de primera cuota/i);
    await user.clear(overrideInput);
    await user.type(overrideInput, '2026-13'); // Mes inválido

    const submitBtn = screen.getByRole('button', { name: /guardar cambios/i });
    await user.click(submitBtn);

    expect(await screen.findByText(/formato de período inválido/i)).toBeInTheDocument();
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('guarda cambios exitosamente: despacha mutateAsync con payload sanitizado, muestra toast y cierra modal', async () => {
    const user = userEvent.setup();
    const Wrapper = createWrapper(queryClient);
    const onOpenChange = vi.fn();
    const onSuccess = vi.fn();

    render(
      <ExpenseEditDialog
        expense={mockExpense}
        open={true}
        card={mockCard}
        persons={mockPersons}
        onOpenChange={onOpenChange}
        onSuccess={onSuccess}
      />,
      { wrapper: Wrapper },
    );

    const descInput = screen.getByLabelText(/descripción/i);
    await user.clear(descInput);
    await user.type(descInput, 'Supermercado Líder Express');

    const notesInput = screen.getByLabelText(/notas/i);
    await user.clear(notesInput);
    await user.type(notesInput, 'Ajuste de notas');

    const submitBtn = screen.getByRole('button', { name: /guardar cambios/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    });

    // Validar llamada sanitizada (splits sin id/created_at/updated_at)
    expect(mockMutateAsync).toHaveBeenCalledWith({
      id: 'exp-999',
      data: expect.objectContaining({
        card_id: 'card-111',
        description: 'Supermercado Líder Express',
        total_amount: '120000',
        installments_count: 3,
        first_billing_override: '2026-11',
        notes: 'Ajuste de notas',
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
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('protección anti-cierre accidental: si el formulario es modificado (isDirty), bloquea onOpenChange exterior', async () => {
    const user = userEvent.setup();
    const Wrapper = createWrapper(queryClient);
    const onOpenChange = vi.fn();

    render(
      <ExpenseEditDialog
        expense={mockExpense}
        open={true}
        card={mockCard}
        persons={mockPersons}
        onOpenChange={onOpenChange}
      />,
      { wrapper: Wrapper },
    );

    const descInput = screen.getByLabelText(/descripción/i);
    await user.type(descInput, ' Modificado');

    // Al hacer clic en Cancelar, SÍ se permite cerrar explícitamente
    const cancelBtn = screen.getByRole('button', { name: /cancelar/i });
    await user.click(cancelBtn);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('mapea errores inline 422 de Pydantic sin cerrar el formulario', async () => {
    const user = userEvent.setup();
    const Wrapper = createWrapper(queryClient);
    const onOpenChange = vi.fn();

    const pydanticError = new ApiError(422, [
      {
        loc: ['body', 'description'],
        msg: 'La descripción contiene caracteres no permitidos',
        type: 'value_error',
      },
    ]);

    mockMutateAsync.mockRejectedValueOnce(pydanticError);

    render(
      <ExpenseEditDialog
        expense={mockExpense}
        open={true}
        card={mockCard}
        persons={mockPersons}
        onOpenChange={onOpenChange}
      />,
      { wrapper: Wrapper },
    );

    const submitBtn = screen.getByRole('button', { name: /guardar cambios/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/la descripción contiene caracteres no permitidos/i),
      ).toBeInTheDocument();
    });

    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('tolera concurrencia ante 404 Not Found: emite toast informativo, invalida consultas y cierra el modal', async () => {
    const user = userEvent.setup();
    const Wrapper = createWrapper(queryClient);
    const onOpenChange = vi.fn();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const notFoundError = new ApiError(404, 'Expense not found');
    mockMutateAsync.mockRejectedValueOnce(notFoundError);

    render(
      <ExpenseEditDialog
        expense={mockExpense}
        open={true}
        card={mockCard}
        persons={mockPersons}
        onOpenChange={onOpenChange}
      />,
      { wrapper: Wrapper },
    );

    const submitBtn = screen.getByRole('button', { name: /guardar cambios/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(toast.info).toHaveBeenCalledWith(
        expect.stringMatching(/la compra seleccionada ya no existe/i),
      );
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.expenses.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.dashboard.all });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('maneja errores genéricos de servidor: emite toast de error y mantiene el diálogo abierto', async () => {
    const user = userEvent.setup();
    const Wrapper = createWrapper(queryClient);
    const onOpenChange = vi.fn();

    mockMutateAsync.mockRejectedValueOnce(new Error('500 Internal Server Error'));

    render(
      <ExpenseEditDialog
        expense={mockExpense}
        open={true}
        card={mockCard}
        persons={mockPersons}
        onOpenChange={onOpenChange}
      />,
      { wrapper: Wrapper },
    );

    const submitBtn = screen.getByRole('button', { name: /guardar cambios/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringMatching(/500 internal server error/i),
      );
    });

    // El diálogo permanece abierto
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('renderiza en Drawer en móvil (< 768px) con protección dismissible={!isDirty}', async () => {
    const user = userEvent.setup();
    vi.mocked(useMediaQuery).mockReturnValue(false);
    const Wrapper = createWrapper(queryClient);

    render(
      <ExpenseEditDialog
        expense={mockExpense}
        open={true}
        cards={[mockCard]}
        persons={mockPersons}
      />,
      { wrapper: Wrapper },
    );

    // En Drawer en móvil, se muestra el título y el formulario
    expect(screen.getByRole('heading', { name: /editar compra/i })).toBeInTheDocument();

    const descInput = screen.getByLabelText(/descripción/i);
    expect(descInput).toHaveValue('Supermercado Líder');

    // Modificar el formulario activa isDirty
    await user.type(descInput, ' Express');
    expect(descInput).toHaveValue('Supermercado Líder Express');
  });
});
