/**
 * Visa Type Translations
 * Maps common visa type names to translations
 */

const visaTypeTranslations: Record<string, Record<string, string>> = {
  'Student Visa': {
    en: 'Student Visa',
    ru: 'Студенческая виза',
    uz: "Talaba vizasi",
  },
  'Tourist Visa': {
    en: 'Tourist Visa',
    ru: 'Туристическая виза',
    uz: 'Turistik viza',
  },
  'Business Visa': {
    en: 'Business Visa',
    ru: 'Деловая виза',
    uz: 'Biznes vizasi',
  },
  'Work Visa': {
    en: 'Work Visa',
    ru: 'Рабочая виза',
    uz: 'Ish vizasi',
  },
  'Transit Visa': {
    en: 'Transit Visa',
    ru: 'Транзитная виза',
    uz: 'Tranzit vizasi',
  },
  'Medical Visa': {
    en: 'Medical Visa',
    ru: 'Медицинская виза',
    uz: 'Tibbiy viza',
  },
};

/**
 * Get translated visa type name
 * @param visaTypeName - Original visa type name from backend
 * @param language - Language code (en, ru, uz)
 * @returns Translated visa type name or original if translation not found
 */
export function getTranslatedVisaTypeName(
  visaTypeName: string | null | undefined,
  language: string = 'en'
): string {
  if (!visaTypeName) {
    return '';
  }

  const normalizedName = visaTypeName.trim();
  const lang = language.toLowerCase() as 'en' | 'ru' | 'uz';

  // Check if we have a translation for this visa type
  if (visaTypeTranslations[normalizedName]) {
    return visaTypeTranslations[normalizedName][lang] || visaTypeTranslations[normalizedName].en || normalizedName;
  }

  // Return original name if no translation found
  return normalizedName;
}

