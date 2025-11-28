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
    <section id="how-it-works" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
            {t('landing.howItWorksTitle', 'How It Works')}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/60">
            {t('landing.howItWorksSubtitle', 'Four simple steps to your visa application')}
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <Card
                key={index}
                className="glass-panel relative border border-white/10 bg-white/[0.03] p-6 text-center"
              >
                <div className="mb-4 flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary-dark/20">
                    <Icon size={32} className="text-primary" />
                  </div>
                </div>
                <div className="mb-2 text-sm font-semibold text-primary">
                  {t('landing.step', 'Step')} {index + 1}
                </div>
                <h3 className="mb-3 text-lg font-semibold text-white">
                  {t(step.titleKey, step.titleDefault)}
                </h3>
                <p className="text-sm text-white/60">
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

