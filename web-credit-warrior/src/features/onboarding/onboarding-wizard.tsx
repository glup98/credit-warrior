'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/query-keys';
import { StepIndicator } from './components/step-indicator';
import { WelcomeStep } from './components/welcome-step';
import { FirstCardStep } from './components/first-card-step';
import { FirstPersonsStep } from './components/first-persons-step';
import type { CardRead, PersonRead } from '@/types/api.types';

export interface OnboardingWizardProps {
  initialStep?: 1 | 2 | 3;
  initialPersons?: PersonRead[];
  initialCard?: CardRead | null;
}

export function OnboardingWizard({
  initialStep = 1,
  initialPersons = [],
  initialCard = null,
}: OnboardingWizardProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<1 | 2 | 3>(initialStep);
  const [createdCard, setCreatedCard] = useState<CardRead | null>(initialCard);
  const [persons, setPersons] = useState<PersonRead[]>(initialPersons);
  const [isFinishing, setIsFinishing] = useState(false);

  const handleFinish = async () => {
    try {
      setIsFinishing(true);

      // Invalidation in cascade: cards, persons, and dashboard (Constitution Rule)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.cards.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.persons.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
      ]);

      toast.success('¡Configuración completada! Bienvenido a tu Dashboard.');
      router.replace('/');
    } catch {
      toast.error('Ocurrió un error al finalizar la configuración.');
    } finally {
      setIsFinishing(false);
    }
  };

  return (
    <div className="w-full max-w-xl space-y-8">
      {/* Indicador de Progreso del Asistente */}
      <div className="flex justify-center">
        <StepIndicator currentStep={step} totalSteps={3} />
      </div>

      {/* Vistas según el paso activo */}
      {step === 1 && <WelcomeStep onNext={() => setStep(2)} />}

      {step === 2 && (
        <FirstCardStep
          createdCard={createdCard}
          onSuccess={(card) => {
            setCreatedCard(card);
            setStep(3);
          }}
          onContinueToStep3={() => setStep(3)}
        />
      )}

      {step === 3 && (
        <FirstPersonsStep
          persons={persons}
          onPersonAdded={(newPerson) => setPersons((prev) => [...prev, newPerson])}
          onPersonDeleted={(id) =>
            setPersons((prev) => prev.filter((p) => p.id !== id))
          }
          onReviewCard={() => setStep(2)}
          onFinish={handleFinish}
          isFinishing={isFinishing}
        />
      )}
    </div>
  );
}
