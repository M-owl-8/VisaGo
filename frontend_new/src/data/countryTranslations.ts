/**
 * Country name translations
 * Maps country codes to translated names in different languages
 */

export const countryTranslations: Record<string, Record<string, string>> = {
  // United States
  US: {
    en: 'United States',
    ru: 'Соединенные Штаты',
    uz: 'Qo\'shma Shtatlar',
  },
  // Australia
  AU: {
    en: 'Australia',
    ru: 'Австралия',
    uz: 'Avstraliya',
  },
  // United Kingdom
  GB: {
    en: 'United Kingdom',
    ru: 'Великобритания',
    uz: 'Birlashgan Qirollik',
  },
  // Canada
  CA: {
    en: 'Canada',
    ru: 'Канада',
    uz: 'Kanada',
  },
  // Germany
  DE: {
    en: 'Germany',
    ru: 'Германия',
    uz: 'Germaniya',
  },
  // France
  FR: {
    en: 'France',
    ru: 'Франция',
    uz: 'Fransiya',
  },
  // Italy
  IT: {
    en: 'Italy',
    ru: 'Италия',
    uz: 'Italiya',
  },
  // Spain
  ES: {
    en: 'Spain',
    ru: 'Испания',
    uz: 'Ispaniya',
  },
  // Netherlands
  NL: {
    en: 'Netherlands',
    ru: 'Нидерланды',
    uz: 'Niderlandiya',
  },
  // Switzerland
  CH: {
    en: 'Switzerland',
    ru: 'Швейцария',
    uz: 'Shveytsariya',
  },
  // Japan
  JP: {
    en: 'Japan',
    ru: 'Япония',
    uz: 'Yaponiya',
  },
  // South Korea
  KR: {
    en: 'South Korea',
    ru: 'Южная Корея',
    uz: 'Janubiy Koreya',
  },
  // China
  CN: {
    en: 'China',
    ru: 'Китай',
    uz: 'Xitoy',
  },
  // India
  IN: {
    en: 'India',
    ru: 'Индия',
    uz: 'Hindiston',
  },
  // Singapore
  SG: {
    en: 'Singapore',
    ru: 'Сингапур',
    uz: 'Singapur',
  },
  // New Zealand
  NZ: {
    en: 'New Zealand',
    ru: 'Новая Зеландия',
    uz: 'Yangi Zelandiya',
  },
  // Sweden
  SE: {
    en: 'Sweden',
    ru: 'Швеция',
    uz: 'Shvetsiya',
  },
  // Norway
  NO: {
    en: 'Norway',
    ru: 'Норвегия',
    uz: 'Norvegiya',
  },
  // Denmark
  DK: {
    en: 'Denmark',
    ru: 'Дания',
    uz: 'Daniya',
  },
  // Finland
  FI: {
    en: 'Finland',
    ru: 'Финляндия',
    uz: 'Finlandiya',
  },
  // Poland
  PL: {
    en: 'Poland',
    ru: 'Польша',
    uz: 'Polsha',
  },
  // Portugal
  PT: {
    en: 'Portugal',
    ru: 'Португалия',
    uz: 'Portugaliya',
  },
  // Greece
  GR: {
    en: 'Greece',
    ru: 'Греция',
    uz: 'Gretsiya',
  },
  // Turkey
  TR: {
    en: 'Turkey',
    ru: 'Турция',
    uz: 'Turkiya',
  },
  // Russia
  RU: {
    en: 'Russia',
    ru: 'Россия',
    uz: 'Rossiya',
  },
  // UAE
  AE: {
    en: 'United Arab Emirates',
    ru: 'Объединенные Арабские Эмираты',
    uz: 'Birlashgan Arab Amirliklari',
  },
  // Saudi Arabia
  SA: {
    en: 'Saudi Arabia',
    ru: 'Саудовская Аравия',
    uz: 'Saudiya Arabistoni',
  },
  // Qatar
  QA: {
    en: 'Qatar',
    ru: 'Катар',
    uz: 'Qatar',
  },
  // Malaysia
  MY: {
    en: 'Malaysia',
    ru: 'Малайзия',
    uz: 'Malayziya',
  },
  // Thailand
  TH: {
    en: 'Thailand',
    ru: 'Таиланд',
    uz: 'Tailand',
  },
  // Indonesia
  ID: {
    en: 'Indonesia',
    ru: 'Индонезия',
    uz: 'Indoneziya',
  },
  // Philippines
  PH: {
    en: 'Philippines',
    ru: 'Филиппины',
    uz: 'Filippin',
  },
  // Brazil
  BR: {
    en: 'Brazil',
    ru: 'Бразилия',
    uz: 'Braziliya',
  },
  // Mexico
  MX: {
    en: 'Mexico',
    ru: 'Мексика',
    uz: 'Meksika',
  },
  // Argentina
  AR: {
    en: 'Argentina',
    ru: 'Аргентина',
    uz: 'Argentina',
  },
  // South Africa
  ZA: {
    en: 'South Africa',
    ru: 'Южная Африка',
    uz: 'Janubiy Afrika',
  },
  // Egypt
  EG: {
    en: 'Egypt',
    ru: 'Египет',
    uz: 'Misr',
  },
  // Israel
  IL: {
    en: 'Israel',
    ru: 'Израиль',
    uz: 'Isroil',
  },
};

/**
 * Get translated country name
 * @param countryCode - ISO 3166-1 alpha-2 country code
 * @param language - Language code (en, ru, uz)
 * @param fallbackName - Fallback name if translation not found
 * @returns Translated country name
 */
export const getTranslatedCountryName = (
  countryCode: string,
  language: string,
  fallbackName: string
): string => {
  const translations = countryTranslations[countryCode.toUpperCase()];
  if (translations && translations[language]) {
    return translations[language];
  }
  return fallbackName;
};

