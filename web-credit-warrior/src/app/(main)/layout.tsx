'use client';

import React from 'react';
import { OnboardingGuard } from '@/components/layout/onboarding-guard';
import { DesktopSidebar } from '@/components/layout/desktop-sidebar';
import { AppHeader } from '@/components/layout/app-header';
import { BottomNav } from '@/components/layout/bottom-nav';
import { TopProgressBar } from '@/components/layout/top-progress-bar';
import { PageTransition } from '@/components/layout/page-transition';
import { QuickExpenseProvider } from '@/features/expenses/context/quick-expense-context';
import { QuickExpenseDrawer } from '@/features/expenses/components/quick-expense-drawer';
import { useQuickExpenseKeyboard } from '@/features/expenses/hooks/use-quick-expense-keyboard';

export interface MainLayoutProps {
  children: React.ReactNode;
}

function MainLayoutContent({ children }: MainLayoutProps) {
  // Activa el atajo global de teclado Alt+N / N para abrir el registro rápido
  useQuickExpenseKeyboard();

  return (
    <div className="relative min-h-screen bg-canvas">
      {/* Barra de progreso de navegación ultra-rápida acelerada por GPU */}
      <TopProgressBar />

      {/* Desktop Sidebar (visible on >= 768px) */}
      <DesktopSidebar />

      {/* Main Content Area with compensatory padding for DesktopSidebar */}
      <div className="flex min-h-screen flex-col bg-canvas md:pl-64">
        <AppHeader />
        <main className="flex-1 p-4 pb-24 md:p-6 md:pb-8">
          <PageTransition>
            {children}
          </PageTransition>
        </main>
      </div>

      {/* Mobile Bottom Navigation (visible on < 768px) */}
      <BottomNav />

      {/* Drawer Global de Registro Rápido */}
      <QuickExpenseDrawer />
    </div>
  );
}

/**
 * Protected App Shell Layout.
 * Guarded by OnboardingGuard against unconfigured workspace states.
 * Wrapped in QuickExpenseProvider for global expense entry orchestration.
 */
export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <OnboardingGuard>
      <QuickExpenseProvider>
        <MainLayoutContent>{children}</MainLayoutContent>
      </QuickExpenseProvider>
    </OnboardingGuard>
  );
}
