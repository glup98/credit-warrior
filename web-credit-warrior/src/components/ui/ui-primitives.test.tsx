import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from './input';
import { Label } from './label';

describe('Form UI Primitives', () => {
  describe('Input', () => {
    it('renders with placeholder and value', () => {
      render(<Input placeholder="Nombre de tarjeta" defaultValue="Visa Infinite" />);
      const input = screen.getByPlaceholderText('Nombre de tarjeta');
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('Visa Infinite');
    });

    it('applies custom className alongside default classes', () => {
      render(<Input placeholder="Test" className="custom-input-class" />);
      const input = screen.getByPlaceholderText('Test');
      expect(input.className).toContain('custom-input-class');
      expect(input.className).toContain('bg-elevated');
      expect(input.className).toContain('border-border-subtle');
    });

    it('applies default focus ring when there is no error', () => {
      render(<Input placeholder="Sin error" />);
      const input = screen.getByPlaceholderText('Sin error');
      expect(input.className).toContain('focus-visible:ring-accent-clp');
      expect(input.className).not.toContain('border-accent-danger');
      expect(input).not.toHaveAttribute('aria-invalid', 'true');
    });

    it('applies error styling and aria-invalid when error prop is true', () => {
      render(<Input placeholder="Con error" error />);
      const input = screen.getByPlaceholderText('Con error');
      expect(input.className).toContain('border-accent-danger');
      expect(input.className).toContain('focus-visible:ring-accent-danger');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('applies error styling when aria-invalid is explicitly set to true', () => {
      render(<Input placeholder="Aria invalid" aria-invalid="true" />);
      const input = screen.getByPlaceholderText('Aria invalid');
      expect(input.className).toContain('border-accent-danger');
      expect(input.className).toContain('focus-visible:ring-accent-danger');
    });

    it('respects disabled state', () => {
      render(<Input placeholder="Deshabilitado" disabled />);
      const input = screen.getByPlaceholderText('Deshabilitado');
      expect(input).toBeDisabled();
      expect(input.className).toContain('disabled:cursor-not-allowed');
      expect(input.className).toContain('disabled:opacity-50');
    });

    it('forwards ref correctly to HTMLInputElement', () => {
      const ref = React.createRef<HTMLInputElement>();
      render(<Input placeholder="Ref test" ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
      expect(ref.current?.placeholder).toBe('Ref test');
    });

    it('handles onChange and user typing correctly', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<Input placeholder="Escribe aquí" onChange={handleChange} />);
      const input = screen.getByPlaceholderText('Escribe aquí');

      await user.type(input, '1234');
      expect(handleChange).toHaveBeenCalled();
      expect(input).toHaveValue('1234');
    });
  });

  describe('Label', () => {
    it('renders text with base styling', () => {
      render(<Label>Nombre de la tarjeta</Label>);
      const label = screen.getByText('Nombre de la tarjeta');
      expect(label).toBeInTheDocument();
      expect(label.className).toContain('text-sm');
      expect(label.className).toContain('font-medium');
      expect(label.className).toContain('text-text-primary');
    });

    it('applies custom className', () => {
      render(<Label className="custom-label">Etiqueta</Label>);
      const label = screen.getByText('Etiqueta');
      expect(label.className).toContain('custom-label');
      expect(label.className).toContain('text-sm');
    });

    it('forwards ref correctly to HTMLLabelElement', () => {
      const ref = React.createRef<HTMLLabelElement>();
      render(<Label ref={ref}>Con Ref</Label>);
      expect(ref.current).toBeInstanceOf(HTMLLabelElement);
      expect(ref.current?.textContent).toBe('Con Ref');
    });

    it('associates with an Input via htmlFor and focuses input when label is clicked', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <Label htmlFor="card-name">Nombre de tarjeta</Label>
          <Input id="card-name" placeholder="Ej. CMR Falabella" />
        </div>,
      );

      const input = screen.getByLabelText('Nombre de tarjeta');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('id', 'card-name');

      const label = screen.getByText('Nombre de tarjeta');
      await user.click(label);
      expect(input).toHaveFocus();
    });
  });
});
