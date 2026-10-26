import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectionChart } from './projection-chart';
import type {
  DashboardProjectionResponse,
  PersonRead,
} from '@/types/api.types';

// Mock de ResponsiveContainer para garantizar renderizado determinista en jsdom
vi.mock('recharts', async (importOriginal) => {
  const original = await importOriginal<typeof import('recharts')>();
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div
        data-testid="responsive-container"
        className="recharts-responsive-container"
        style={{ width: '100%', height: 280 }}
      >
        {children}
      </div>
    ),
  };
});

const mockPersonsMap = new Map<string, PersonRead>([
  [
    'p-1',
    {
      id: 'p-1',
      name: 'Glup',
      color_hex: '#10B981',
      is_active: true,
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    },
  ],
  [
    'p-2',
    {
      id: 'p-2',
      name: 'Ada Lovelace',
      color_hex: '#8B5CF6',
      is_active: true,
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    },
  ],
]);

const mockProjection: DashboardProjectionResponse = {
  start_period: '2026-11',
  months: 3,
  periods: [
    {
      period: '2026-11',
      totals_by_currency: { CLP: '150000', USD: '45.50' },
      by_card: [],
      by_person: [
        {
          person_id: 'p-1',
          person_name: 'Glup',
          totals_by_currency: { CLP: '100000', USD: '45.50' },
        },
        {
          person_id: 'p-2',
          person_name: 'Ada Lovelace',
          totals_by_currency: { CLP: '50000', USD: '0' },
        },
      ],
      active_installments: [],
    },
    {
      period: '2026-12',
      totals_by_currency: { CLP: '100000', USD: '0.00' },
      by_card: [],
      by_person: [
        {
          person_id: 'p-1',
          person_name: 'Glup',
          totals_by_currency: { CLP: '50000', USD: '0' },
        },
        {
          person_id: 'p-2',
          person_name: 'Ada Lovelace',
          totals_by_currency: { CLP: '50000', USD: '0' },
        },
      ],
      active_installments: [],
    },
    {
      period: '2027-01',
      totals_by_currency: { CLP: '50000', USD: '0.00' },
      by_card: [],
      by_person: [
        {
          person_id: 'p-1',
          person_name: 'Glup',
          totals_by_currency: { CLP: '50000', USD: '0' },
        },
      ],
      active_installments: [],
    },
  ],
};

describe('ProjectionChart Component', () => {
  it('renders section title "Proyección a 6 meses" and currency toggle buttons', () => {
    render(
      <ProjectionChart
        projection={mockProjection}
        personsMap={mockPersonsMap}
      />,
    );

    expect(screen.getByText(/proyección a 6 meses/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'CLP' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'USD' })).toBeInTheDocument();
  });

  it('allows toggling currency between CLP and USD', async () => {
    const user = userEvent.setup();
    render(
      <ProjectionChart
        projection={mockProjection}
        personsMap={mockPersonsMap}
        defaultCurrency="CLP"
      />,
    );

    const usdButton = screen.getByRole('button', { name: 'USD' });
    const clpButton = screen.getByRole('button', { name: 'CLP' });

    expect(clpButton).toHaveAttribute('data-active', 'true');
    expect(usdButton).toHaveAttribute('data-active', 'false');

    await user.click(usdButton);

    expect(usdButton).toHaveAttribute('data-active', 'true');
    expect(clpButton).toHaveAttribute('data-active', 'false');
  });

  it('renders bar chart with segments for each participant', () => {
    const { container } = render(
      <ProjectionChart
        projection={mockProjection}
        personsMap={mockPersonsMap}
        defaultCurrency="CLP"
      />,
    );

    // Debe renderizar el contenedor responsive
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();

    // Recharts Bar elementos en el DOM o leyenda de participantes
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    expect(screen.getByText('Glup')).toBeInTheDocument();
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
  });

  it('calls onSelectPeriod when a period bar or tag is clicked', async () => {
    const user = userEvent.setup();
    const handleSelectPeriod = vi.fn();

    render(
      <ProjectionChart
        projection={mockProjection}
        personsMap={mockPersonsMap}
        onSelectPeriod={handleSelectPeriod}
        defaultCurrency="CLP"
      />,
    );

    // Los botones o etiquetas de período permiten navegación rápida
    const periodButtons = screen.getAllByRole('button', { name: /ver período/i });
    expect(periodButtons.length).toBeGreaterThanOrEqual(1);

    await user.click(periodButtons[0]!);
    expect(handleSelectPeriod).toHaveBeenCalledWith('2026-11');
  });

  it('renders empty projection message when all periods have zero amount in selected currency', async () => {
    const user = userEvent.setup();

    const clpOnlyProjection: DashboardProjectionResponse = {
      start_period: '2026-11',
      months: 2,
      periods: [
        {
          period: '2026-11',
          totals_by_currency: { CLP: '100000', USD: '0.00' },
          by_card: [],
          by_person: [],
          active_installments: [],
        },
        {
          period: '2026-12',
          totals_by_currency: { CLP: '50000', USD: '0' },
          by_card: [],
          by_person: [],
          active_installments: [],
        },
      ],
    };

    render(
      <ProjectionChart
        projection={clpOnlyProjection}
        personsMap={mockPersonsMap}
        defaultCurrency="CLP"
      />,
    );

    // En CLP no es vacío
    expect(
      screen.queryByText(/sin compromisos proyectados en clp/i),
    ).not.toBeInTheDocument();

    // Cambiar a USD
    await user.click(screen.getByRole('button', { name: 'USD' }));

    // En USD es vacío
    expect(
      screen.getByText(/sin compromisos proyectados en usd/i),
    ).toBeInTheDocument();
  });

  it('renders empty state when projection is null or has empty periods', () => {
    render(
      <ProjectionChart
        projection={null}
        personsMap={mockPersonsMap}
      />,
    );

    expect(
      screen.getByText(/no hay datos de proyección disponibles/i),
    ).toBeInTheDocument();
  });
});
