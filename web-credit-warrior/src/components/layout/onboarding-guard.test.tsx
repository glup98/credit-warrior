import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter, usePathname } from 'next/navigation';
import { useOnboardingStatus } from '@/hooks/use-onboarding-status';
import { OnboardingGuard } from './onboarding-guard';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
}));

vi.mock('@/hooks/use-onboarding-status', () => ({
  useOnboardingStatus: vi.fn(),
}));

describe('OnboardingGuard component', () => {
  const mockReplace = vi.fn();
  const mockRefetch = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePathname).mockReturnValue('/');
    vi.mocked(useRouter).mockReturnValue({
      replace: mockReplace,
      push: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    } as unknown as ReturnType<typeof useRouter>);
  });

  it('renders loading splash and does not render children when isLoading is true', () => {
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
      refetch: mockRefetch,
    });

    render(
      <OnboardingGuard>
        <div data-testid="protected-content">Contenido Protegido</div>
      </OnboardingGuard>,
    );

    expect(screen.getByText('Verificando configuración...')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('renders connection error screen and handles refetch on button click without redirecting to onboarding', async () => {
    const user = userEvent.setup();
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

    render(
      <OnboardingGuard>
        <div data-testid="protected-content">Contenido Protegido</div>
      </OnboardingGuard>,
    );

    expect(screen.getByText('Sin conexión con el backend')).toBeInTheDocument();
    expect(
      screen.getByText(
        'No pudimos verificar el estado de tus tarjetas y participantes. Revisa que el servidor esté activo.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();

    const retryButton = screen.getByRole('button', { name: /Reintentar conexión/i });
    expect(retryButton).toBeInTheDocument();

    await user.click(retryButton);
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('redirects to /onboarding and does not render children when needsOnboarding is true on non-catalog routes', () => {
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
      refetch: mockRefetch,
    });

    render(
      <OnboardingGuard>
        <div data-testid="protected-content">Contenido Protegido</div>
      </OnboardingGuard>,
    );

    expect(mockReplace).toHaveBeenCalledWith('/onboarding');
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(
      screen.getByText('Redirigiendo a configuración inicial...'),
    ).toBeInTheDocument();
  });

  it('renders children and does not redirect to /onboarding when needsOnboarding is true on /cards route', () => {
    vi.mocked(usePathname).mockReturnValue('/cards');
    vi.mocked(useOnboardingStatus).mockReturnValue({
      isOnboarded: false,
      isLoading: false,
      isError: false,
      needsOnboarding: true,
      activeCardsCount: 0,
      activePersonsCount: 1,
      hasCards: false,
      hasPersons: true,
      initialStep: 1,
      refetch: mockRefetch,
    });

    render(
      <OnboardingGuard>
        <div data-testid="protected-content">Catálogo de Tarjetas</div>
      </OnboardingGuard>,
    );

    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.getByText('Catálogo de Tarjetas')).toBeInTheDocument();
    expect(screen.queryByText('Redirigiendo a configuración inicial...')).not.toBeInTheDocument();
  });

  it('renders children and does not redirect to /onboarding when needsOnboarding is true on /persons route', () => {
    vi.mocked(usePathname).mockReturnValue('/persons');
    vi.mocked(useOnboardingStatus).mockReturnValue({
      isOnboarded: false,
      isLoading: false,
      isError: false,
      needsOnboarding: true,
      activeCardsCount: 1,
      activePersonsCount: 0,
      hasCards: true,
      hasPersons: false,
      initialStep: 1,
      refetch: mockRefetch,
    });

    render(
      <OnboardingGuard>
        <div data-testid="protected-content">Catálogo de Participantes</div>
      </OnboardingGuard>,
    );

    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.getByText('Catálogo de Participantes')).toBeInTheDocument();
    expect(screen.queryByText('Redirigiendo a configuración inicial...')).not.toBeInTheDocument();
  });

  it('renders children directly when isOnboarded is true', () => {
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
      refetch: mockRefetch,
    });

    render(
      <OnboardingGuard>
        <div data-testid="protected-content">Contenido Protegido</div>
      </OnboardingGuard>,
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.getByText('Contenido Protegido')).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.queryByText('Verificando configuración...')).not.toBeInTheDocument();
    expect(screen.queryByText('Sin conexión con el backend')).not.toBeInTheDocument();
  });
});
