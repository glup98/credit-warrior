import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { QuickExpenseDrawer } from './quick-expense-drawer';
import {
  QuickExpenseProvider,
  useQuickExpense,
} from '../context/quick-expense-context';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useCards } from '@/hooks/queries/use-cards';
import { usePersons } from '@/hooks/queries/use-persons';
import { useCreateExpense } from '@/hooks/queries/use-expenses';
import { ApiError } from '@/services/api-client';
import { toast } from 'sonner';
import type { CardRead, PersonRead } from '@/types/api.types';

vi.mock('@/hooks/use-media-query', () => ({
  useMediaQuery: vi.fn(),
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

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

const mockCardCLP: CardRead = {
  id: '11111111-1111-4111-8111-111111111111',
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
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Mastercard Black',
  last_four_digits: '9876',
  currency: 'USD',
  is_active: true,
  closing_day: 20,
  due_day: 5,
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
};

const mockPerson1: PersonRead = {
  id: '33333333-3333-4333-8333-333333333333',
  name: 'Anyi Rojas',
  color_hex: '#10B981',
  is_active: true,
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
};

const mockPerson2: PersonRead = {
  id: '44444444-4444-4444-8444-444444444444',
  name: 'Augusto Soto',
  color_hex: '#8B5CF6',
  is_active: true,
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
};

// Harness para abrir el drawer
function FlowTestApp() {
  const { open } = useQuickExpense();
  return (
    <div>
      <button onClick={open}>+ Gasto</button>
      <QuickExpenseDrawer />
    </div>
  );
}

function renderFlow(queryClient?: QueryClient) {
  const qc =
    queryClient ??
    new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

  return render(
    <QueryClientProvider client={qc}>
      <QuickExpenseProvider>
        <FlowTestApp />
      </QuickExpenseProvider>
    </QueryClientProvider>,
  );
}

describe('Quick Expense End-to-End Component Flow (Spec 004 T10)', () => {
  const mockMutateAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useMediaQuery).mockReturnValue(true); // Desktop mode by default

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

    vi.mocked(useCreateExpense).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateExpense>);
  });

  it('Flujo 1: Registro rápido con tarjeta en CLP, 3 cuotas y reparto EQUAL -> 201 y cierre de modal', async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockResolvedValueOnce({ id: 'exp-flow-1' });

    renderFlow();

    // 1. Abrir Drawer
    await user.click(screen.getByRole('button', { name: /\+ gasto/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // 2. Seleccionar tarjeta CLP
    const cardClpBtn = screen.getByRole('radio', { name: /visa santander clp/i });
    await user.click(cardClpBtn);

    // 3. Descripción y Monto
    const descInput = screen.getByLabelText(/descripción/i);
    await user.type(descInput, 'Supermercado Líder');

    const amountInput = screen.getByLabelText(/monto total/i);
    await user.type(amountInput, '120000');

    // 4. Seleccionar 3 cuotas
    const threeInstallmentsBtn = screen.getByRole('button', { name: /^3$/ });
    await user.click(threeInstallmentsBtn);

    // 5. Submit
    const submitBtn = screen.getByRole('button', { name: /registrar gasto/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    });

    expect(mockMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        card_id: mockCardCLP.id,
        description: 'Supermercado Líder',
        total_amount: '120000',
        installments_count: 3,
        splits: [
          {
            person_id: mockPerson1.id,
            split_type: 'EQUAL',
            percentage: null,
            fixed_amount: null,
          },
          {
            person_id: mockPerson2.id,
            split_type: 'EQUAL',
            percentage: null,
            fixed_amount: null,
          },
        ],
      }),
    );

    expect(toast.success).toHaveBeenCalledWith(
      expect.stringMatching(/gasto registrado exitosamente/i),
    );
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('Flujo 2: Registro en USD con modo PERCENTAGE al 100.00% -> 201 y éxito', async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockResolvedValueOnce({ id: 'exp-flow-2' });

    renderFlow();

    await user.click(screen.getByRole('button', { name: /\+ gasto/i }));

    // Seleccionar tarjeta USD
    const cardUsdBtn = screen.getByRole('radio', { name: /mastercard black usd/i });
    await user.click(cardUsdBtn);

    // Concepto y monto USD
    await user.type(screen.getByLabelText(/descripción/i), 'Cena Miami');
    await user.type(screen.getByLabelText(/monto total/i), '80.00');

    // Conmutar a Porcentaje
    const percentTab = screen.getByRole('tab', { name: /porcentaje/i });
    await user.click(percentTab);

    // Auto-distribuido a 50.00% y 50.00%
    expect(screen.getByText(/100\.00%/i)).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /registrar gasto/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    });

    expect(mockMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        card_id: mockCardUSD.id,
        description: 'Cena Miami',
        total_amount: '80.00',
        splits: [
          {
            person_id: mockPerson1.id,
            split_type: 'PERCENTAGE',
            percentage: '50.00',
            fixed_amount: null,
          },
          {
            person_id: mockPerson2.id,
            split_type: 'PERCENTAGE',
            percentage: '50.00',
            fixed_amount: null,
          },
        ],
      }),
    );

    expect(toast.success).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('Flujo 3: Registro en modo FIXED_AMOUNT con acción rápida "Asignar restante" hasta $0', async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockResolvedValueOnce({ id: 'exp-flow-3' });

    renderFlow();

    await user.click(screen.getByRole('button', { name: /\+ gasto/i }));

    const cardClpBtn = screen.getByRole('radio', { name: /visa santander clp/i });
    await user.click(cardClpBtn);

    await user.type(screen.getByLabelText(/descripción/i), 'Reparación Taller');
    await user.type(screen.getByLabelText(/monto total/i), '100000');

    // Conmutar a Monto Fijo
    const fixedTab = screen.getByRole('tab', { name: /monto fijo/i });
    await user.click(fixedTab);

    // Escribir 60000 en el primer participante
    const person1AmountInput = screen.getByLabelText(
      new RegExp(`monto para ${mockPerson1.name}`, 'i'),
    );
    await user.type(person1AmountInput, '60000');

    // Restante es 40000
    expect(screen.getByText(/\$40\.000/i)).toBeInTheDocument();

    // Pulsar "Asignar restante" en el segundo participante
    const assignRemainderButtons = screen.getAllByRole('button', {
      name: /asignar restante/i,
    });
    await user.click(assignRemainderButtons[1]);

    // Saldo cubierto exactamente
    expect(screen.getByText(/total cubierto exactamente/i)).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /registrar gasto/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    });

    expect(mockMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        splits: [
          {
            person_id: mockPerson1.id,
            split_type: 'FIXED_AMOUNT',
            percentage: null,
            fixed_amount: '60000',
          },
          {
            person_id: mockPerson2.id,
            split_type: 'FIXED_AMOUNT',
            percentage: null,
            fixed_amount: '40000',
          },
        ],
      }),
    );

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('Flujo 4: Fallo de red en primer intento -> modal permanece abierto intacto -> reintento exitoso', async () => {
    const user = userEvent.setup();
    // Primer intento falla, segundo intento tiene éxito
    mockMutateAsync
      .mockRejectedValueOnce(new Error('Network offline error'))
      .mockResolvedValueOnce({ id: 'exp-recovered' });

    renderFlow();

    await user.click(screen.getByRole('button', { name: /\+ gasto/i }));

    const cardClpBtn = screen.getByRole('radio', { name: /visa santander clp/i });
    await user.click(cardClpBtn);

    const descInput = screen.getByLabelText(/descripción/i);
    await user.type(descInput, 'Veterinaria');

    const amountInput = screen.getByLabelText(/monto total/i);
    await user.type(amountInput, '35000');

    const submitBtn = screen.getByRole('button', { name: /registrar gasto/i });
    await user.click(submitBtn);

    // Verificamos que se mostró el toast de error de red
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringMatching(/error de conexión con el servidor/i),
      );
    });

    // El modal SIGUE abierto y los datos están intactos
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(descInput).toHaveValue('Veterinaria');
    expect(amountInput).toHaveValue('35000');

    // Reintento de envío
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(2);
    });

    expect(toast.success).toHaveBeenCalledWith(
      expect.stringMatching(/gasto registrado exitosamente/i),
    );
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('Flujo 5: Error 422 de Pydantic -> inyección de mensaje inline bajo el campo observado', async () => {
    const user = userEvent.setup();
    const pydanticError = new ApiError(422, [
      {
        loc: ['body', 'description'],
        msg: 'La descripción no puede contener símbolos reservados',
        type: 'value_error',
      },
    ]);

    mockMutateAsync.mockRejectedValueOnce(pydanticError);

    renderFlow();

    await user.click(screen.getByRole('button', { name: /\+ gasto/i }));

    const cardClpBtn = screen.getByRole('radio', { name: /visa santander clp/i });
    await user.click(cardClpBtn);

    const descInput = screen.getByLabelText(/descripción/i);
    await user.type(descInput, 'Gasto con #$$%');

    const amountInput = screen.getByLabelText(/monto total/i);
    await user.type(amountInput, '5000');

    const submitBtn = screen.getByRole('button', { name: /registrar gasto/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/la descripción no puede contener símbolos reservados/i),
      ).toBeInTheDocument();
    });

    // El formulario permanece abierto y conserva lo ingresado
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(descInput).toHaveValue('Gasto con #$$%');
    expect(amountInput).toHaveValue('5000');
  });
});
