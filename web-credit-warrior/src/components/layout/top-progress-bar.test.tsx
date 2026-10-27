/* eslint-disable @next/next/no-html-link-for-pages */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { TopProgressBar } from './top-progress-bar';
import { usePathname, useSearchParams } from 'next/navigation';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
  useSearchParams: vi.fn(),
}));

describe('TopProgressBar Component (Spec 007 T2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.mocked(usePathname).mockReturnValue('/');
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams() as unknown as ReturnType<typeof useSearchParams>,
    );

    // Mock matchMedia por defecto (no reduced-motion)
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('1. Renderiza inicialmente con atributos accesibles y oculta por opacidad', () => {
    render(<TopProgressBar />);

    const bar = screen.getByTestId('top-progress-bar');
    expect(bar).toBeInTheDocument();
    expect(bar).toHaveAttribute('aria-hidden', 'true');
    expect(bar).toHaveClass('pointer-events-none', 'fixed', 'top-0', 'left-0', 'right-0', 'z-50');

    const innerIndicator = screen.getByTestId('top-progress-bar-indicator');
    expect(innerIndicator).toHaveStyle({ opacity: '0' });
  });

  it('2. Se activa de inmediato (0ms) ante clic en enlace interno relativo', () => {
    render(
      <div>
        <TopProgressBar />
        <a
          href="/expenses"
          data-testid="internal-link"
          onClick={(e) => e.preventDefault()}
        >
          Ir a Compras
        </a>
      </div>,
    );

    const link = screen.getByTestId('internal-link');
    fireEvent.click(link);

    const indicator = screen.getByTestId('top-progress-bar-indicator');
    expect(indicator).toHaveStyle({ opacity: '1' });
    // Progreso inicial entre 20% y 30%
    const transform = indicator.style.transform;
    expect(transform).toMatch(/scaleX\(0\.(2|3)\d*\)/);
  });

  it('3. No se activa ante enlaces externos, target="_blank", misma ruta o modificadores de teclado', () => {
    render(
      <div>
        <TopProgressBar />
        <a
          href="https://external-bank.com"
          data-testid="external-link"
          onClick={(e) => e.preventDefault()}
        >
          Externo
        </a>
        <a
          href="/cards"
          target="_blank"
          data-testid="blank-link"
          onClick={(e) => e.preventDefault()}
        >
          Nueva pestaña
        </a>
        <a
          href="/"
          data-testid="same-route-link"
          onClick={(e) => e.preventDefault()}
        >
          Misma ruta
        </a>
        <a
          href="/persons"
          data-testid="modifier-link"
          onClick={(e) => e.preventDefault()}
        >
          Con Cmd
        </a>
      </div>,
    );

    const indicator = screen.getByTestId('top-progress-bar-indicator');

    // Externo
    fireEvent.click(screen.getByTestId('external-link'));
    expect(indicator).toHaveStyle({ opacity: '0' });

    // Target blank
    fireEvent.click(screen.getByTestId('blank-link'));
    expect(indicator).toHaveStyle({ opacity: '0' });

    // Misma ruta
    fireEvent.click(screen.getByTestId('same-route-link'));
    expect(indicator).toHaveStyle({ opacity: '0' });

    // Modificador Ctrl / Meta
    fireEvent.click(screen.getByTestId('modifier-link'), { metaKey: true });
    expect(indicator).toHaveStyle({ opacity: '0' });
  });

  it('4. Avanza orgánicamente hacia ~80% mientras la navegación está pendiente', () => {
    render(
      <div>
        <TopProgressBar />
        <a
          href="/cards"
          data-testid="cards-link"
          onClick={(e) => e.preventDefault()}
        >
          Tarjetas
        </a>
      </div>,
    );

    fireEvent.click(screen.getByTestId('cards-link'));
    const indicator = screen.getByTestId('top-progress-bar-indicator');

    const initialMatch = indicator.style.transform.match(/scaleX\(([\d.]+)\)/);
    const initialProgress = initialMatch ? parseFloat(initialMatch[1]) : 0;
    expect(initialProgress).toBeGreaterThan(0);

    // Avanzamos 600ms
    act(() => {
      vi.advanceTimersByTime(600);
    });

    const laterMatch = indicator.style.transform.match(/scaleX\(([\d.]+)\)/);
    const laterProgress = laterMatch ? parseFloat(laterMatch[1]) : 0;
    expect(laterProgress).toBeGreaterThan(initialProgress);
    expect(laterProgress).toBeLessThanOrEqual(0.85);
  });

  it('5. Culmina al 100% y se desvanece con fade-out al cambiar pathname', () => {
    const { rerender } = render(
      <div>
        <TopProgressBar />
        <a
          href="/expenses"
          data-testid="nav-link"
          onClick={(e) => e.preventDefault()}
        >
          Gastos
        </a>
      </div>,
    );

    fireEvent.click(screen.getByTestId('nav-link'));
    const indicator = screen.getByTestId('top-progress-bar-indicator');
    expect(indicator).toHaveStyle({ opacity: '1' });

    // Simula que la ruta cambió a /expenses
    vi.mocked(usePathname).mockReturnValue('/expenses');
    rerender(
      <div>
        <TopProgressBar />
        <a
          href="/expenses"
          data-testid="nav-link"
          onClick={(e) => e.preventDefault()}
        >
          Gastos
        </a>
      </div>,
    );

    // Salta a scaleX(1)
    expect(indicator.style.transform).toBe('scaleX(1)');

    // Esperamos la transición de fade-out (~100ms)
    act(() => {
      vi.advanceTimersByTime(120);
    });
    expect(indicator).toHaveStyle({ opacity: '0' });

    // Esperamos reseteo completo
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(indicator.style.transform).toBe('scaleX(0)');
  });

  it('6. Soporta activación programática mediante CustomEvent "cw:navigation-start"', () => {
    render(<TopProgressBar />);

    const indicator = screen.getByTestId('top-progress-bar-indicator');
    expect(indicator).toHaveStyle({ opacity: '0' });

    act(() => {
      window.dispatchEvent(new CustomEvent('cw:navigation-start'));
    });

    expect(indicator).toHaveStyle({ opacity: '1' });
    expect(indicator.style.transform).toMatch(/scaleX\(0\.(2|3)\d*\)/);
  });

  it('7. Temporizador de seguridad de 8s finaliza la barra automáticamente si la navegación se cuelga', () => {
    render(
      <div>
        <TopProgressBar />
        <a
          href="/expenses"
          data-testid="link"
          onClick={(e) => e.preventDefault()}
        >
          Gastos
        </a>
      </div>,
    );

    fireEvent.click(screen.getByTestId('link'));
    const indicator = screen.getByTestId('top-progress-bar-indicator');
    expect(indicator).toHaveStyle({ opacity: '1' });

    // Avanzamos 8100ms sin cambio de pathname
    act(() => {
      vi.advanceTimersByTime(8100);
    });

    // Debe haberse desvanecido
    expect(indicator).toHaveStyle({ opacity: '0' });
  });

  it('8. Deshabilita transiciones animadas continuas si prefers-reduced-motion está activo', () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(<TopProgressBar />);
    const indicator = screen.getByTestId('top-progress-bar-indicator');
    expect(indicator).toHaveClass('duration-0');
  });
});
