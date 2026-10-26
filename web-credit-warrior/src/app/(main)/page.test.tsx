import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import HomePage from './page';

vi.mock('@/features/dashboard/dashboard-view', () => ({
  DashboardView: () => <div data-testid="mock-dashboard-view">Mock Dashboard View Content</div>,
}));

vi.mock('@/features/dashboard/components/dashboard-skeletons', () => ({
  DashboardSkeletons: () => <div data-testid="mock-dashboard-skeletons">Loading Skeletons...</div>,
}));

describe('HomePage (Root Route Spec 006 T10)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('monta DashboardView dentro de un límite de Suspense para compatibilidad con useSearchParams', () => {
    render(<HomePage />);

    expect(screen.getByTestId('mock-dashboard-view')).toBeInTheDocument();
  });
});
