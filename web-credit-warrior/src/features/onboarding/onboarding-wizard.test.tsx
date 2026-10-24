import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/query-keys';
import { useOnboardingStatus } from '@/hooks/use-onboarding-status';
import { OnboardingWizard } from './onboarding-wizard';
import OnboardingPage from '@/app/onboarding/page';
import * as cardsService from '@/services/cards.service';
import type { CardRead, PersonRead } from '@/types/api.types';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@/hooks/use-onboarding-status', () => ({
  useOnboardingStatus: vi.fn(),
}));

vi.mock('@/services/cards.service');
vi.mock('@/services/persons.service');

const mockCard: CardRead = {
  id: 'c1111111-1111-1111-1111-111111111111',
  name: 'Visa Santander',
  last_four_digits: '1234',
  currency: 'CLP',
  closing_day: 20,
  due_day: 5,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const mockPerson: PersonRead = {
  id: 'p1111111-1111-1111-1111-111111111111',
  name: 'Anyi',
  color_hex: '#10B981',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

function createWrapper(queryClient?: QueryClient) {
  const client =
    queryClient ??
    new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('OnboardingWizard and Isolated Onboarding Page', () => {
  const mockReplace = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({
      replace: mockReplace,
      push: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    } as unknown as ReturnType<typeof useRouter>);
  });

  describe('OnboardingWizard step progression', () => {
    it('progresses smoothly from Step 1 to Step 2 and Step 3', async () => {
      const user = userEvent.setup();
      vi.mocked(cardsService.createCard).mockResolvedValue(mockCard);

      render(<OnboardingWizard initialStep={1} />, { wrapper: createWrapper() });

      // Step 1: Welcome
      expect(screen.getByText(/Tus tarjetas compartidas, sin enredos de cuentas/i)).toBeInTheDocument();
      const startBtn = screen.getByRole('button', { name: /Comenzar configuración/i });
      await user.click(startBtn);

      // Step 2: First Card
      expect(screen.getByText(/Registra tu Primera Tarjeta/i)).toBeInTheDocument();
      await user.type(screen.getByLabelText(/Nombre de la tarjeta/i), 'Visa Santander');
      await user.type(screen.getByLabelText(/Últimos 4 dígitos/i), '1234');
      await user.type(screen.getByLabelText(/Día de corte/i), '20');
      await user.type(screen.getByLabelText(/Día de pago/i), '5');

      const submitCardBtn = screen.getByRole('button', { name: /Guardar tarjeta y continuar/i });
      await user.click(submitCardBtn);

      // Step 3: Participants
      await waitFor(() => {
        expect(screen.getByText(/¿Quiénes comparten los gastos\?/i)).toBeInTheDocument();
      });
    });

    it('allows reviewing created card in Step 2 without creating a duplicate', async () => {
      const user = userEvent.setup();

      render(
        <OnboardingWizard
          initialStep={3}
          initialCard={mockCard}
          initialPersons={[mockPerson]}
        />,
        { wrapper: createWrapper() },
      );

      // Step 3: click review card
      const reviewBtn = screen.getByRole('button', { name: /Revisar tarjeta creada/i });
      await user.click(reviewBtn);

      // Should be in Step 2 read-only mode
      expect(screen.getByText('Tarjeta Registrada')).toBeInTheDocument();
      expect(screen.getByText('Visa Santander')).toBeInTheDocument();
      expect(screen.getByText('•••• 1234')).toBeInTheDocument();

      // Click continue to participants
      const continueBtn = screen.getByRole('button', { name: /Continuar a Participantes/i });
      await user.click(continueBtn);

      // Back in Step 3
      expect(screen.getByText(/¿Quiénes comparten los gastos\?/i)).toBeInTheDocument();
      expect(cardsService.createCard).not.toHaveBeenCalled();
    });

    it('invalidates cards.all, persons.all, and dashboard.all upon completion and navigates to "/"', async () => {
      const user = userEvent.setup();
      const queryClient = new QueryClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      render(
        <OnboardingWizard
          initialStep={3}
          initialCard={mockCard}
          initialPersons={[mockPerson]}
        />,
        { wrapper: createWrapper(queryClient) },
      );

      const finishBtn = screen.getByRole('button', { name: /Finalizar y ver Dashboard/i });
      expect(finishBtn).toBeEnabled();

      await user.click(finishBtn);

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.cards.all });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.persons.all });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.dashboard.all });
      });

      expect(toast.success).toHaveBeenCalledWith(
        '¡Configuración completada! Bienvenido a tu Dashboard.',
      );
      expect(mockReplace).toHaveBeenCalledWith('/');
    });
  });

  describe('Reverse Guard in OnboardingPage (app/onboarding/page.tsx)', () => {
    it('redirects to "/" and does not render wizard when isOnboarded is true', () => {
      vi.mocked(useOnboardingStatus).mockReturnValue({
        isOnboarded: true,
        isLoading: false,
        isError: false,
        needsOnboarding: false,
        activeCardsCount: 1,
        activePersonsCount: 1,
        hasCards: true,
        hasPersons: true,
        initialStep: 1,
        refetch: vi.fn(),
      });

      render(<OnboardingPage />, { wrapper: createWrapper() });

      expect(mockReplace).toHaveBeenCalledWith('/');
      expect(screen.queryByText(/Comenzar configuración/i)).not.toBeInTheDocument();
      expect(
        screen.getByText(/Entorno ya configurado. Redirigiendo a Dashboard.../i),
      ).toBeInTheDocument();
    });

    it('renders OnboardingWizard when needsOnboarding is true', () => {
      vi.mocked(useOnboardingStatus).mockReturnValue({
        isOnboarded: false,
        isLoading: false,
        isError: false,
        needsOnboarding: true,
        activeCardsCount: 0,
        activePersonsCount: 0,
        hasCards: false,
        hasPersons: false,
        initialStep: 1,
        refetch: vi.fn(),
      });

      render(<OnboardingPage />, { wrapper: createWrapper() });

      expect(screen.getByText(/Tus tarjetas compartidas, sin enredos de cuentas/i)).toBeInTheDocument();
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('renders loading splash when isLoading is true', () => {
      vi.mocked(useOnboardingStatus).mockReturnValue({
        isOnboarded: false,
        isLoading: true,
        isError: false,
        needsOnboarding: false,
        activeCardsCount: 0,
        activePersonsCount: 0,
        hasCards: false,
        hasPersons: false,
        initialStep: 1,
        refetch: vi.fn(),
      });

      render(<OnboardingPage />, { wrapper: createWrapper() });

      expect(screen.getByText('Cargando asistente...')).toBeInTheDocument();
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('renders anti-loop error screen when isError is true and executes refetch on click', async () => {
      const user = userEvent.setup();
      const mockRefetch = vi.fn().mockResolvedValue(undefined);
      vi.mocked(useOnboardingStatus).mockReturnValue({
        isOnboarded: false,
        isLoading: false,
        isError: true,
        needsOnboarding: false,
        activeCardsCount: 0,
        activePersonsCount: 0,
        hasCards: false,
        hasPersons: false,
        initialStep: 1,
        refetch: mockRefetch,
      });

      render(<OnboardingPage />, { wrapper: createWrapper() });

      expect(screen.getByText('Sin conexión con el backend')).toBeInTheDocument();
      expect(mockReplace).not.toHaveBeenCalled();

      const retryBtn = screen.getByRole('button', { name: /Reintentar/i });
      await user.click(retryBtn);

      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });
  });
});
