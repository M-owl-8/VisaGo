'use client';

import { FileText, CheckCircle2, MessageCircle, Upload } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { useTranslation } from 'react-i18next';

const steps = [
  {
    icon: FileText,
    titleKey: 'landing.step1Title',
    titleDefault: 'Complete Questionnaire',
    descriptionKey: 'landing.step1Desc',
    descriptionDefault: 'Answer a few questions about your travel plans, destination, and visa type.',
  },
  {
    icon: CheckCircle2,
    titleKey: 'landing.step2Title',
    titleDefault: 'Get Personalized Checklist',
    descriptionKey: 'landing.step2Desc',
    descriptionDefault: 'AI generates a custom document checklist based on your profile and destination.',
  },
  {
    icon: Upload,
    titleKey: 'landing.step3Title',
    titleDefault: 'Upload & Validate Documents',
    descriptionKey: 'landing.step3Desc',
    descriptionDefault: 'Upload your documents securely. Our AI validates them and provides feedback.',
  },
  {
    icon: MessageCircle,
    titleKey: 'landing.step4Title',
    titleDefault: 'Chat with AI Assistant',
    descriptionKey: 'landing.step4Desc',
    descriptionDefault: 'Get instant answers to questions about requirements, deadlines, and next steps.',
  },
];

export function HowItWorksSection() {
  const { t } = useTranslation();

  return (
    <section id="how-it-works" className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <h2 className="font-display text-2xl font-bold text-white sm:text-3xl md:text-4xl">
            {t('landing.howItWorksTitle', 'How It Works')}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-white/60 sm:mt-4 sm:text-base md:text-lg">
            {t('landing.howItWorksSubtitle', 'Four simple steps to your visa application')}
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:mt-12 sm:gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <Card
                key={index}
                className="glass-panel relative border border-white/10 bg-white/[0.03] p-4 text-center sm:p-6"
              >
                <div className="mb-3 flex justify-center sm:mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary-dark/20 sm:h-16 sm:w-16">
                    <Icon size={24} className="text-primary sm:size-8" />
                  </div>
                </div>
                <div className="mb-2 text-xs font-semibold text-primary sm:text-sm">
                  {t('landing.step', 'Step')} {index + 1}
                </div>
                <h3 className="mb-2 text-base font-semibold text-white sm:mb-3 sm:text-lg">
                  {t(step.titleKey, step.titleDefault)}
                </h3>
                <p className="text-xs leading-relaxed text-white/60 sm:text-sm">
                  {t(step.descriptionKey, step.descriptionDefault)}
                </p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

