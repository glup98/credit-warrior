import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CreditCard } from 'lucide-react';
import { MoneyDisplay } from './money-display';
import { CurrencyBadge } from './currency-badge';
import { PersonChip } from './person-chip';
import { EmptyState } from './empty-state';

describe('Shared Domain Components', () => {
  describe('MoneyDisplay', () => {
    it('renders CLP currency formatted with thousands separator and tabular font', () => {
      render(<MoneyDisplay amount="100000" currency="CLP" size="lg" />);
      const element = screen.getByText('$100.000');
      expect(element).toBeInTheDocument();
      expect(element.className).toContain('font-mono');
      expect(element.className).toContain('tabular-nums');
      expect(element.className).toContain('text-accent-clp');
    });

    it('renders USD currency with 2 decimals and US$ prefix', () => {
      render(<MoneyDisplay amount="33.34" currency="USD" size="xl" />);
      const element = screen.getByText('US$33.34');
      expect(element).toBeInTheDocument();
      expect(element.className).toContain('font-mono');
      expect(element.className).toContain('tabular-nums');
      expect(element.className).toContain('text-accent-usd');
    });

    it('handles null and empty amounts with fallback to zero', () => {
      render(<MoneyDisplay amount={null} currency="CLP" />);
      expect(screen.getByText('$0')).toBeInTheDocument();

      render(<MoneyDisplay amount="" currency="USD" />);
      expect(screen.getByText('US$0.00')).toBeInTheDocument();
    });

    it('applies custom className correctly', () => {
      render(
        <MoneyDisplay
          amount="5000"
          currency="CLP"
          className="custom-financial-class"
        />,
      );
      const element = screen.getByText('$5.000');
      expect(element.className).toContain('custom-financial-class');
    });
  });

  describe('CurrencyBadge', () => {
    it('renders CLP badge with emerald styling tokens', () => {
      render(<CurrencyBadge currency="CLP" />);
      const badge = screen.getByText('CLP');
      expect(badge).toBeInTheDocument();
      expect(badge.className).toContain('font-mono');
      expect(badge.className).toContain('text-accent-clp');
      expect(badge.className).toContain('bg-accent-clp/15');
    });

    it('renders USD badge with cyan styling tokens', () => {
      render(<CurrencyBadge currency="USD" />);
      const badge = screen.getByText('USD');
      expect(badge).toBeInTheDocument();
      expect(badge.className).toContain('font-mono');
      expect(badge.className).toContain('text-accent-usd');
      expect(badge.className).toContain('bg-accent-usd/15');
    });
  });

  describe('PersonChip', () => {
    it('renders participant name and custom color indicator', () => {
      const { container } = render(<PersonChip name="Anyi" colorHex="#10B981" />);
      expect(screen.getByText('Anyi')).toBeInTheDocument();
      const dot = container.querySelector('[data-testid="color-dot"]');
      expect(dot).toBeInTheDocument();
      expect(dot).toHaveStyle({ backgroundColor: '#10B981' });
    });

    it('uses fallback color #8A93A6 when colorHex is null or undefined', () => {
      const { container } = render(<PersonChip name="Augusto" colorHex={null} />);
      expect(screen.getByText('Augusto')).toBeInTheDocument();
      const dot = container.querySelector('[data-testid="color-dot"]');
      expect(dot).toBeInTheDocument();
      expect(dot).toHaveStyle({ backgroundColor: '#8A93A6' });
    });
  });

  describe('EmptyState', () => {
    it('renders title, description and icon', () => {
      render(
        <EmptyState
          icon={CreditCard}
          title="No hay tarjetas registradas"
          description="Agrega tu primera tarjeta para comenzar a repartir gastos."
        />,
      );
      expect(screen.getByText('No hay tarjetas registradas')).toBeInTheDocument();
      expect(
        screen.getByText('Agrega tu primera tarjeta para comenzar a repartir gastos.'),
      ).toBeInTheDocument();
    });

    it('renders active CTA button and executes onAction callback when clicked', () => {
      const handleAction = vi.fn();
      render(
        <EmptyState
          title="Sin compras activas"
          actionLabel="Crear compra"
          onAction={handleAction}
        />,
      );

      const actionButton = screen.getByRole('button', { name: 'Crear compra' });
      expect(actionButton).toBeInTheDocument();
      fireEvent.click(actionButton);
      expect(handleAction).toHaveBeenCalledTimes(1);
    });

    it('does not render button when actionLabel or onAction are omitted', () => {
      render(<EmptyState title="Vacío" />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });
});
