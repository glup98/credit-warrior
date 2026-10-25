import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { InstallmentsSelector } from './installments-selector';

describe('InstallmentsSelector (Spec 004 T6)', () => {
  it('renders quick selection buttons for 1, 3, 6, 12 installments and manual input', () => {
    render(<InstallmentsSelector value={1} onChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: /1 \(contado\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^3$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^6$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^12$/i })).toBeInTheDocument();

    const manualInput = screen.getByLabelText(/cuotas manual/i);
    expect(manualInput).toBeInTheDocument();
    expect(manualInput).toHaveValue(1);
  });

  it('marks button as active/pressed when value matches quick option', () => {
    render(<InstallmentsSelector value={3} onChange={vi.fn()} />);

    const button3 = screen.getByRole('button', { name: /^3$/i });
    expect(button3).toHaveAttribute('aria-pressed', 'true');

    const button1 = screen.getByRole('button', { name: /1 \(contado\)/i });
    expect(button1).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onChange with selected number when clicking a quick button', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<InstallmentsSelector value={1} onChange={handleChange} />);

    const button6 = screen.getByRole('button', { name: /^6$/i });
    await user.click(button6);

    expect(handleChange).toHaveBeenCalledWith(6);
  });

  it('calls onChange when typing in manual number input', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<InstallmentsSelector value={1} onChange={handleChange} />);

    const manualInput = screen.getByLabelText(/cuotas manual/i);
    await user.clear(manualInput);
    await user.type(manualInput, '18');

    expect(handleChange).toHaveBeenCalledWith(18);
  });

  it('unselects quick buttons when manual value does not match 1, 3, 6 or 12', () => {
    render(<InstallmentsSelector value={5} onChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: /1 \(contado\)/i })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: /^3$/i })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: /^6$/i })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: /^12$/i })).toHaveAttribute('aria-pressed', 'false');

    expect(screen.getByLabelText(/cuotas manual/i)).toHaveValue(5);
  });

  it('renders error message when error prop is provided', () => {
    render(
      <InstallmentsSelector
        value={1}
        onChange={vi.fn()}
        error="Máximo 120 cuotas"
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(/máximo 120 cuotas/i);
  });
});
