'use client';

import { CheckCircle2, FileCheck, Bot, Shield } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { useTranslation } from 'react-i18next';

const features = [
  {
    icon: CheckCircle2,
    titleKey: 'landing.feature1Title',
    titleDefault: 'Personal Checklist',
    descriptionKey: 'landing.feature1Desc',
    descriptionDefault: 'AI-generated document checklist tailored to your profile, destination, and visa type.',
  },
  {
    icon: FileCheck,
    titleKey: 'landing.feature2Title',
    titleDefault: 'Step-by-Step Instructions',
    descriptionKey: 'landing.feature2Desc',
    descriptionDefault: 'Clear guidance on where and how to obtain each required document.',
  },
  {
    icon: Shield,
    titleKey: 'landing.feature3Title',
    titleDefault: 'Document Validation',
    descriptionKey: 'landing.feature3Desc',
    descriptionDefault: 'AI-powered validation ensures your documents meet embassy requirements before submission.',
  },
  {
    icon: Bot,
    titleKey: 'landing.feature4Title',
    titleDefault: 'AI Chat & Support',
    descriptionKey: 'landing.feature4Desc',
    descriptionDefault: '24/7 AI assistant answers questions about requirements, deadlines, and processes.',
  },
];

export function FeaturesSection() {
  const { t } = useTranslation();

  return (
    <section id="features" className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <h2 className="font-display text-2xl font-bold text-white sm:text-3xl md:text-4xl">
            {t('landing.featuresTitle', 'Everything You Need')}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-white/60 sm:mt-4 sm:text-base md:text-lg">
            {t('landing.featuresSubtitle', 'All the tools you need for a successful visa application')}
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:mt-12 sm:gap-6 md:grid-cols-2">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={index}
                className="glass-panel group border border-white/10 bg-white/[0.03] p-4 transition hover:border-white/20 hover:bg-white/[0.05] sm:p-6 md:p-8"
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary-dark/20 sm:h-12 sm:w-12">
                    <Icon size={20} className="text-primary sm:size-6" />
                  </div>
                  <div>
                    <h3 className="mb-1.5 text-base font-semibold text-white sm:mb-2 sm:text-lg md:text-xl">
                      {t(feature.titleKey, feature.titleDefault)}
                    </h3>
                    <p className="text-xs leading-relaxed text-white/60 sm:text-sm">
                      {t(feature.descriptionKey, feature.descriptionDefault)}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

