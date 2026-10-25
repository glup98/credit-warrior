import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CardFormDialog } from './card-form-dialog';
import * as cardsService from '@/services/cards.service';
import { ApiError } from '@/services/api-client';
import type { CardRead } from '@/types/api.types';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/services/cards.service', () => ({
  createCard: vi.fn(),
  updateCard: vi.fn(),
}));

const mockCardForEdit: CardRead = {
  id: 'card-111',
  name: 'BCI Visa Signature',
  last_four_digits: '5566',
  currency: 'USD',
  closing_day: 12,
  due_day: 25,
  default_monthly_fee: '15.50',
  is_active: true,
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
};

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('CardFormDialog Component (Spec 003 T4 & Spec 009 T3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Creation Mode', () => {
    it('renders with title "Nueva Tarjeta de Crédito" and default values including maintenance fee 0', () => {
      renderWithClient(
        <CardFormDialog open={true} onOpenChange={vi.fn()} />,
      );

      expect(
        screen.getByRole('heading', { name: /nueva tarjeta de crédito/i }),
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/nombre/i)).toHaveValue('');
      expect(screen.getByLabelText(/últimos 4 dígitos/i)).toHaveValue('');
      expect(screen.getByRole('radio', { name: /clp/i })).toHaveAttribute('aria-checked', 'true');
      expect(screen.getByLabelText(/mantención mensual base/i)).toHaveValue('0');
      expect(screen.getByText('$', { selector: 'span' })).toBeInTheDocument();
      expect(
        screen.getByText(/costo fijo mensual cobrado por el banco/i),
      ).toBeInTheDocument();
      expect(screen.getByRole('switch', { name: /tarjeta activa/i })).toHaveAttribute('aria-checked', 'true');
      expect(screen.getByText(/si configuras día 31/i)).toBeInTheDocument();
    });

    it('submits valid new card and calls createCard service with normalized null digits and default fee "0"', async () => {
      const onOpenChange = vi.fn();
      const onSuccess = vi.fn();

      vi.mocked(cardsService.createCard).mockResolvedValueOnce({
        id: 'new-card-id',
        name: 'Banco Estado Visa',
        last_four_digits: null,
        currency: 'CLP',
        closing_day: 20,
        due_day: 5,
        default_monthly_fee: '0',
        is_active: true,
        created_at: '2026-10-20T00:00:00Z',
        updated_at: '2026-10-20T00:00:00Z',
      });

      renderWithClient(
        <CardFormDialog
          open={true}
          onOpenChange={onOpenChange}
          onSuccess={onSuccess}
        />,
      );

      await userEvent.type(screen.getByLabelText(/nombre/i), 'Banco Estado Visa');
      await userEvent.type(screen.getByLabelText(/día de corte/i), '20');
      await userEvent.type(screen.getByLabelText(/día de pago/i), '5');

      const submitBtn = screen.getByRole('button', { name: /crear tarjeta/i });
      await userEvent.click(submitBtn);

      await waitFor(() => {
        expect(cardsService.createCard).toHaveBeenCalledWith({
          name: 'Banco Estado Visa',
          last_four_digits: null,
          currency: 'CLP',
          closing_day: 20,
          due_day: 5,
          default_monthly_fee: '0',
          is_active: true,
        });
      });

      expect(toast.success).toHaveBeenCalledWith('Tarjeta creada exitosamente');
      expect(onSuccess).toHaveBeenCalled();
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('allows setting custom default_monthly_fee in CLP (e.g. 4500)', async () => {
      vi.mocked(cardsService.createCard).mockResolvedValueOnce({
        id: 'card-clp-1',
        name: 'Santander Platinum',
        last_four_digits: '9988',
        currency: 'CLP',
        closing_day: 15,
        due_day: 5,
        default_monthly_fee: '4500',
        is_active: true,
        created_at: '2026-10-20T00:00:00Z',
        updated_at: '2026-10-20T00:00:00Z',
      });

      renderWithClient(<CardFormDialog open={true} onOpenChange={vi.fn()} />);

      await userEvent.type(screen.getByLabelText(/nombre/i), 'Santander Platinum');
      await userEvent.type(screen.getByLabelText(/últimos 4 dígitos/i), '9988');
      await userEvent.type(screen.getByLabelText(/día de corte/i), '15');
      await userEvent.type(screen.getByLabelText(/día de pago/i), '5');

      const feeInput = screen.getByLabelText(/mantención mensual base/i);
      await userEvent.clear(feeInput);
      await userEvent.type(feeInput, '4500');

      await userEvent.click(screen.getByRole('button', { name: /crear tarjeta/i }));

      await waitFor(() => {
        expect(cardsService.createCard).toHaveBeenCalledWith(
          expect.objectContaining({
            default_monthly_fee: '4500',
            currency: 'CLP',
          }),
        );
      });
    });

    it('validates maintenance fee constraints by currency: rejects decimals in CLP and accepts decimals in USD', async () => {
      renderWithClient(<CardFormDialog open={true} onOpenChange={vi.fn()} />);

      await userEvent.type(screen.getByLabelText(/nombre/i), 'Visa Test');
      await userEvent.type(screen.getByLabelText(/día de corte/i), '10');
      await userEvent.type(screen.getByLabelText(/día de pago/i), '25');

      const feeInput = screen.getByLabelText(/mantención mensual base/i);
      await userEvent.clear(feeInput);
      await userEvent.type(feeInput, '4500.50');

      await userEvent.click(screen.getByRole('button', { name: /crear tarjeta/i }));

      expect(
        await screen.findByText(/para clp el monto de mantención debe ser un número entero/i),
      ).toBeInTheDocument();
      expect(cardsService.createCard).not.toHaveBeenCalled();

      // Cambiar a USD
      await userEvent.click(screen.getByRole('radio', { name: /usd/i }));
      expect(screen.getByText('US$', { selector: 'span' })).toBeInTheDocument();

      // Ingresar monto decimal válido en USD
      await userEvent.clear(feeInput);
      await userEvent.type(feeInput, '3.50');

      vi.mocked(cardsService.createCard).mockResolvedValueOnce({
        id: 'card-usd-1',
        name: 'Visa Test',
        last_four_digits: null,
        currency: 'USD',
        closing_day: 10,
        due_day: 25,
        default_monthly_fee: '3.50',
        is_active: true,
        created_at: '2026-10-20T00:00:00Z',
        updated_at: '2026-10-20T00:00:00Z',
      });

      await userEvent.click(screen.getByRole('button', { name: /crear tarjeta/i }));

      await waitFor(() => {
        expect(cardsService.createCard).toHaveBeenCalledWith(
          expect.objectContaining({
            currency: 'USD',
            default_monthly_fee: '3.50',
          }),
        );
      });
    });

    it('normalizes empty or whitespace default_monthly_fee to "0" on creation', async () => {
      vi.mocked(cardsService.createCard).mockResolvedValueOnce({
        id: 'card-empty-fee',
        name: 'Tarjeta Sin Costo',
        last_four_digits: null,
        currency: 'CLP',
        closing_day: 10,
        due_day: 20,
        default_monthly_fee: '0',
        is_active: true,
        created_at: '2026-10-20T00:00:00Z',
        updated_at: '2026-10-20T00:00:00Z',
      });

      renderWithClient(<CardFormDialog open={true} onOpenChange={vi.fn()} />);

      await userEvent.type(screen.getByLabelText(/nombre/i), 'Tarjeta Sin Costo');
      await userEvent.type(screen.getByLabelText(/día de corte/i), '10');
      await userEvent.type(screen.getByLabelText(/día de pago/i), '20');

      const feeInput = screen.getByLabelText(/mantención mensual base/i);
      await userEvent.clear(feeInput);
      await userEvent.type(feeInput, '   ');

      await userEvent.click(screen.getByRole('button', { name: /crear tarjeta/i }));

      await waitFor(() => {
        expect(cardsService.createCard).toHaveBeenCalledWith(
          expect.objectContaining({
            default_monthly_fee: '0',
          }),
        );
      });
    });

    it('validates client-side constraints (name required, days 1..31, exactly 4 digits)', async () => {
      renderWithClient(
        <CardFormDialog open={true} onOpenChange={vi.fn()} />,
      );

      // Enviar formulario vacío
      await userEvent.click(screen.getByRole('button', { name: /crear tarjeta/i }));

      expect(await screen.findByText(/el nombre de la tarjeta es obligatorio/i)).toBeInTheDocument();
      expect(screen.getAllByText(/día entre 1 y 31/i).length).toBeGreaterThanOrEqual(1);

      // Ingresar dígitos incorrectos (ej. 2 dígitos)
      await userEvent.type(screen.getByLabelText(/últimos 4 dígitos/i), '12');
      await userEvent.click(screen.getByRole('button', { name: /crear tarjeta/i }));

      expect(await screen.findByText(/debe contener exactamente 4 dígitos/i)).toBeInTheDocument();
      expect(cardsService.createCard).not.toHaveBeenCalled();
    });
  });

  describe('Edition Mode', () => {
    it('renders with title "Editar Tarjeta de Crédito" and pre-populates existing card data and maintenance fee', () => {
      renderWithClient(
        <CardFormDialog
          open={true}
          onOpenChange={vi.fn()}
          card={mockCardForEdit}
        />,
      );

      expect(
        screen.getByRole('heading', { name: /editar tarjeta de crédito/i }),
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/nombre/i)).toHaveValue('BCI Visa Signature');
      expect(screen.getByLabelText(/últimos 4 dígitos/i)).toHaveValue('5566');
      expect(screen.getByRole('radio', { name: /usd/i })).toHaveAttribute('aria-checked', 'true');
      expect(screen.getByLabelText(/mantención mensual base/i)).toHaveValue('15.50');
      expect(screen.getByLabelText(/día de corte/i)).toHaveValue(12);
      expect(screen.getByLabelText(/día de pago/i)).toHaveValue(25);
      expect(screen.getByRole('button', { name: /guardar cambios/i })).toBeInTheDocument();
    });

    it('updates card with modified default_monthly_fee and normalized digits', async () => {
      const onOpenChange = vi.fn();
      const onSuccess = vi.fn();

      vi.mocked(cardsService.updateCard).mockResolvedValueOnce({
        ...mockCardForEdit,
        last_four_digits: null,
        default_monthly_fee: '20.00',
      });

      renderWithClient(
        <CardFormDialog
          open={true}
          onOpenChange={onOpenChange}
          card={mockCardForEdit}
          onSuccess={onSuccess}
        />,
      );

      // Limpiar el campo last_four_digits
      const digitsInput = screen.getByLabelText(/últimos 4 dígitos/i);
      await userEvent.clear(digitsInput);

      // Modificar la mantención base
      const feeInput = screen.getByLabelText(/mantención mensual base/i);
      await userEvent.clear(feeInput);
      await userEvent.type(feeInput, '20.00');

      const submitBtn = screen.getByRole('button', { name: /guardar cambios/i });
      await userEvent.click(submitBtn);

      await waitFor(() => {
        expect(cardsService.updateCard).toHaveBeenCalledWith('card-111', {
          name: 'BCI Visa Signature',
          last_four_digits: null,
          currency: 'USD',
          closing_day: 12,
          due_day: 25,
          default_monthly_fee: '20.00',
          is_active: true,
        });
      });

      expect(toast.success).toHaveBeenCalledWith('Tarjeta actualizada exitosamente');
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Server Validation Handling (422 Unprocessable Entity)', () => {
    it('maps 422 validation errors to corresponding form fields using mapPydanticErrorsToForm', async () => {
      const error422 = new ApiError(422, [
        {
          loc: ['body', 'closing_day'],
          msg: 'Día de corte inválido según calendario bancario',
          type: 'value_error',
        },
      ]);

      vi.mocked(cardsService.createCard).mockRejectedValueOnce(error422);

      renderWithClient(
        <CardFormDialog open={true} onOpenChange={vi.fn()} />,
      );

      await userEvent.type(screen.getByLabelText(/nombre/i), 'Tarjeta Con Error');
      await userEvent.type(screen.getByLabelText(/día de corte/i), '20');
      await userEvent.type(screen.getByLabelText(/día de pago/i), '5');

      await userEvent.click(screen.getByRole('button', { name: /crear tarjeta/i }));

      expect(
        await screen.findByText('Día de corte inválido según calendario bancario'),
      ).toBeInTheDocument();
    });
  });

  describe('Cancellation', () => {
    it('closes dialog when cancel button is clicked', async () => {
      const onOpenChange = vi.fn();
      renderWithClient(
        <CardFormDialog open={true} onOpenChange={onOpenChange} />,
      );

      const cancelBtn = screen.getByRole('button', { name: /cancelar/i });
      await userEvent.click(cancelBtn);

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
