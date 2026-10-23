import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './button';
import { Badge } from './badge';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './card';
import { Toaster } from './sonner';

describe('UI Atomic Components', () => {
  describe('Button', () => {
    it('renders with default variant and text', () => {
      render(<Button>Click me</Button>);
      const btn = screen.getByRole('button', { name: 'Click me' });
      expect(btn).toBeInTheDocument();
      expect(btn.className).toContain('bg-surface');
    });

    it('applies destructive variant styling', () => {
      render(<Button variant="destructive">Eliminar</Button>);
      const btn = screen.getByRole('button', { name: 'Eliminar' });
      expect(btn.className).toContain('text-accent-danger');
    });

    it('respects disabled attribute', () => {
      render(<Button disabled>Disabled</Button>);
      const btn = screen.getByRole('button', { name: 'Disabled' });
      expect(btn).toBeDisabled();
    });
  });

  describe('Badge', () => {
    it('renders badge with text content and default styling', () => {
      render(<Badge>Activo</Badge>);
      expect(screen.getByText('Activo')).toBeInTheDocument();
    });

    it('applies outline and destructive variants', () => {
      render(<Badge variant="outline">Outline</Badge>);
      expect(screen.getByText('Outline').className).toContain('border-border-subtle');

      render(<Badge variant="destructive">Alerta</Badge>);
      expect(screen.getByText('Alerta').className).toContain('text-accent-danger');
    });
  });

  describe('Card', () => {
    it('renders composed card with header, title, description, content and footer', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Título Tarjeta</CardTitle>
            <CardDescription>Descripción breve</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Contenido principal</p>
          </CardContent>
          <CardFooter>
            <span>Pie de tarjeta</span>
          </CardFooter>
        </Card>,
      );

      expect(screen.getByText('Título Tarjeta')).toBeInTheDocument();
      expect(screen.getByText('Descripción breve')).toBeInTheDocument();
      expect(screen.getByText('Contenido principal')).toBeInTheDocument();
      expect(screen.getByText('Pie de tarjeta')).toBeInTheDocument();
    });
  });

  describe('Toaster', () => {
    it('renders dark theme toaster without crash', () => {
      const { container } = render(<Toaster />);
      expect(container).toBeInTheDocument();
    });
  });
});
