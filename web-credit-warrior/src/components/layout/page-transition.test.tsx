import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageTransition } from './page-transition';
import { usePathname } from 'next/navigation';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}));

describe('PageTransition Component (Spec 007 T6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePathname).mockReturnValue('/dashboard');
  });

  it('1. Renderiza a sus componentes hijos sin alterar su estructura', () => {
    render(
      <PageTransition>
        <div data-testid="page-child">Contenido de la página</div>
      </PageTransition>
    );

    const child = screen.getByTestId('page-child');
    expect(child).toBeInTheDocument();
    expect(child).toHaveTextContent('Contenido de la página');
  });

  it('2. Aplica las clases de aceleración por GPU y desvanecimiento suave motion-safe', () => {
    const { container } = render(
      <PageTransition>
        <div>Contenido</div>
      </PageTransition>
    );

    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper).toBeInTheDocument();
    expect(wrapper.className).toContain('w-full');
    expect(wrapper.className).toContain('motion-safe:animate-in');
    expect(wrapper.className).toContain('motion-safe:fade-in');
    expect(wrapper.className).toContain('motion-safe:duration-200');
    expect(wrapper.className).toContain('motion-safe:ease-out');
  });

  it('3. Incluye la regla de accesibilidad motion-reduce:animate-none para respetar prefers-reduced-motion', () => {
    const { container } = render(
      <PageTransition>
        <div>Contenido</div>
      </PageTransition>
    );

    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain('motion-reduce:animate-none');
  });

  it('4. Permite extender el estilo mediante className adicional', () => {
    const { container } = render(
      <PageTransition className="custom-test-class max-w-7xl mx-auto">
        <div>Contenido</div>
      </PageTransition>
    );

    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain('custom-test-class');
    expect(wrapper.className).toContain('max-w-7xl');
    expect(wrapper.className).toContain('mx-auto');
  });

  it('5. Desencadena un nuevo ciclo de montaje/animación al cambiar de pathname', () => {
    vi.mocked(usePathname).mockReturnValue('/dashboard');
    const { container, rerender } = render(
      <PageTransition>
        <div data-testid="dashboard-view">Dashboard View</div>
      </PageTransition>
    );

    const firstWrapper = container.firstElementChild;
    expect(firstWrapper).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-view')).toBeInTheDocument();

    // Simulamos navegación a /expenses
    vi.mocked(usePathname).mockReturnValue('/expenses');
    rerender(
      <PageTransition>
        <div data-testid="expenses-view">Expenses View</div>
      </PageTransition>
    );

    const secondWrapper = container.firstElementChild;
    expect(screen.getByTestId('expenses-view')).toBeInTheDocument();
    expect(screen.queryByTestId('dashboard-view')).not.toBeInTheDocument();
    // Al usar key={pathname}, React reemplaza o remonta el nodo raíz del contenedor
    expect(secondWrapper).toBeInTheDocument();
  });
});
