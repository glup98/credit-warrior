import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  QuickExpenseProvider,
  useQuickExpense,
} from './quick-expense-context';

function TestConsumer() {
  const { isOpen, open, close, setIsOpen } = useQuickExpense();

  return (
    <div>
      <span data-testid="status">{isOpen ? 'OPEN' : 'CLOSED'}</span>
      <button onClick={open}>Abrir</button>
      <button onClick={close}>Cerrar</button>
      <button onClick={() => setIsOpen(!isOpen)}>Toggle</button>
    </div>
  );
}

describe('QuickExpenseContext (Spec 004 T1)', () => {
  it('throws an error if useQuickExpense is used outside QuickExpenseProvider', () => {
    // Silenciar console.error para la prueba de excepción controlada
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useQuickExpense());
    }).toThrow(/useQuickExpense must be used within a QuickExpenseProvider/i);

    spy.mockRestore();
  });

  it('provides default closed state (isOpen: false)', () => {
    render(
      <QuickExpenseProvider>
        <TestConsumer />
      </QuickExpenseProvider>,
    );

    expect(screen.getByTestId('status')).toHaveTextContent('CLOSED');
  });

  it('updates isOpen state when calling open() and close()', async () => {
    const user = userEvent.setup();
    render(
      <QuickExpenseProvider>
        <TestConsumer />
      </QuickExpenseProvider>,
    );

    expect(screen.getByTestId('status')).toHaveTextContent('CLOSED');

    await user.click(screen.getByRole('button', { name: /abrir/i }));
    expect(screen.getByTestId('status')).toHaveTextContent('OPEN');

    await user.click(screen.getByRole('button', { name: /cerrar/i }));
    expect(screen.getByTestId('status')).toHaveTextContent('CLOSED');
  });

  it('updates isOpen state when calling setIsOpen directly', async () => {
    const user = userEvent.setup();
    render(
      <QuickExpenseProvider>
        <TestConsumer />
      </QuickExpenseProvider>,
    );

    await user.click(screen.getByRole('button', { name: /toggle/i }));
    expect(screen.getByTestId('status')).toHaveTextContent('OPEN');

    await user.click(screen.getByRole('button', { name: /toggle/i }));
    expect(screen.getByTestId('status')).toHaveTextContent('CLOSED');
  });
});
