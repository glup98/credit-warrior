import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import MainLayout from '@/app/(main)/layout';
import Loading from '@/app/(main)/loading';
import { useOnboardingStatus } from '@/hooks/use-onboarding-status';
import { useHealthCheck } from '@/hooks/queries/use-health';
import { prefetchNavigationTarget } from '@/lib/prefetch';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
  useSearchParams: vi.fn(),
  useRouter: vi.fn(),
}));

vi.mock('@/hooks/use-onboarding-status', () => ({
  useOnboardingStatus: vi.fn(),
}));

vi.mock('@/hooks/queries/use-health', () => ({
  useHealthCheck: vi.fn(),
}));

vi.mock('@/lib/prefetch', () => ({
  prefetchNavigationTarget: vi.fn(),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
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

describe('Instant Navigation and Page Transitions Integration (Spec 007 T7)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    vi.mocked(usePathname).mockReturnValue('/');
    vi.mocked(useSearchParams).mockReturnValue({
      get: vi.fn().mockReturnValue(null),
    } as unknown as ReturnType<typeof useSearchParams>);
    vi.mocked(useRouter).mockReturnValue({
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
    } as unknown as ReturnType<typeof useRouter>);

    vi.mocked(useOnboardingStatus).mockReturnValue({
      isOnboarded: true,
      isLoading: false,
      isError: false,
      needsOnboarding: false,
      activeCardsCount: 2,
      activePersonsCount: 2,
      hasCards: true,
      hasPersons: true,
      initialStep: 1,
      refetch: vi.fn().mockResolvedValue(undefined),
    });

    vi.mocked(useHealthCheck).mockReturnValue({
      data: { status: 'ok' },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useHealthCheck>);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('1. Renderiza el layout principal integrando TopProgressBar, DesktopSidebar, BottomNav y PageTransition', () => {
    const { container } = render(
      <MainLayout>
        <div data-testid="page-content">Dashboard Principal</div>
      </MainLayout>,
      { wrapper: createWrapper() }
    );

    // TopProgressBar integrado y en reposo
    const progressBar = container.querySelector('[aria-hidden="true"]');
    expect(progressBar).toBeInTheDocument();

    // DesktopSidebar y BottomNav
    expect(screen.getByText('Credit Warrior')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /dashboard/i }).length).toBeGreaterThanOrEqual(1);

    // PageTransition envuelve el contenido
    const pageContent = screen.getByTestId('page-content');
    expect(pageContent).toBeInTheDocument();
    expect(pageContent.parentElement?.className).toContain('motion-safe:animate-in');
  });

  it('2. Dispara la precarga proactiva en TanStack Query al tocar o posar el puntero en los enlaces', () => {
    render(
      <MainLayout>
        <div>Contenido</div>
      </MainLayout>,
      { wrapper: createWrapper() }
    );

    const expenseLinks = screen.getAllByRole('link', { name: /compras/i });
    expect(expenseLinks.length).toBeGreaterThanOrEqual(1);

    // Simula interacción táctil en móvil (BottomNav)
    fireEvent.touchStart(expenseLinks[expenseLinks.length - 1]);
    expect(prefetchNavigationTarget).toHaveBeenCalledWith('/expenses', expect.any(Object));

    // Simula hover en escritorio (DesktopSidebar)
    fireEvent.mouseEnter(expenseLinks[0]);
    expect(prefetchNavigationTarget).toHaveBeenCalledWith('/expenses', expect.any(Object));
  });

  it('3. Activa de forma visualmente optimista e inmediata (0ms) el ítem pulsado antes de que cambie la URL', () => {
    vi.mocked(usePathname).mockReturnValue('/');

    render(
      <MainLayout>
        <div>Contenido</div>
      </MainLayout>,
      { wrapper: createWrapper() }
    );

    const expenseLinks = screen.getAllByRole('link', { name: /compras/i });
    const targetLink = expenseLinks[0];

    // Prevenimos navegación jsdom
    targetLink.addEventListener('click', (e) => e.preventDefault(), { once: true });
    fireEvent.click(targetLink);

    // A 0ms el tab debe activarse de inmediato reflejando respuesta optimista
    expect(targetLink).toHaveAttribute('aria-current', 'page');
    expect(targetLink.className).toContain('text-accent-clp');
  });

  it('4. Inicia de inmediato TopProgressBar en fase de captura al hacer clic en un enlace de navegación', () => {
    render(
      <MainLayout>
        <div>Contenido</div>
      </MainLayout>,
      { wrapper: createWrapper() }
    );

    const indicator = screen.getByTestId('top-progress-bar-indicator');
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveStyle({ opacity: '0' });

    const cardsLinks = screen.getAllByRole('link', { name: /tarjetas/i });
    const targetLink = cardsLinks[0];
    targetLink.addEventListener('click', (e) => e.preventDefault(), { once: true });

    // Disparar clic
    act(() => {
      fireEvent.click(targetLink);
    });

    // La barra debe activarse instantáneamente y comenzar a mostrar progreso
    expect(indicator).toHaveStyle({ opacity: '1' });
    expect(indicator.style.transform).toContain('scaleX');

    // Avanza el tiempo orgánico
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(indicator).toHaveStyle({ opacity: '1' });
  });

  it('5. Completa la barra de progreso, remonta la vista con PageTransition y reconcilia el estado al cambiar de ruta', () => {
    vi.mocked(usePathname).mockReturnValue('/');

    const { rerender } = render(
      <MainLayout>
        <div data-testid="dashboard-content">Dashboard Content</div>
      </MainLayout>,
      { wrapper: createWrapper() }
    );

    const cardsLinks = screen.getAllByRole('link', { name: /tarjetas/i });
    const targetLink = cardsLinks[0];
    targetLink.addEventListener('click', (e) => e.preventDefault(), { once: true });

    act(() => {
      fireEvent.click(targetLink);
    });

    const indicator = screen.getByTestId('top-progress-bar-indicator');
    expect(indicator).toHaveStyle({ opacity: '1' });

    // Simulamos la resolución de la navegación de Next.js a /cards
    vi.mocked(usePathname).mockReturnValue('/cards');
    act(() => {
      rerender(
        <MainLayout>
          <div data-testid="cards-content">Cards Content</div>
        </MainLayout>
      );
    });

    // Culminación de la barra: salta al 100% y luego se desvanece
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(indicator).toHaveStyle({ opacity: '0' });

    // El nuevo contenido está presente con animación de entrada
    expect(screen.getByTestId('cards-content')).toBeInTheDocument();
    expect(screen.queryByTestId('dashboard-content')).not.toBeInTheDocument();
  });

  it('6. El segmento loading.tsx provee un esqueleto accesible y anti-CLS durante la espera de datos', () => {
    render(<Loading />);

    const statusRole = screen.getByRole('status');
    expect(statusRole).toBeInTheDocument();
    expect(statusRole).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByTestId('loading-header')).toBeInTheDocument();
    expect(screen.getByTestId('loading-kpi-grid')).toBeInTheDocument();
    expect(screen.getByTestId('loading-content-block')).toBeInTheDocument();
  });
});
