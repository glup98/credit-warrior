import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Polyfill PointerCapture methods for JSDOM (used by Vaul Drawer and Radix primitives)
if (typeof Element !== 'undefined') {
  Element.prototype.setPointerCapture = Element.prototype.setPointerCapture || vi.fn();
  Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture || vi.fn();
  Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture || vi.fn();
}

// Polyfill window.matchMedia and getComputedStyle.transform for JSDOM environment (used by Vaul Drawer and responsive checks)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('(min-width: 768px)'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  const originalGetComputedStyle = window.getComputedStyle;
  window.getComputedStyle = function (elt: Element, pseudoElt?: string | null) {
    const style = originalGetComputedStyle.call(window, elt, pseudoElt);
    if (!style.transform) {
      style.transform = 'none';
    }
    return style;
  };
}
