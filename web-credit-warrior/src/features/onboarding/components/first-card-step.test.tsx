import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StepIndicator } from './step-indicator';
import { WelcomeStep } from './welcome-step';
import { FirstCardStep } from './first-card-step';
import * as cardsService from '@/services/cards.service';
import { toast } from 'sonner';
import type { CardRead } from '@/types/api.types';

vi.mock('@/services/cards.service', () => ({
  createCard: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockCreatedCard: CardRead = {
  id: 'card-123',
  name: 'Visa Santander',
  last_four_digits: '4321',
  currency: 'CLP',
  closing_day: 20,
  due_day: 5,
  default_monthly_fee: '0',
  is_active: true,
  created_at: '2026-10-20T10:00:00Z',
  updated_at: '2026-10-20T10:00:00Z',
};

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
        {children}
      </QueryClientProvider>
    );
  };
}

describe('Onboarding Components — Phase 1 (StepIndicator, WelcomeStep, FirstCardStep)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('StepIndicator', () => {
    it('renders correct label for step 1', () => {
      render(<StepIndicator currentStep={1} />);
      expect(screen.getByText(/Paso 1 de 3: Bienvenida/i)).toBeInTheDocument();
    });

    it('renders correct label for step 2', () => {
      render(<StepIndicator currentStep={2} />);
      expect(screen.getByText(/Paso 2 de 3: Primera Tarjeta/i)).toBeInTheDocument();
    });

    it('renders correct label for step 3', () => {
      render(<StepIndicator currentStep={3} />);
      expect(screen.getByText(/Paso 3 de 3: Participantes/i)).toBeInTheDocument();
    });

    it('renders progress bar segments with active styling for current and previous steps', () => {
      const { container } = render(<StepIndicator currentStep={2} />);
      const segments = container.querySelectorAll('.h-1\\.5');
      expect(segments.length).toBe(3);
      expect(segments[0].className).toContain('bg-accent-clp');
      expect(segments[1].className).toContain('bg-accent-clp');
      expect(segments[2].className).toContain('bg-elevated');
    });
  });

  describe('WelcomeStep', () => {
    it('renders branding, title, 3 value pillars and calls onNext when clicking CTA', async () => {
      const user = userEvent.setup();
      const onNext = vi.fn();

      render(<WelcomeStep onNext={onNext} />);

      expect(screen.getByText(/Credit Warrior/i)).toBeInTheDocument();
      expect(
        screen.getByRole('heading', {
          level: 1,
          name: /Tus tarjetas compartidas, sin enredos de cuentas/i,
        }),
      ).toBeInTheDocument();

      expect(screen.getByText('Compras en cuotas transparentes')).toBeInTheDocument();
      expect(screen.getByText('Soporte multimoneda nativo')).toBeInTheDocument();
      expect(screen.getByText('Cero cálculos manuales')).toBeInTheDocument();

      const ctaBtn = screen.getByRole('button', { name: /Comenzar configuración/i });
      expect(ctaBtn).toBeInTheDocument();

      await user.click(ctaBtn);
      expect(onNext).toHaveBeenCalledTimes(1);
    });
  });

  describe('FirstCardStep', () => {
    it('renders all form fields in creation mode including maintenance fee field', () => {
      render(<FirstCardStep onSuccess={vi.fn()} />, { wrapper: createWrapper() });

      expect(screen.getByLabelText(/Nombre de la tarjeta/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Últimos 4 dígitos/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Mantención mensual base/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Mantención mensual base/i)).toHaveValue('0');
      expect(screen.getByText(/Costo fijo mensual cobrado por el banco/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Día de corte/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Día de pago/i)).toBeInTheDocument();
      expect(screen.getByText(/¿Por qué son importantes estas fechas\?/i)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Guardar tarjeta y continuar/i }),
      ).toBeInTheDocument();
    });

    it('shows validation errors when submitting invalid empty fields or out-of-range days', async () => {
      const user = userEvent.setup();
      render(<FirstCardStep onSuccess={vi.fn()} />, { wrapper: createWrapper() });

      const submitBtn = screen.getByRole('button', { name: /Guardar tarjeta y continuar/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/El nombre de la tarjeta es obligatorio/i)).toBeInTheDocument();
      });

      // Type out-of-range closing and due days
      const closingDayInput = screen.getByLabelText(/Día de corte/i);
      const dueDayInput = screen.getByLabelText(/Día de pago/i);

      await user.type(closingDayInput, '45');
      await user.type(dueDayInput, '0');
      await user.click(submitBtn);

      await waitFor(() => {
        const dayErrors = screen.getAllByText(/Día entre 1 y 31/i);
        expect(dayErrors.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('allows toggling between CLP and USD currency', async () => {
      const user = userEvent.setup();
      render(<FirstCardStep onSuccess={vi.fn()} />, { wrapper: createWrapper() });

      const clpBtn = screen.getByRole('button', { name: /CLP/i });
      const usdBtn = screen.getByRole('button', { name: /USD/i });

      expect(clpBtn).toBeInTheDocument();
      expect(usdBtn).toBeInTheDocument();

      // Click USD
      await user.click(usdBtn);
      expect(usdBtn.className).toContain('border-accent-usd');

      // Click back to CLP
      await user.click(clpBtn);
      expect(clpBtn.className).toContain('border-accent-clp');
    });

    it('submits form successfully, calls createCard and invokes onSuccess', async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      vi.mocked(cardsService.createCard).mockResolvedValue(mockCreatedCard);

      render(<FirstCardStep onSuccess={onSuccess} />, { wrapper: createWrapper() });

      await user.type(screen.getByLabelText(/Nombre de la tarjeta/i), 'Visa Santander');
      await user.type(screen.getByLabelText(/Últimos 4 dígitos/i), '4321');
      await user.type(screen.getByLabelText(/Día de corte/i), '20');
      await user.type(screen.getByLabelText(/Día de pago/i), '5');

      const submitBtn = screen.getByRole('button', { name: /Guardar tarjeta y continuar/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(cardsService.createCard).toHaveBeenCalledWith({
          name: 'Visa Santander',
          last_four_digits: '4321',
          currency: 'CLP',
          closing_day: 20,
          due_day: 5,
          default_monthly_fee: '0',
          is_active: true,
        });
      });

      expect(onSuccess).toHaveBeenCalledWith(mockCreatedCard);
      expect(toast.success).toHaveBeenCalledWith('Tarjeta creada exitosamente');
    });

    it('allows setting custom default_monthly_fee on first card creation', async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      const cardWithFee: CardRead = {
        ...mockCreatedCard,
        default_monthly_fee: '4500',
      };
      vi.mocked(cardsService.createCard).mockResolvedValue(cardWithFee);

      render(<FirstCardStep onSuccess={onSuccess} />, { wrapper: createWrapper() });

      await user.type(screen.getByLabelText(/Nombre de la tarjeta/i), 'Visa Santander');
      await user.type(screen.getByLabelText(/Día de corte/i), '20');
      await user.type(screen.getByLabelText(/Día de pago/i), '5');

      const feeInput = screen.getByLabelText(/Mantención mensual base/i);
      await user.clear(feeInput);
      await user.type(feeInput, '4500');

      const submitBtn = screen.getByRole('button', { name: /Guardar tarjeta y continuar/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(cardsService.createCard).toHaveBeenCalledWith(
          expect.objectContaining({
            default_monthly_fee: '4500',
            currency: 'CLP',
          }),
        );
      });
      expect(onSuccess).toHaveBeenCalledWith(cardWithFee);
    });

    it('rejects decimals in CLP for maintenance fee during onboarding', async () => {
      const user = userEvent.setup();
      render(<FirstCardStep onSuccess={vi.fn()} />, { wrapper: createWrapper() });

      await user.type(screen.getByLabelText(/Nombre de la tarjeta/i), 'Visa Santander');
      await user.type(screen.getByLabelText(/Día de corte/i), '20');
      await user.type(screen.getByLabelText(/Día de pago/i), '5');

      const feeInput = screen.getByLabelText(/Mantención mensual base/i);
      await user.clear(feeInput);
      await user.type(feeInput, '4500.50');

      const submitBtn = screen.getByRole('button', { name: /Guardar tarjeta y continuar/i });
      await user.click(submitBtn);

      expect(
        await screen.findByText(/Para CLP el monto de mantención debe ser un número entero sin decimales/i),
      ).toBeInTheDocument();
      expect(cardsService.createCard).not.toHaveBeenCalled();
    });

    it('normalizes empty maintenance fee input to "0"', async () => {
      const user = userEvent.setup();
      vi.mocked(cardsService.createCard).mockResolvedValue(mockCreatedCard);

      render(<FirstCardStep onSuccess={vi.fn()} />, { wrapper: createWrapper() });

      await user.type(screen.getByLabelText(/Nombre de la tarjeta/i), 'Visa Santander');
      await user.type(screen.getByLabelText(/Día de corte/i), '20');
      await user.type(screen.getByLabelText(/Día de pago/i), '5');

      const feeInput = screen.getByLabelText(/Mantención mensual base/i);
      await user.clear(feeInput);

      const submitBtn = screen.getByRole('button', { name: /Guardar tarjeta y continuar/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(cardsService.createCard).toHaveBeenCalledWith(
          expect.objectContaining({
            default_monthly_fee: '0',
          }),
        );
      });
    });

    it('renders read-only summary mode when createdCard is provided and calls onContinueToStep3', async () => {
      const user = userEvent.setup();
      const onContinue = vi.fn();

      render(
        <FirstCardStep
          onSuccess={vi.fn()}
          createdCard={mockCreatedCard}
          onContinueToStep3={onContinue}
        />,
        { wrapper: createWrapper() },
      );

      expect(screen.getByText('Tarjeta Registrada')).toBeInTheDocument();
      expect(screen.getByText('Visa Santander')).toBeInTheDocument();
      expect(screen.getByText('•••• 4321')).toBeInTheDocument();
      expect(screen.getByText('Día de corte: 20')).toBeInTheDocument();
      expect(screen.getByText('Día de pago: 5')).toBeInTheDocument();

      const continueBtn = screen.getByRole('button', { name: /Continuar a Participantes/i });
      expect(continueBtn).toBeInTheDocument();

      await user.click(continueBtn);
      expect(onContinue).toHaveBeenCalledTimes(1);
    });
  });
});
