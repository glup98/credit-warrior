'use client';

import * as React from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

/**
 * Evento personalizado para disparar programáticamente el inicio de la barra de progreso
 */
export const CW_NAVIGATION_START_EVENT = 'cw:navigation-start';

/**
 * Barra de progreso superior instantánea acelerada por hardware (GPU).
 * - Se activa a 0ms ante clics en enlaces internos o eventos de navegación.
 * - Anima transform: scaleX(...) y opacity (cero reflows/layout shifts).
 * - Sombra y gradiente semántico Emerald CLP (#10B981) a Cyan USD (#38BDF8).
 * - Finaliza automáticamente al sincronizarse el cambio de pathname/searchParams.
 */
export function TopProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [progress, setProgress] = React.useState(0);
  const [opacity, setOpacity] = React.useState(0);
  const [isReducedMotion, setIsReducedMotion] = React.useState(false);

  const isNavigatingRef = React.useRef(false);
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const safetyTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastUrlRef = React.useRef<string>('');

  // Detección de preferencia prefers-reduced-motion
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setIsReducedMotion(mediaQuery.matches);

      const listener = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', listener);
        return () => mediaQuery.removeEventListener('change', listener);
      }
    } catch {
      // Ignorar en entornos sin matchMedia
    }
  }, []);

  const clearAllTimers = React.useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
    if (fadeTimerRef.current) {
      clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
  }, []);

  const completeNavigation = React.useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }

    if (!isNavigatingRef.current) return;

    setProgress(1);

    fadeTimerRef.current = setTimeout(() => {
      setOpacity(0);
    }, 80);

    resetTimerRef.current = setTimeout(() => {
      setProgress(0);
      isNavigatingRef.current = false;
    }, 230);
  }, []);

  const startNavigation = React.useCallback(() => {
    clearAllTimers();
    isNavigatingRef.current = true;
    setOpacity(1);
    setProgress(0.25);

    // Avance orgánico hacia ~80%
    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 0.8) return prev;
        const remaining = 0.8 - prev;
        const step = remaining * 0.15;
        return Math.min(0.8, prev + Math.max(0.01, step));
      });
    }, 200);

    // Temporizador de seguridad de 8s ante navegaciones interrumpidas
    safetyTimerRef.current = setTimeout(() => {
      completeNavigation();
    }, 8000);
  }, [clearAllTimers, completeNavigation]);

  // Interceptor global de clics en enlaces internos
  React.useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;

      const target = e.target as HTMLElement | null;
      const anchor = target?.closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
      if (anchor.target && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;

      try {
        const url = new URL(anchor.href, window.location.href);
        if (url.origin !== window.location.origin) return;

        const currentPath = window.location.pathname + window.location.search;
        const targetPath = url.pathname + url.search;
        if (currentPath === targetPath) return;

        startNavigation();
      } catch {
        // Ignorar URLs inválidas
      }
    };

    const handleCustomStart = () => {
      startNavigation();
    };

    document.addEventListener('click', handleClick, { capture: true });
    window.addEventListener(CW_NAVIGATION_START_EVENT, handleCustomStart);

    return () => {
      document.removeEventListener('click', handleClick, { capture: true });
      window.removeEventListener(CW_NAVIGATION_START_EVENT, handleCustomStart);
    };
  }, [startNavigation]);

  // Observador de finalización cuando cambia pathname o searchParams
  React.useEffect(() => {
    const currentUrl =
      (pathname || '/') +
      (searchParams && searchParams.toString() ? '?' + searchParams.toString() : '');

    if (!lastUrlRef.current) {
      lastUrlRef.current = currentUrl;
      return;
    }

    if (lastUrlRef.current !== currentUrl) {
      lastUrlRef.current = currentUrl;
      if (isNavigatingRef.current) {
        completeNavigation();
      }
    }
  }, [pathname, searchParams, completeNavigation]);

  // Limpieza al desmontar
  React.useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);

  return (
    <div
      data-testid="top-progress-bar"
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-50 h-[2.5px] pointer-events-none overflow-hidden"
    >
      <div
        data-testid="top-progress-bar-indicator"
        className={cn(
          'h-full w-full origin-left bg-gradient-to-r from-accent-clp via-accent-usd to-accent-clp shadow-[0_0_8px_rgba(56,189,248,0.7)]',
          isReducedMotion ? 'duration-0' : 'transition-all duration-200 ease-out',
        )}
        style={{
          transform: `scaleX(${progress})`,
          opacity,
        }}
      />
    </div>
  );
}
