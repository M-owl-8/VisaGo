'use client';

import { Card } from '@/components/ui/Card';
import { useTranslation } from 'react-i18next';

const countries = [
  { code: 'us', name: 'United States', flag: '🇺🇸' },
  { code: 'ca', name: 'Canada', flag: '🇨🇦' },
  { code: 'gb', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'au', name: 'Australia', flag: '🇦🇺' },
  { code: 'de', name: 'Germany', flag: '🇩🇪' },
  { code: 'fr', name: 'France', flag: '🇫🇷' },
  { code: 'es', name: 'Spain', flag: '🇪🇸' },
  { code: 'it', name: 'Italy', flag: '🇮🇹' },
  { code: 'jp', name: 'Japan', flag: '🇯🇵' },
  { code: 'ae', name: 'UAE', flag: '🇦🇪' },
];

export function CountriesSection() {
  const { t } = useTranslation();

  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
            {t('landing.countriesTitle', 'Supported Countries')}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/60">
            {t('landing.countriesSubtitle', 'We support visa applications for these popular destinations')}
          </p>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
          {countries.map((country) => (
            <Card
              key={country.code}
              className="glass-panel flex flex-col items-center justify-center border border-white/10 bg-white/[0.03] p-6 text-center transition hover:border-white/20 hover:bg-white/[0.05]"
            >
              <div className="mb-2 text-4xl">{country.flag}</div>
              <div className="text-sm font-medium text-white">{country.name}</div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

