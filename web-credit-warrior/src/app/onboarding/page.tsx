'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, WifiOff, RefreshCw } from 'lucide-react';
import { useOnboardingStatus } from '@/hooks/use-onboarding-status';
import { OnboardingWizard } from '@/features/onboarding/onboarding-wizard';
import { Button } from '@/components/ui/button';

/**
 * Onboarding Page with reverse-guard against re-entry.
 * Redirects configured users immediately to "/" (Dashboard).
 */
export default function OnboardingPage() {
  const router = useRouter();
  const { isOnboarded, isLoading, isError, initialStep, refetch } =
    useOnboardingStatus();
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    if (isOnboarded && !isLoading && !isError) {
      router.replace('/');
    }
  }, [isOnboarded, isLoading, isError, router]);

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
        className="flex min-h-[50vh] flex-col items-center justify-center text-center"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border-subtle bg-surface text-accent-clp">
          <ShieldCheck className="h-6 w-6 animate-pulse" />
        </div>
        <p className="mt-3 text-sm text-text-muted">Cargando asistente...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div
        role="alert"
        className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center"
      >
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-accent-danger/30 bg-accent-danger/10 text-accent-danger">
          <WifiOff className="h-7 w-7" />
        </div>
        <h2 className="text-lg font-semibold text-text-primary">
          Sin conexión con el backend
        </h2>
        <p className="mt-2 max-w-sm text-sm text-text-muted">
          No pudimos conectar con el servidor para iniciar la configuración.
        </p>
        <div className="mt-6">
          <Button
            type="button"
            onClick={handleRetry}
            disabled={isRetrying}
            className="gap-2 border-border-subtle bg-surface text-text-primary hover:bg-elevated"
          >
            <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
            <span>{isRetrying ? 'Reintentando...' : 'Reintentar'}</span>
          </Button>
        </div>
      </div>
    );
  }

  if (isOnboarded) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex min-h-[50vh] flex-col items-center justify-center text-center"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border-subtle bg-surface text-accent-clp">
          <ShieldCheck className="h-6 w-6 animate-pulse" />
        </div>
        <p className="mt-3 text-sm text-text-muted">
          Entorno ya configurado. Redirigiendo a Dashboard...
        </p>
      </div>
    );
  }

  return <OnboardingWizard initialStep={initialStep} />;
}
