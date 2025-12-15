'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { X, ArrowRight, FileText, Upload, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useOnboardingStore } from '@/lib/stores/onboarding';

const steps = [
  {
    id: 'welcome',
    icon: FileText,
    titleKey: 'onboarding.welcome.title',
    titleDefault: 'Welcome to Ketdik!',
    descriptionKey: 'onboarding.welcome.description',
    descriptionDefault: 'Your AI-powered visa application assistant. Let us guide you through the process.',
  },
  {
    id: 'start-application',
    icon: Upload,
    titleKey: 'onboarding.startApplication.title',
    titleDefault: 'Start Your First Application',
    descriptionKey: 'onboarding.startApplication.description',
    descriptionDefault: 'Answer a few questions about your trip, and we will generate a personalized document checklist.',
  },
  {
    id: 'upload-documents',
    icon: CheckCircle,
    titleKey: 'onboarding.uploadDocuments.title',
    titleDefault: 'Upload & Verify Documents',
    descriptionKey: 'onboarding.uploadDocuments.description',
    descriptionDefault: 'Upload your documents and our AI will verify them instantly. Get real-time feedback and guidance.',
  },
];

export function OnboardingFlow() {
  const { t } = useTranslation();
  const router = useRouter();
  const { completeOnboarding } = useOnboardingStore();
  const [currentStep, setCurrentStep] = useState(0);

  const step = steps[currentStep];
  const Icon = step.icon;
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      completeOnboarding();
      router.push('/questionnaire');
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleSkip = () => {
    completeOnboarding();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-2xl border border-white/20 bg-midnight/95 p-8 shadow-2xl backdrop-blur-xl">
        {/* Close button */}
        <button
          onClick={handleSkip}
          className="absolute right-4 top-4 rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        {/* Icon */}
        <div className="mb-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary-dark/20">
            <Icon size={36} className="text-primary" />
          </div>
        </div>

        {/* Content */}
        <div className="text-center">
          <h2 className="mb-3 text-2xl font-bold text-white">
            {t(step.titleKey, step.titleDefault)}
          </h2>
          <p className="text-sm leading-relaxed text-white/70">
            {t(step.descriptionKey, step.descriptionDefault)}
          </p>
        </div>

        {/* Progress indicators */}
        <div className="mt-8 flex justify-center gap-2">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all ${
                index === currentStep
                  ? 'w-8 bg-primary'
                  : index < currentStep
                  ? 'w-2 bg-primary/50'
                  : 'w-2 bg-white/20'
              }`}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="mt-8 flex items-center justify-between gap-4">
          <button
            onClick={handleSkip}
            className="text-sm text-white/60 transition hover:text-white"
          >
            {t('onboarding.skip', 'Skip tour')}
          </button>
          <Button
            variant="primary"
            onClick={handleNext}
            className="rounded-xl"
          >
            {isLastStep ? (
              <>
                {t('onboarding.getStarted', 'Get Started')}
                <CheckCircle size={18} className="ml-2" />
              </>
            ) : (
              <>
                {t('onboarding.next', 'Next')}
                <ArrowRight size={18} className="ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

