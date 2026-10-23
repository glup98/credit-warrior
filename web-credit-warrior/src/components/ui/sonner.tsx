'use client';

import * as React from 'react';
import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

export function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-surface group-[.toaster]:text-text-primary group-[.toaster]:border-border-subtle group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-text-muted',
          actionButton:
            'group-[.toast]:bg-accent-clp group-[.toast]:text-canvas font-medium',
          cancelButton:
            'group-[.toast]:bg-elevated group-[.toast]:text-text-muted',
        },
      }}
      {...props}
    />
  );
}
