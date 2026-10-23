import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import manifest from './manifest';
import { QueryProvider } from '@/components/providers/query-provider';

describe('Root Layout, Manifest and QueryProvider', () => {
  describe('manifest.ts', () => {
    it('returns valid PWA metadata parameters with dark theme branding', () => {
      const data = manifest();
      expect(data.name).toBe('Credit Warrior Web');
      expect(data.short_name).toBe('CreditWarrior');
      expect(data.display).toBe('standalone');
      expect(data.background_color).toBe('#090A0F');
      expect(data.theme_color).toBe('#090A0F');
      expect(data.start_url).toBe('/');
      expect(data.icons).toHaveLength(3);
      expect(data.icons?.[0]?.src).toBe('/icons/icon-192x192.png');
      expect(data.icons?.[1]?.src).toBe('/icons/icon-512x512.png');
      expect(data.icons?.[2]?.src).toBe('/icons/icon-maskable-512x512.png');
    });
  });

  describe('QueryProvider', () => {
    it('renders children with an isolated QueryClient instance', () => {
      render(
        <QueryProvider>
          <div data-testid="child-element">Contenido Protegido</div>
        </QueryProvider>,
      );
      expect(screen.getByTestId('child-element')).toBeInTheDocument();
      expect(screen.getByText('Contenido Protegido')).toBeInTheDocument();
    });
  });
});
