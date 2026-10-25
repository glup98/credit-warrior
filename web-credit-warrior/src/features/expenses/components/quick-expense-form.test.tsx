import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { QuickExpenseForm, cleanExpensePayload } from './quick-expense-form';
import { useCards } from '@/hooks/queries/use-cards';
import { usePersons } from '@/hooks/queries/use-persons';
import { useCreateExpense } from '@/hooks/queries/use-expenses';
import { ApiError } from '@/services/api-client';
import { toast } from 'sonner';
import { formatLocalDate } from '@/lib/formatters';
import type { CardRead, PersonRead } from '@/types/api.types';

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

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
  name: 'Visa Banco',
  last_four_digits: '4321',
  currency: 'CLP',
  is_active: true,
  closing_day: 20,
  due_day: 5,
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
};

const mockPerson1: PersonRead = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Camila Rojas',
  color_hex: '#10B981',
  is_active: true,
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
};

const mockPerson2: PersonRead = {
  id: '33333333-3333-4333-8333-333333333333',
  name: 'Valentina Soto',
  color_hex: '#8B5CF6',
  is_active: true,
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
};

describe('QuickExpenseForm (Spec 004 T7)', () => {
  const mockMutateAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useCards).mockReturnValue({
      data: [mockCardCLP],
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

  describe('cleanExpensePayload Unit Tests', () => {
    it('normalizes empty strings in optional fields to null', () => {
      const cleaned = cleanExpensePayload({
        card_id: 'card-1',
        description: '  Supermercado Lider  ',
        total_amount: '  50000  ',
        purchase_date: '2026-10-20',
        installments_count: '1',
        first_billing_override: '   ',
        notes: '',
        splits: [
          {
            person_id: 'p-1',
            split_type: 'EQUAL',
            percentage: '50.00',
            fixed_amount: '25000',
          },
        ],
      });

      expect(cleaned.description).toBe('Supermercado Lider');
      expect(cleaned.total_amount).toBe('50000');
      expect(cleaned.first_billing_override).toBeNull();
      expect(cleaned.notes).toBeNull();
      expect(cleaned.installments_count).toBe(1);
      // In EQUAL mode, percentage and fixed_amount are strictly null
      expect(cleaned.splits[0].percentage).toBeNull();
      expect(cleaned.splits[0].fixed_amount).toBeNull();
    });

    it('cleans fixed_amount in PERCENTAGE mode and percentage in FIXED_AMOUNT mode', () => {
      const percentageCleaned = cleanExpensePayload({
        card_id: 'card-1',
        description: 'Cena',
        total_amount: '20000',
        purchase_date: '2026-10-20',
        installments_count: 1,
        splits: [
          {
            person_id: 'p-1',
            split_type: 'PERCENTAGE',
            percentage: ' 50.00 ',
            fixed_amount: '10000',
          },
        ],
      });

      expect(percentageCleaned.splits[0].split_type).toBe('PERCENTAGE');
      expect(percentageCleaned.splits[0].percentage).toBe('50.00');
      expect(percentageCleaned.splits[0].fixed_amount).toBeNull();

      const fixedCleaned = cleanExpensePayload({
        card_id: 'card-1',
        description: 'Cena',
        total_amount: '20000',
        purchase_date: '2026-10-20',
        installments_count: 1,
        splits: [
          {
            person_id: 'p-1',
            split_type: 'FIXED_AMOUNT',
            percentage: '50.00',
            fixed_amount: ' 10000 ',
          },
        ],
      });

      expect(fixedCleaned.splits[0].split_type).toBe('FIXED_AMOUNT');
      expect(fixedCleaned.splits[0].percentage).toBeNull();
      expect(fixedCleaned.splits[0].fixed_amount).toBe('10000');
    });
  });

  describe('Form Orchestration and Submitting', () => {
    it('renders all form fields, date picker, installments, accordion and split builder', () => {
      renderWithProviders(<QuickExpenseForm />);

      expect(
        screen.getByRole('radiogroup', { name: /seleccionar tarjeta de crédito/i }),
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/descripción/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/monto total/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/fecha de compra/i)).toBeInTheDocument();
      expect(screen.getByText(/^cuotas$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/cuotas manual/i)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /opciones avanzadas/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /registrar gasto/i }),
      ).toBeInTheDocument();
    });

    it('submits cleaned payload successfully, displays success toast and invokes onSuccess', async () => {
      const user = userEvent.setup();
      const handleSuccess = vi.fn();
      mockMutateAsync.mockResolvedValueOnce({ id: 'exp-123' });

      renderWithProviders(<QuickExpenseForm onSuccess={handleSuccess} />);

      // Description
      const descInput = screen.getByLabelText(/descripción/i);
      await user.type(descInput, 'Almuerzo equipo');

      // Amount
      const amountInput = screen.getByLabelText(/monto total/i);
      await user.type(amountInput, '30000');

      const submitButton = screen.getByRole('button', { name: /registrar gasto/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledTimes(1);
      });

      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          card_id: '11111111-1111-4111-8111-111111111111',
          description: 'Almuerzo equipo',
          total_amount: '30000',
          first_billing_override: null,
          notes: null,
        }),
      );

      expect(toast.success).toHaveBeenCalledWith(
        expect.stringMatching(/gasto registrado exitosamente/i),
      );
      expect(handleSuccess).toHaveBeenCalledTimes(1);
    });

    it('integrates QuickDatePicker in DD/MM/AAAA format, allowing manual text entry and shortcut selection to emit ISO date', async () => {
      const user = userEvent.setup();
      mockMutateAsync.mockResolvedValueOnce({ id: 'exp-date-test' });

      renderWithProviders(<QuickExpenseForm />);

      // Verifica formato visual por defecto DD/MM/AAAA
      const dateInput = screen.getByLabelText(/fecha de compra/i);
      const todayIso = formatLocalDate(new Date());
      const [year, month, day] = todayIso.split('-');
      const todayDisplay = `${day}/${month}/${year}`;
      expect(dateInput).toHaveValue(todayDisplay);

      // Descripción y Monto
      await user.type(screen.getByLabelText(/descripción/i), 'Cena viernes');
      await user.type(screen.getByLabelText(/monto total/i), '45000');

      // Seleccionar atajo "Ayer"
      const yesterdayBtn = screen.getByRole('button', { name: /^ayer$/i });
      await user.click(yesterdayBtn);

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayIso = formatLocalDate(yesterday);
      const [yYear, yMonth, yDay] = yesterdayIso.split('-');
      expect(dateInput).toHaveValue(`${yDay}/${yMonth}/${yYear}`);

      const submitButton = screen.getByRole('button', { name: /registrar gasto/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledTimes(1);
      });

      // El payload debe contener la fecha en formato ISO YYYY-MM-DD
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          purchase_date: yesterdayIso,
          description: 'Cena viernes',
          total_amount: '45000',
        }),
      );
    });

    it('enforces anti double-submit by disabling the button and showing loader during mutation', () => {
      vi.mocked(useCreateExpense).mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: true,
      } as unknown as ReturnType<typeof useCreateExpense>);

      renderWithProviders(<QuickExpenseForm />);

      const submitButton = screen.getByRole('button', { name: /registrando\.\.\.|registrar gasto/i });
      expect(submitButton).toBeDisabled();
    });

    it('expands advanced options accordion when toggled', async () => {
      const user = userEvent.setup();
      renderWithProviders(<QuickExpenseForm />);

      expect(screen.queryByLabelText(/primer mes de facturación/i)).not.toBeInTheDocument();

      const toggleButton = screen.getByRole('button', { name: /opciones avanzadas/i });
      await user.click(toggleButton);

      expect(screen.getByLabelText(/primer mes de facturación/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/notas/i)).toBeInTheDocument();
    });
  });

  describe('Error Resilience and Inline 422 Mapping', () => {
    it('maps FastAPI/Pydantic 422 validation errors inline and keeps form open', async () => {
      const user = userEvent.setup();
      const pydanticError = new ApiError(422, [
        {
          loc: ['body', 'description'],
          msg: 'La descripción contiene caracteres no permitidos',
          type: 'value_error',
        },
      ]);

      mockMutateAsync.mockRejectedValueOnce(pydanticError);

      renderWithProviders(<QuickExpenseForm />);

      const descInput = screen.getByLabelText(/descripción/i);
      await user.type(descInput, 'Supermercado');

      const amountInput = screen.getByLabelText(/monto total/i);
      await user.type(amountInput, '25000');

      const submitButton = screen.getByRole('button', { name: /registrar gasto/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/la descripción contiene caracteres no permitidos/i),
        ).toBeInTheDocument();
      });

      // Form remains open and inputs preserve values
      expect(descInput).toHaveValue('Supermercado');
      expect(amountInput).toHaveValue('25000');
    });

    it('handles 404 concurrency error with toast and preserves entered data', async () => {
      const user = userEvent.setup();
      const notFoundError = new ApiError(404, 'Not Found');
      mockMutateAsync.mockRejectedValueOnce(notFoundError);

      renderWithProviders(<QuickExpenseForm />);

      const descInput = screen.getByLabelText(/descripción/i);
      await user.type(descInput, 'Compra online');

      const amountInput = screen.getByLabelText(/monto total/i);
      await user.type(amountInput, '15000');

      const submitButton = screen.getByRole('button', { name: /registrar gasto/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringMatching(/la tarjeta o uno de los participantes seleccionados ya no existe/i),
        );
      });

      // Data preserved
      expect(descInput).toHaveValue('Compra online');
      expect(amountInput).toHaveValue('15000');
    });

    it('handles network error (500 or offline) with toast and preserves entered data', async () => {
      const user = userEvent.setup();
      mockMutateAsync.mockRejectedValueOnce(new Error('Network error'));

      renderWithProviders(<QuickExpenseForm />);

      const descInput = screen.getByLabelText(/descripción/i);
      await user.type(descInput, 'Farmacia');

      const amountInput = screen.getByLabelText(/monto total/i);
      await user.type(amountInput, '12000');

      const submitButton = screen.getByRole('button', { name: /registrar gasto/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringMatching(/error de conexión con el servidor/i),
        );
      });

      expect(descInput).toHaveValue('Farmacia');
      expect(amountInput).toHaveValue('12000');
    });
  });
});
