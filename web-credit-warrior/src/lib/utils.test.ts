import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn utility', () => {
  it('combines simple class names', () => {
    expect(cn('btn', 'btn-primary')).toBe('btn btn-primary');
    expect(cn('flex', 'items-center', 'justify-between')).toBe('flex items-center justify-between');
  });

  it('handles falsy values gracefully', () => {
    expect(cn('btn', undefined, null, false, '')).toBe('btn');
    expect(cn(null, undefined, false)).toBe('');
  });

  it('resolves conflicting Tailwind classes prioritizing the last one', () => {
    // Spacing conflicts
    expect(cn('p-2', 'p-4')).toBe('p-4');
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
    expect(cn('m-2', 'm-4')).toBe('m-4');

    // Color conflicts
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
    expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500');

    // Layout / Display conflicts
    expect(cn('block', 'inline-block')).toBe('inline-block');
  });

  it('supports conditional object syntax', () => {
    const isActive = true;
    const isDisabled = false;

    expect(
      cn('base-class', {
        'active-class': isActive,
        'disabled-class': isDisabled,
      }),
    ).toBe('base-class active-class');
  });

  it('supports arrays and nested structures', () => {
    expect(cn(['btn', ['btn-primary', { 'btn-large': true, 'btn-small': false }]])).toBe(
      'btn btn-primary btn-large',
    );
  });

  it('handles empty inputs', () => {
    expect(cn()).toBe('');
  });
});
