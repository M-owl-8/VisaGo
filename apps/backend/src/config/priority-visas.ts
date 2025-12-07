/**
 * Priority Visa Countries Configuration
 *
 * This file defines the 10 priority destination countries that the AI system
 * is optimized for. These are the countries where we ensure expert-level
 * visa consultant quality with rules-first behavior, comprehensive prompts,
 * and robust fallback mechanisms.
 *
 * For each country, we specify:
 * - Country code (ISO 3166-1 alpha-2)
 * - Country name
 * - Whether it's a Schengen country (for shared visa rules)
 * - Supported visa purposes (tourist and/or student)
 *
 * These countries are prioritized for:
 * - Rules-based checklist generation (VisaRuleSet)
 * - Expert-level prompt engineering
 * - Embassy source integration
 * - Comprehensive fallback checklists
 *
 * @module priority-visas
 */

export type VisaPurpose = 'tourist' | 'student';

export interface PriorityVisaCountry {
  /** ISO 3166-1 alpha-2 country code (e.g., "US", "GB", "DE") */
  code: string;
  /** Full country name (e.g., "United States", "United Kingdom") */
  name: string;
  /** Whether this country is part of the Schengen Area */
  isSchengen?: boolean;
  /** Supported visa purposes for this country */
  supportedPurposes: VisaPurpose[];
}

/**
 * 10 Priority Destination Countries
 *
 * These are the countries we optimize AI quality for first.
 * Focus: Tourist and Student visas for Uzbek applicants.
 */
export const PRIORITY_VISA_COUNTRIES: PriorityVisaCountry[] = [
  {
    code: 'US',
    name: 'United States',
    isSchengen: false,
    supportedPurposes: ['tourist', 'student'],
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    isSchengen: false,
    supportedPurposes: ['tourist', 'student'],
  },
  {
    code: 'CA',
    name: 'Canada',
    isSchengen: false,
    supportedPurposes: ['tourist', 'student'],
  },
  {
    code: 'AU',
    name: 'Australia',
    isSchengen: false,
    supportedPurposes: ['tourist', 'student'],
  },
  {
    code: 'DE',
    name: 'Germany',
    isSchengen: true,
    supportedPurposes: ['tourist', 'student'],
  },
  {
    code: 'ES',
    name: 'Spain',
    isSchengen: true,
    supportedPurposes: ['tourist', 'student'],
  },
  {
    code: 'JP',
    name: 'Japan',
    isSchengen: false,
    supportedPurposes: ['tourist', 'student'],
  },
  {
    code: 'KR',
    name: 'South Korea',
    isSchengen: false,
    supportedPurposes: ['tourist', 'student'],
  },
  {
    code: 'AE',
    name: 'United Arab Emirates',
    isSchengen: false,
    supportedPurposes: ['tourist', 'student'],
  },
  {
    code: 'FR',
    name: 'France',
    isSchengen: true,
    supportedPurposes: ['tourist', 'student'],
  },
];

/**
 * Check if a country is in the priority list
 */
export function isPriorityCountry(countryCode: string): boolean {
  return PRIORITY_VISA_COUNTRIES.some(
    (country) => country.code.toUpperCase() === countryCode.toUpperCase()
  );
}

/**
 * Check if a country+visaType combination is supported
 */
export function isPriorityVisa(countryCode: string, visaType: string): boolean {
  const normalizedVisaType = visaType.toLowerCase();
  const country = PRIORITY_VISA_COUNTRIES.find(
    (c) => c.code.toUpperCase() === countryCode.toUpperCase()
  );
  if (!country) {
    return false;
  }
  return country.supportedPurposes.includes(normalizedVisaType as VisaPurpose);
}

/**
 * Get priority country info by code
 */
export function getPriorityCountry(countryCode: string): PriorityVisaCountry | null {
  return (
    PRIORITY_VISA_COUNTRIES.find((c) => c.code.toUpperCase() === countryCode.toUpperCase()) || null
  );
}
