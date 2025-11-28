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
    <section id="features" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
            {t('landing.featuresTitle', 'Everything You Need')}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/60">
            {t('landing.featuresSubtitle', 'All the tools you need for a successful visa application')}
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={index}
                className="glass-panel group border border-white/10 bg-white/[0.03] p-8 transition hover:border-white/20 hover:bg-white/[0.05]"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary-dark/20">
                    <Icon size={24} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="mb-2 text-xl font-semibold text-white">
                      {t(feature.titleKey, feature.titleDefault)}
                    </h3>
                    <p className="text-white/60">
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

