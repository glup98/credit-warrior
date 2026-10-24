import React from 'react';

export interface OnboardingLayoutProps {
  children: React.ReactNode;
}

/**
 * Isolated layout for the onboarding wizard.
 * Provides a distraction-free, centered canvas without App Shell sidebars or bottom navigation.
 */
export default function OnboardingLayout({ children }: OnboardingLayoutProps) {
  return (
    <div className="flex min-h-[100dvh] w-full flex-col items-center justify-center bg-canvas p-4 md:p-8">
      {children}
    </div>
  );
}
