import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Loading from './loading';

describe('Main Route Group loading.tsx (Spec 007 T3)', () => {
  it('1. Renderiza con rol accesible status, aria-busy y texto accesible para lectores de pantalla', () => {
    render(<Loading />);

    const container = screen.getByRole('status');
    expect(container).toBeInTheDocument();
    expect(container).toHaveAttribute('aria-busy', 'true');

    // Texto accesible oculto visualmente (sr-only)
    const srText = screen.getByText(/cargando sección\.\.\./i);
    expect(srText).toBeInTheDocument();
    expect(srText).toHaveClass('sr-only');
  });

  it('2. Renderiza la estructura geométrica estructurada anti-CLS (cabecera, métricas y bloque principal)', () => {
    render(<Loading />);

    // Skeleton de cabecera/título
    const headerSkeleton = screen.getByTestId('loading-header');
    expect(headerSkeleton).toBeInTheDocument();
    expect(headerSkeleton).toHaveClass('animate-pulse');

    // Grid de 2 tarjetas KPI
    const kpiGrid = screen.getByTestId('loading-kpi-grid');
    expect(kpiGrid).toBeInTheDocument();
    const kpiCards = screen.getAllByTestId('loading-kpi-card');
    expect(kpiCards).toHaveLength(2);

    // Bloque principal de contenido
    const contentBlock = screen.getByTestId('loading-content-block');
    expect(contentBlock).toBeInTheDocument();
    expect(contentBlock).toHaveClass('animate-pulse');
  });
});
