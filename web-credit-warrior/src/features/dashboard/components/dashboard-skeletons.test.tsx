import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DashboardSkeletons } from './dashboard-skeletons';

describe('DashboardSkeletons Component', () => {
  it('renders root container with accessibility attributes for screen readers', () => {
    render(<DashboardSkeletons />);

    const statusElement = screen.getByRole('status');
    expect(statusElement).toBeInTheDocument();
    expect(statusElement).toHaveAttribute('aria-busy', 'true');
    expect(statusElement).toHaveAttribute('aria-label', expect.stringMatching(/cargando panel/i));
  });

  it('renders geometric skeleton replica for PeriodSelector', () => {
    render(<DashboardSkeletons />);

    const periodSkeleton = screen.getByTestId('skeleton-period-selector');
    expect(periodSkeleton).toBeInTheDocument();
  });

  it('renders geometric skeleton replica for CurrencyKpiCards (2 cards)', () => {
    render(<DashboardSkeletons />);

    const kpiSkeleton = screen.getByTestId('skeleton-kpis');
    expect(kpiSkeleton).toBeInTheDocument();
  });

  it('renders geometric skeleton replicas for Person and Card breakdown sections', () => {
    render(<DashboardSkeletons />);

    expect(screen.getByTestId('skeleton-persons')).toBeInTheDocument();
    expect(screen.getByTestId('skeleton-cards')).toBeInTheDocument();
  });

  it('renders geometric skeleton replica for ActiveInstallmentsSection', () => {
    render(<DashboardSkeletons />);

    expect(screen.getByTestId('skeleton-installments')).toBeInTheDocument();
  });

  it('renders geometric skeleton replica for ProjectionChart', () => {
    render(<DashboardSkeletons />);

    expect(screen.getByTestId('skeleton-projection')).toBeInTheDocument();
  });

  it('contains pulse animation classes to indicate background activity', () => {
    const { container } = render(<DashboardSkeletons />);

    const pulsingElements = container.querySelectorAll('.animate-pulse');
    expect(pulsingElements.length).toBeGreaterThanOrEqual(1);
  });
});
