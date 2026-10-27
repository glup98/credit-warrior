'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Componente envoltorio de transición de página fluida (Spec 007 RF-05).
 * Utiliza key={pathname} para disparar una animación de desvanecimiento suave (fade-in)
 * acelerada por GPU al alternar entre rutas principales del App Router.
 * Respeta estrictamente prefers-reduced-motion mediante motion-reduce:animate-none.
 */
export function PageTransition({ children, className }: PageTransitionProps) {
  const pathname = usePathname();

  return (
    <div
      key={pathname}
      className={cn(
        'w-full',
        'motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200 motion-safe:ease-out motion-safe:fill-mode-both',
        'motion-reduce:animate-none',
        className
      )}
    >
      {children}
    </div>
  );
}
