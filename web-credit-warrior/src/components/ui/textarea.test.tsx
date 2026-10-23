import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Textarea } from './textarea';

describe('Textarea UI Primitive (Spec 004 T1)', () => {
  it('renders a textarea with default styles and placeholder', () => {
    render(<Textarea placeholder="Escribe notas aquí..." />);

    const textarea = screen.getByPlaceholderText('Escribe notas aquí...');
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveClass('bg-elevated');
    expect(textarea).toHaveClass('border-border-subtle');
    expect(textarea).not.toHaveAttribute('aria-invalid', 'true');
  });

  it('renders with error styles when error prop is true', () => {
    render(<Textarea placeholder="Notas con error" error />);

    const textarea = screen.getByPlaceholderText('Notas con error');
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveClass('border-accent-danger');
    expect(textarea).toHaveAttribute('aria-invalid', 'true');
  });

  it('renders with error styles when aria-invalid is true', () => {
    render(<Textarea placeholder="Notas invalid" aria-invalid="true" />);

    const textarea = screen.getByPlaceholderText('Notas invalid');
    expect(textarea).toHaveClass('border-accent-danger');
    expect(textarea).toHaveAttribute('aria-invalid', 'true');
  });

  it('accepts typing from userEvent', async () => {
    const user = userEvent.setup();
    render(<Textarea placeholder="Escribe algo" />);

    const textarea = screen.getByPlaceholderText('Escribe algo');
    await user.type(textarea, 'Compra de supermercado');

    expect(textarea).toHaveValue('Compra de supermercado');
  });

  it('respects disabled attribute', () => {
    render(<Textarea placeholder="Deshabilitado" disabled />);

    const textarea = screen.getByPlaceholderText('Deshabilitado');
    expect(textarea).toBeDisabled();
    expect(textarea).toHaveClass('disabled:opacity-50');
  });

  it('forwards ref correctly to the HTMLTextAreaElement', () => {
    const ref = React.createRef<HTMLTextAreaElement>();
    render(<Textarea ref={ref} placeholder="Con ref" />);

    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
    expect(ref.current?.placeholder).toBe('Con ref');
  });
});
