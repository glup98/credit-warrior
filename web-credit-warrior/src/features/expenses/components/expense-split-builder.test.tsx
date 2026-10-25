import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExpenseSplitBuilder } from './expense-split-builder';
import { usePersons } from '@/hooks/queries/use-persons';
import type { PersonRead } from '@/types/api.types';

vi.mock('@/hooks/queries/use-persons', () => ({
  usePersons: vi.fn(),
}));

const mockActivePersons: PersonRead[] = [
  {
    id: 'person-1',
    name: 'Camila Rojas',
    color_hex: '#10B981',
    is_active: true,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
  },
  {
    id: 'person-2',
    name: 'Valentina Soto',
    color_hex: '#8B5CF6',
    is_active: true,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
  },
];

describe('ExpenseSplitBuilder Component (Spec 004 T3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Tabs and Split Mode Selector', () => {
    it('renders tabs for EQUAL, PERCENTAGE and FIXED_AMOUNT and triggers onSplitTypeChange', async () => {
      const user = userEvent.setup();
      vi.mocked(usePersons).mockReturnValue({
        data: mockActivePersons,
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof usePersons>);

      const onSplitTypeChange = vi.fn();
      render(
        <ExpenseSplitBuilder
          splitType="EQUAL"
          onSplitTypeChange={onSplitTypeChange}
          splits={mockActivePersons.map((p) => ({
            person_id: p.id,
            split_type: 'EQUAL',
            percentage: null,
            fixed_amount: null,
          }))}
          onSplitsChange={vi.fn()}
        />,
      );

      expect(screen.getByRole('tab', { name: /partes iguales/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /porcentaje/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /monto fijo/i })).toBeInTheDocument();

      await user.click(screen.getByRole('tab', { name: /porcentaje/i }));
      expect(onSplitTypeChange).toHaveBeenCalledWith('PERCENTAGE');

      await user.click(screen.getByRole('tab', { name: /monto fijo/i }));
      expect(onSplitTypeChange).toHaveBeenCalledWith('FIXED_AMOUNT');
    });
  });

  describe('EQUAL Mode Behavior', () => {
    it('pre-selects all active persons when splits list is initially empty in EQUAL mode', () => {
      vi.mocked(usePersons).mockReturnValue({
        data: mockActivePersons,
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof usePersons>);

      const onSplitsChange = vi.fn();
      render(
        <ExpenseSplitBuilder
          splitType="EQUAL"
          onSplitTypeChange={vi.fn()}
          splits={[]}
          onSplitsChange={onSplitsChange}
        />,
      );

      expect(onSplitsChange).toHaveBeenCalledWith([
        { person_id: 'person-1', split_type: 'EQUAL', percentage: null, fixed_amount: null },
        { person_id: 'person-2', split_type: 'EQUAL', percentage: null, fixed_amount: null },
      ]);
    });

    it('toggles person selection on direct click in EQUAL mode', async () => {
      const user = userEvent.setup();
      vi.mocked(usePersons).mockReturnValue({
        data: mockActivePersons,
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof usePersons>);

      const onSplitsChange = vi.fn();
      const currentSplits = [
        { person_id: 'person-1', split_type: 'EQUAL' as const, percentage: null, fixed_amount: null },
        { person_id: 'person-2', split_type: 'EQUAL' as const, percentage: null, fixed_amount: null },
      ];

      render(
        <ExpenseSplitBuilder
          splitType="EQUAL"
          onSplitTypeChange={vi.fn()}
          splits={currentSplits}
          onSplitsChange={onSplitsChange}
        />,
      );

      // Deseleccionar a Camila Rojas
      const camilaButton = screen.getByRole('button', { name: /camila rojas/i });
      await user.click(camilaButton);

      expect(onSplitsChange).toHaveBeenCalledWith([
        { person_id: 'person-2', split_type: 'EQUAL', percentage: null, fixed_amount: null },
      ]);
    });

    it('does NOT render numeric input fields per person in EQUAL mode', () => {
      vi.mocked(usePersons).mockReturnValue({
        data: mockActivePersons,
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof usePersons>);

      render(
        <ExpenseSplitBuilder
          splitType="EQUAL"
          onSplitTypeChange={vi.fn()}
          splits={mockActivePersons.map((p) => ({
            person_id: p.id,
            split_type: 'EQUAL',
            percentage: null,
            fixed_amount: null,
          }))}
          onSplitsChange={vi.fn()}
        />,
      );

      // No debe haber inputs numéricos para cuotas ni porcentajes
      expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
      expect(screen.queryByPlaceholderText(/%/i)).not.toBeInTheDocument();
      expect(screen.queryByPlaceholderText(/\$/i)).not.toBeInTheDocument();
    });

    it('shows estimated share calculation and server rounding note when total_amount is provided', () => {
      vi.mocked(usePersons).mockReturnValue({
        data: mockActivePersons,
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof usePersons>);

      render(
        <ExpenseSplitBuilder
          splitType="EQUAL"
          onSplitTypeChange={vi.fn()}
          splits={mockActivePersons.map((p) => ({
            person_id: p.id,
            split_type: 'EQUAL',
            percentage: null,
            fixed_amount: null,
          }))}
          onSplitsChange={vi.fn()}
          totalAmount="100000"
          currency="CLP"
        />,
      );

      expect(screen.getByText(/aprox\. \$50\.000 por persona/i)).toBeInTheDocument();
      expect(screen.getByText(/ajuste de redondeo por servidor/i)).toBeInTheDocument();
    });

    it('displays validation alert when 0 persons are selected', () => {
      vi.mocked(usePersons).mockReturnValue({
        data: mockActivePersons,
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof usePersons>);

      render(
        <ExpenseSplitBuilder
          splitType="EQUAL"
          onSplitTypeChange={vi.fn()}
          splits={[]}
          onSplitsChange={vi.fn()}
        />,
      );

      expect(
        screen.getByText(/debes seleccionar al menos un participante/i),
      ).toBeInTheDocument();
    });
  });

  describe('Zero Active Persons Handling', () => {
    it('renders orientative banner with link to /persons when there are 0 active persons', () => {
      vi.mocked(usePersons).mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof usePersons>);

      render(
        <ExpenseSplitBuilder
          splitType="EQUAL"
          onSplitTypeChange={vi.fn()}
          splits={[]}
          onSplitsChange={vi.fn()}
        />,
      );

      expect(
        screen.getByText(/no tienes participantes activos para dividir compras/i),
      ).toBeInTheDocument();

      const linkToPersons = screen.getByRole('link', { name: /crear participante/i });
      expect(linkToPersons).toBeInTheDocument();
      expect(linkToPersons).toHaveAttribute('href', '/persons');
    });
  });

  describe('PERCENTAGE Mode Behavior (Spec 004 T4)', () => {
    it('triggers assisted equal auto-distribution (100.00%) when switching from EQUAL to PERCENTAGE for 2 persons', async () => {
      const user = userEvent.setup();
      vi.mocked(usePersons).mockReturnValue({
        data: mockActivePersons,
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof usePersons>);

      const onSplitTypeChange = vi.fn();
      const onSplitsChange = vi.fn();

      const initialSplits = mockActivePersons.map((p) => ({
        person_id: p.id,
        split_type: 'EQUAL' as const,
        percentage: null,
        fixed_amount: null,
      }));

      render(
        <ExpenseSplitBuilder
          splitType="EQUAL"
          onSplitTypeChange={onSplitTypeChange}
          splits={initialSplits}
          onSplitsChange={onSplitsChange}
        />,
      );

      const percentageTab = screen.getByRole('tab', { name: /porcentaje/i });
      await user.click(percentageTab);

      expect(onSplitTypeChange).toHaveBeenCalledWith('PERCENTAGE');
      expect(onSplitsChange).toHaveBeenCalledWith([
        { person_id: 'person-1', split_type: 'PERCENTAGE', percentage: '50.00', fixed_amount: null },
        { person_id: 'person-2', split_type: 'PERCENTAGE', percentage: '50.00', fixed_amount: null },
      ]);
    });

    it('distributes 100.00% equitably among 3 persons with integer cents (33.34, 33.33, 33.33)', async () => {
      const user = userEvent.setup();
      const threePersons: PersonRead[] = [
        ...mockActivePersons,
        {
          id: 'person-3',
          name: 'Ignacio Silva',
          color_hex: '#3B82F6',
          is_active: true,
          created_at: '2026-10-01T00:00:00Z',
          updated_at: '2026-10-01T00:00:00Z',
        },
      ];

      vi.mocked(usePersons).mockReturnValue({
        data: threePersons,
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof usePersons>);

      const onSplitsChange = vi.fn();

      render(
        <ExpenseSplitBuilder
          splitType="EQUAL"
          onSplitTypeChange={vi.fn()}
          splits={threePersons.map((p) => ({
            person_id: p.id,
            split_type: 'EQUAL' as const,
            percentage: null,
            fixed_amount: null,
          }))}
          onSplitsChange={onSplitsChange}
        />,
      );

      const percentageTab = screen.getByRole('tab', { name: /porcentaje/i });
      await user.click(percentageTab);

      expect(onSplitsChange).toHaveBeenCalledWith([
        { person_id: 'person-1', split_type: 'PERCENTAGE', percentage: '33.34', fixed_amount: null },
        { person_id: 'person-2', split_type: 'PERCENTAGE', percentage: '33.33', fixed_amount: null },
        { person_id: 'person-3', split_type: 'PERCENTAGE', percentage: '33.33', fixed_amount: null },
      ]);
    });

    it('renders percentage inputs and updates value when user types', async () => {
      const user = userEvent.setup();
      vi.mocked(usePersons).mockReturnValue({
        data: mockActivePersons,
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof usePersons>);

      const onSplitsChange = vi.fn();
      const currentSplits = [
        { person_id: 'person-1', split_type: 'PERCENTAGE' as const, percentage: '50.00', fixed_amount: null },
        { person_id: 'person-2', split_type: 'PERCENTAGE' as const, percentage: '50.00', fixed_amount: null },
      ];

      render(
        <ExpenseSplitBuilder
          splitType="PERCENTAGE"
          onSplitTypeChange={vi.fn()}
          splits={currentSplits}
          onSplitsChange={onSplitsChange}
        />,
      );

      const inputCamila = screen.getByLabelText(/porcentaje para camila rojas/i);
      expect(inputCamila).toBeInTheDocument();
      expect(inputCamila).toHaveValue('50.00');

      await user.clear(inputCamila);
      await user.type(inputCamila, '60.00');

      expect(onSplitsChange).toHaveBeenCalled();
    });

    it('recalculates equal percentage distribution when "Distribuir equitativo" is clicked', async () => {
      const user = userEvent.setup();
      vi.mocked(usePersons).mockReturnValue({
        data: mockActivePersons,
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof usePersons>);

      const onSplitsChange = vi.fn();
      const unbalancedSplits = [
        { person_id: 'person-1', split_type: 'PERCENTAGE' as const, percentage: '80.00', fixed_amount: null },
        { person_id: 'person-2', split_type: 'PERCENTAGE' as const, percentage: '10.00', fixed_amount: null },
      ];

      render(
        <ExpenseSplitBuilder
          splitType="PERCENTAGE"
          onSplitTypeChange={vi.fn()}
          splits={unbalancedSplits}
          onSplitsChange={onSplitsChange}
        />,
      );

      const distributeButton = screen.getByRole('button', { name: /distribuir equitativo/i });
      expect(distributeButton).toBeInTheDocument();

      await user.click(distributeButton);

      expect(onSplitsChange).toHaveBeenCalledWith([
        { person_id: 'person-1', split_type: 'PERCENTAGE', percentage: '50.00', fixed_amount: null },
        { person_id: 'person-2', split_type: 'PERCENTAGE', percentage: '50.00', fixed_amount: null },
      ]);
    });
  });

  describe('FIXED_AMOUNT Mode Behavior (Spec 004 T5)', () => {
    it('renders FixedSplitBalance, chips and currency-specific input fields in FIXED_AMOUNT mode', () => {
      vi.mocked(usePersons).mockReturnValue({
        data: mockActivePersons,
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof usePersons>);

      const splits = [
        { person_id: 'person-1', split_type: 'FIXED_AMOUNT' as const, fixed_amount: '40000', percentage: null },
        { person_id: 'person-2', split_type: 'FIXED_AMOUNT' as const, fixed_amount: '30000', percentage: null },
      ];

      render(
        <ExpenseSplitBuilder
          splitType="FIXED_AMOUNT"
          onSplitTypeChange={vi.fn()}
          splits={splits}
          onSplitsChange={vi.fn()}
          totalAmount="100000"
          currency="CLP"
        />,
      );

      expect(screen.getByText(/restante por asignar:\s*\$30\.000/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/monto para camila rojas/i)).toHaveValue('40000');
      expect(screen.getByLabelText(/monto para valentina soto/i)).toHaveValue('30000');
    });

    it('updates fixed amount value when user types into a participant input', async () => {
      const user = userEvent.setup();
      vi.mocked(usePersons).mockReturnValue({
        data: mockActivePersons,
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof usePersons>);

      const onSplitsChange = vi.fn();
      const splits = [
        { person_id: 'person-1', split_type: 'FIXED_AMOUNT' as const, fixed_amount: '40000', percentage: null },
        { person_id: 'person-2', split_type: 'FIXED_AMOUNT' as const, fixed_amount: '30000', percentage: null },
      ];

      render(
        <ExpenseSplitBuilder
          splitType="FIXED_AMOUNT"
          onSplitTypeChange={vi.fn()}
          splits={splits}
          onSplitsChange={onSplitsChange}
          totalAmount="100000"
          currency="CLP"
        />,
      );

      const inputCamila = screen.getByLabelText(/monto para camila rojas/i);
      await user.clear(inputCamila);
      await user.type(inputCamila, '70000');

      expect(onSplitsChange).toHaveBeenCalled();
    });

    it('assigns remaining balance to a person when "Asignar restante" button is clicked', async () => {
      const user = userEvent.setup();
      vi.mocked(usePersons).mockReturnValue({
        data: mockActivePersons,
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof usePersons>);

      const onSplitsChange = vi.fn();
      // Total = 100000. Camila = 40000, Valentina = 30000. Remaining = 30000.
      // If user clicks "Asignar restante" on Camila, Camila should become 40000 + 30000 = 70000.
      const splits = [
        { person_id: 'person-1', split_type: 'FIXED_AMOUNT' as const, fixed_amount: '40000', percentage: null },
        { person_id: 'person-2', split_type: 'FIXED_AMOUNT' as const, fixed_amount: '30000', percentage: null },
      ];

      render(
        <ExpenseSplitBuilder
          splitType="FIXED_AMOUNT"
          onSplitTypeChange={vi.fn()}
          splits={splits}
          onSplitsChange={onSplitsChange}
          totalAmount="100000"
          currency="CLP"
        />,
      );

      const assignButtons = screen.getAllByRole('button', { name: /asignar restante/i });
      expect(assignButtons.length).toBeGreaterThan(0);

      // Click on Camila's "Asignar restante"
      await user.click(assignButtons[0]);

      expect(onSplitsChange).toHaveBeenCalledWith([
        { person_id: 'person-1', split_type: 'FIXED_AMOUNT', fixed_amount: '70000', percentage: null },
        { person_id: 'person-2', split_type: 'FIXED_AMOUNT', fixed_amount: '30000', percentage: null },
      ]);
    });

    it('assigns remaining balance accurately in USD with decimals', async () => {
      const user = userEvent.setup();
      vi.mocked(usePersons).mockReturnValue({
        data: mockActivePersons,
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof usePersons>);

      const onSplitsChange = vi.fn();
      // Total = 100.00. Camila = 60.50, Valentina = 20.25. Remaining = 19.25.
      // If user clicks "Asignar restante" on Valentina: 20.25 + 19.25 = 39.50.
      const splits = [
        { person_id: 'person-1', split_type: 'FIXED_AMOUNT' as const, fixed_amount: '60.50', percentage: null },
        { person_id: 'person-2', split_type: 'FIXED_AMOUNT' as const, fixed_amount: '20.25', percentage: null },
      ];

      render(
        <ExpenseSplitBuilder
          splitType="FIXED_AMOUNT"
          onSplitTypeChange={vi.fn()}
          splits={splits}
          onSplitsChange={onSplitsChange}
          totalAmount="100.00"
          currency="USD"
        />,
      );

      const assignButtons = screen.getAllByRole('button', { name: /asignar restante/i });
      // Click on Valentina's "Asignar restante" (index 1)
      await user.click(assignButtons[1]);

      expect(onSplitsChange).toHaveBeenCalledWith([
        { person_id: 'person-1', split_type: 'FIXED_AMOUNT', fixed_amount: '60.50', percentage: null },
        { person_id: 'person-2', split_type: 'FIXED_AMOUNT', fixed_amount: '39.50', percentage: null },
      ]);
    });
  });
});
