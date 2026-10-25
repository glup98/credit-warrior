import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useQuickExpenseKeyboard } from './use-quick-expense-keyboard';

describe('useQuickExpenseKeyboard Hook (Spec 004 T1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('triggers onTrigger callback when pressing "n" key outside editable elements', () => {
    const onTrigger = vi.fn();
    renderHook(() => useQuickExpenseKeyboard({ onTrigger }));

    const event = new KeyboardEvent('keydown', { key: 'n', bubbles: true });
    window.dispatchEvent(event);

    expect(onTrigger).toHaveBeenCalledTimes(1);
  });

  it('triggers onTrigger callback when pressing "N" (uppercase)', () => {
    const onTrigger = vi.fn();
    renderHook(() => useQuickExpenseKeyboard({ onTrigger }));

    const event = new KeyboardEvent('keydown', { key: 'N', bubbles: true });
    window.dispatchEvent(event);

    expect(onTrigger).toHaveBeenCalledTimes(1);
  });

  it('triggers onTrigger callback when pressing "Alt+N"', () => {
    const onTrigger = vi.fn();
    renderHook(() => useQuickExpenseKeyboard({ onTrigger }));

    const event = new KeyboardEvent('keydown', {
      key: 'n',
      altKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);

    expect(onTrigger).toHaveBeenCalledTimes(1);
  });

  it('does NOT trigger when Ctrl+N or Meta+N (Command+N) is pressed without Alt', () => {
    const onTrigger = vi.fn();
    renderHook(() => useQuickExpenseKeyboard({ onTrigger }));

    const ctrlEvent = new KeyboardEvent('keydown', {
      key: 'n',
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(ctrlEvent);

    const metaEvent = new KeyboardEvent('keydown', {
      key: 'n',
      metaKey: true,
      bubbles: true,
    });
    window.dispatchEvent(metaEvent);

    expect(onTrigger).not.toHaveBeenCalled();
  });

  it('does NOT trigger when focus is inside an input element', () => {
    const onTrigger = vi.fn();
    renderHook(() => useQuickExpenseKeyboard({ onTrigger }));

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    const event = new KeyboardEvent('keydown', {
      key: 'n',
      bubbles: true,
    });
    Object.defineProperty(event, 'target', { value: input });
    window.dispatchEvent(event);

    expect(onTrigger).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

  it('does NOT trigger when focus is inside a textarea element', () => {
    const onTrigger = vi.fn();
    renderHook(() => useQuickExpenseKeyboard({ onTrigger }));

    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    textarea.focus();

    const event = new KeyboardEvent('keydown', {
      key: 'n',
      bubbles: true,
    });
    Object.defineProperty(event, 'target', { value: textarea });
    window.dispatchEvent(event);

    expect(onTrigger).not.toHaveBeenCalled();

    document.body.removeChild(textarea);
  });

  it('does NOT trigger when focus is inside a select element', () => {
    const onTrigger = vi.fn();
    renderHook(() => useQuickExpenseKeyboard({ onTrigger }));

    const select = document.createElement('select');
    document.body.appendChild(select);
    select.focus();

    const event = new KeyboardEvent('keydown', {
      key: 'n',
      bubbles: true,
    });
    Object.defineProperty(event, 'target', { value: select });
    window.dispatchEvent(event);

    expect(onTrigger).not.toHaveBeenCalled();

    document.body.removeChild(select);
  });

  it('does NOT trigger when target is contentEditable', () => {
    const onTrigger = vi.fn();
    renderHook(() => useQuickExpenseKeyboard({ onTrigger }));

    const editableDiv = document.createElement('div');
    editableDiv.setAttribute('contenteditable', 'true');
    editableDiv.tabIndex = 0;
    document.body.appendChild(editableDiv);
    editableDiv.focus();

    const event = new KeyboardEvent('keydown', {
      key: 'n',
      bubbles: true,
    });
    editableDiv.dispatchEvent(event);

    expect(onTrigger).not.toHaveBeenCalled();

    document.body.removeChild(editableDiv);
  });

  it('does NOT trigger when enabled is false', () => {
    const onTrigger = vi.fn();
    renderHook(() => useQuickExpenseKeyboard({ onTrigger, enabled: false }));

    const event = new KeyboardEvent('keydown', { key: 'n', bubbles: true });
    window.dispatchEvent(event);

    expect(onTrigger).not.toHaveBeenCalled();
  });

  it('cleans up event listener when unmounted', () => {
    const onTrigger = vi.fn();
    const { unmount } = renderHook(() =>
      useQuickExpenseKeyboard({ onTrigger }),
    );

    unmount();

    const event = new KeyboardEvent('keydown', { key: 'n', bubbles: true });
    window.dispatchEvent(event);

    expect(onTrigger).not.toHaveBeenCalled();
  });
});
