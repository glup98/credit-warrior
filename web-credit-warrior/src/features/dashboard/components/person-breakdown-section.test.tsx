import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PersonBreakdownSection } from './person-breakdown-section';
import type { PersonMonthlySummary, PersonRead } from '@/types/api.types';

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
  [
    'p-3',
    {
      id: 'p-3',
      name: 'Alan Turing',
      color_hex: null, // Sin color asignado
      is_active: true,
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    },
  ],
]);

const mockByPerson: PersonMonthlySummary[] = [
  {
    person_id: 'p-1',
    person_name: 'Glup',
    totals_by_currency: {
      CLP: '75000',
      USD: '22.75',
    },
  },
  {
    person_id: 'p-2',
    person_name: 'Ada Lovelace',
    totals_by_currency: {
      CLP: '50000',
    },
  },
  {
    person_id: 'p-3',
    person_name: 'Alan Turing',
    totals_by_currency: {
      USD: '15.00',
    },
  },
  {
    person_id: 'p-unknown',
    person_name: 'Grace Hopper',
    totals_by_currency: {
      CLP: '25000',
    },
  },
];

describe('PersonBreakdownSection Component', () => {
  it('renders section title "Cuánto paga cada uno"', () => {
    render(
      <PersonBreakdownSection
        byPerson={mockByPerson}
        personsMap={mockPersonsMap}
      />,
    );

    expect(screen.getByText(/cuánto paga cada uno/i)).toBeInTheDocument();
  });

  it('renders all participants with their names and formatted amounts', () => {
    render(
      <PersonBreakdownSection
        byPerson={mockByPerson}
        personsMap={mockPersonsMap}
      />,
    );

    expect(screen.getByText('Glup')).toBeInTheDocument();
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('Alan Turing')).toBeInTheDocument();
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument();

    // Formateo CLP
    expect(screen.getByText('$75.000')).toBeInTheDocument();
    expect(screen.getByText('$50.000')).toBeInTheDocument();
    expect(screen.getByText('$25.000')).toBeInTheDocument();

    // Formateo USD
    expect(screen.getByText('US$22.75')).toBeInTheDocument();
    expect(screen.getByText('US$15.00')).toBeInTheDocument();
  });

  it('resolves color_hex from personsMap and applies neutral fallback #8A93A6 when missing', () => {
    const { container } = render(
      <PersonBreakdownSection
        byPerson={mockByPerson}
        personsMap={mockPersonsMap}
      />,
    );

    const colorDots = container.querySelectorAll('[data-testid="person-color-badge"]');
    expect(colorDots.length).toBe(4);

    // Glup: #10B981
    expect((colorDots[0] as HTMLElement).style.backgroundColor).toBe('rgb(16, 185, 129)');
    // Ada: #8B5CF6
    expect((colorDots[1] as HTMLElement).style.backgroundColor).toBe('rgb(139, 92, 246)');
    // Alan Turing (color_hex null): fallback #8A93A6
    expect((colorDots[2] as HTMLElement).style.backgroundColor).toBe('rgb(138, 147, 166)');
    // Grace Hopper (unknown person_id): fallback #8A93A6
    expect((colorDots[3] as HTMLElement).style.backgroundColor).toBe('rgb(138, 147, 166)');
  });

  it('renders empty state when byPerson array is empty', () => {
    render(
      <PersonBreakdownSection
        byPerson={[]}
        personsMap={mockPersonsMap}
      />,
    );

    expect(screen.getByText(/no hay cobros a participantes/i)).toBeInTheDocument();
    expect(
      screen.getByText(/ningún participante registra deudas pendientes en este período/i),
    ).toBeInTheDocument();
  });

  it('only renders currencies that have an active positive amount', () => {
    render(
      <PersonBreakdownSection
        byPerson={[
          {
            person_id: 'p-1',
            person_name: 'Glup',
            totals_by_currency: { CLP: '100000', USD: '0' },
          },
        ]}
        personsMap={mockPersonsMap}
      />,
    );

    expect(screen.getByText('$100.000')).toBeInTheDocument();
    expect(screen.queryByText('US$0.00')).not.toBeInTheDocument();
  });
});
