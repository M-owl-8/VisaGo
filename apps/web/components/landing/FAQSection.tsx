'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils/cn';
import { useTranslation } from 'react-i18next';

const faqs = [
  {
    questionKey: 'landing.faq1Question',
    questionDefault: 'Is Ketdik safe?',
    answerKey: 'landing.faq1Answer',
    answerDefault:
      'Yes, Ketdik uses bank-level encryption to protect your data. We never store your passport or sensitive documents in plain text, and all data is synced securely between your mobile app and web dashboard.',
  },
  {
    questionKey: 'landing.faq2Question',
    questionDefault: 'Do you submit applications?',
    answerKey: 'landing.faq2Answer',
    answerDefault:
      'No, Ketdik is a preparation and guidance tool. We help you gather documents, understand requirements, and prepare your application. You submit directly to the embassy or consulate.',
  },
  {
    questionKey: 'landing.faq3Question',
    questionDefault: 'How much does it cost?',
    answerKey: 'landing.faq3Answer',
    answerDefault:
      'Ketdik offers free document checklists and AI chat support. Premium features may include priority support and advanced document validation. Check our pricing page for details.',
  },
  {
    questionKey: 'landing.faq4Question',
    questionDefault: 'Can I use Ketdik on mobile and web?',
    answerKey: 'landing.faq4Answer',
    answerDefault:
      'Yes! Your data syncs automatically between the Ketdik mobile app and web dashboard. Start on one device and continue on another seamlessly.',
  },
];

export function FAQSection() {
  const { t } = useTranslation();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
      <div className="mx-auto max-w-4xl">
        <div className="text-center">
          <h2 className="font-display text-2xl font-bold text-white sm:text-3xl md:text-4xl">
            {t('landing.faqTitle', 'Frequently Asked Questions')}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-white/60 sm:mt-4 sm:text-base md:text-lg">
            {t('landing.faqSubtitle', 'Everything you need to know about Ketdik')}
          </p>
        </div>

        <div className="mt-8 space-y-3 sm:mt-12 sm:space-y-4">
          {faqs.map((faq, index) => (
            <Card
              key={index}
              className="glass-panel border border-white/10 bg-white/[0.03] overflow-hidden transition hover:border-white/20"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="flex w-full items-center justify-between p-4 text-left sm:p-6"
              >
                <h3 className="pr-4 text-base font-semibold text-white sm:text-lg">
                  {t(faq.questionKey, faq.questionDefault)}
                </h3>
                <ChevronDown
                  size={18}
                  className={cn(
                    'shrink-0 text-white/60 transition-transform sm:size-5',
                    openIndex === index && 'rotate-180'
                  )}
                />
              </button>
              {openIndex === index && (
                <div className="border-t border-white/10 px-4 pb-4 pt-3 sm:px-6 sm:pb-6 sm:pt-4">
                  <p className="text-sm leading-relaxed text-white/70 sm:text-base">
                    {t(faq.answerKey, faq.answerDefault)}
                  </p>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

