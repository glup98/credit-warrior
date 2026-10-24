'use client';
import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ShieldCheck, WifiOff, RefreshCw } from 'lucide-react';
import { useOnboardingStatus } from '@/hooks/use-onboarding-status';
import { Button } from '@/components/ui/button';

export interface OnboardingGuardProps {
  children: React.ReactNode;
}

/**
 * Route protection guard for the (main) App Shell.
 * Ensures that users cannot view an unconfigured workspace (0 active cards or 0 active persons)
 * while allowing catalog management pages (/cards and /persons) to remain accessible
 * when all entities are archived or deleted.
 * Guards against infinite redirection loops when network failures occur.
 */
export function OnboardingGuard({ children }: OnboardingGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isCatalogRoute = pathname?.startsWith('/cards') || pathname?.startsWith('/persons');

  const { isOnboarded, isLoading, isError, needsOnboarding, refetch } = useOnboardingStatus();
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    if (needsOnboarding && !isLoading && !isError && !isCatalogRoute) {
      router.replace('/onboarding');
    }
  }, [needsOnboarding, isLoading, isError, isCatalogRoute, router]);

  const handleRetry = async () => {
    try {
      setIsRetrying(true);
      await refetch();
    } finally {
      setIsRetrying(false);
    }
  };

  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex min-h-screen w-full flex-col items-center justify-center bg-canvas p-4 text-center"
      >
        <div className="relative mb-4 flex items-center justify-center">
          <div className="absolute h-16 w-16 animate-ping rounded-full bg-accent-clp/20" />
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border-subtle bg-surface text-accent-clp shadow-lg">
            <ShieldCheck className="h-8 w-8 animate-pulse text-accent-clp" />
          </div>
        </div>
        <p className="text-sm font-medium text-text-muted">
          Verificando configuración...
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <div
        role="alert"
        className="flex min-h-screen w-full flex-col items-center justify-center bg-canvas p-6 text-center"
      >
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-accent-danger/30 bg-accent-danger/10 text-accent-danger shadow-lg">
          <WifiOff className="h-7 w-7" />
        </div>
        <h2 className="text-lg font-semibold text-text-primary">
          Sin conexión con el backend
        </h2>
        <p className="mt-2 max-w-sm text-sm text-text-muted">
          No pudimos verificar el estado de tus tarjetas y participantes. Revisa que el servidor esté activo.
        </p>
        <div className="mt-6">
          <Button
            type="button"
            onClick={handleRetry}
            disabled={isRetrying}
            className="gap-2 border-border-subtle bg-surface text-text-primary hover:bg-elevated"
          >
            <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
            <span>{isRetrying ? 'Reintentando...' : 'Reintentar conexión'}</span>
          </Button>
        </div>
      </div>
    );
  }

  if ((needsOnboarding || !isOnboarded) && !isCatalogRoute) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex min-h-screen w-full flex-col items-center justify-center bg-canvas p-4 text-center"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border-subtle bg-surface text-accent-clp">
          <ShieldCheck className="h-6 w-6 animate-pulse text-accent-clp" />
        </div>
        <p className="mt-3 text-sm text-text-muted">
          Redirigiendo a configuración inicial...
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
