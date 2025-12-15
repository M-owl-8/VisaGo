import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface OnboardingState {
  hasCompletedOnboarding: boolean;
  currentStep: number;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  setCurrentStep: (step: number) => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      hasCompletedOnboarding: false,
      currentStep: 0,
      completeOnboarding: () => set({ hasCompletedOnboarding: true, currentStep: 0 }),
      resetOnboarding: () => set({ hasCompletedOnboarding: false, currentStep: 0 }),
      setCurrentStep: (step: number) => set({ currentStep: step }),
    }),
    {
      name: 'ketdik-onboarding',
    }
  )
);

