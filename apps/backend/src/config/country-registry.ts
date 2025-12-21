/**
 * Country Registry (Phase 7)
 *
 * Single source of truth for country codes, names, and metadata.
 * This ensures 100% consistency across all services.
 *
 * All country handling must go through this registry to prevent mismatches.
 */

import { PRIORITY_VISA_COUNTRIES } from './priority-visas';
import { ISO_COUNTRIES } from '../data/countries-iso2';

// Keep legacy visa categories for priority countries, but do not restrict globally.
export type VisaCategory = 'tourist' | 'student' | string;

/**
 * Country configuration
 */
export interface CountryConfig {
  /** Canonical ISO 3166-1 alpha-2 country code (e.g., "US", "GB", "CA") */
  code: string;
  /** Canonical display name (e.g., "United States", "United Kingdom") */
  name: string;
  /** Whether this country is part of the Schengen Area */
  schengen?: boolean;
  /** Alternative codes and names that should map to this country */
  aliases?: string[];
  /** Supported visa categories */
  visaCategories: VisaCategory[];
  /** Default visa type names (optional, for reference) */
  defaultVisaTypes?: {
    tourist?: string;
    student?: string;
  };
}

/**
 * Country Registry for 10 Priority Countries
 *
 * This is the SINGLE SOURCE OF TRUTH for country information.
 * All services must use this registry instead of hardcoding country names/codes.
 */
export const COUNTRY_REGISTRY: Record<string, CountryConfig> = {
  US: {
    code: 'US',
    name: 'United States',
    schengen: false,
    aliases: ['USA', 'United States of America', 'America'],
    visaCategories: ['tourist', 'student'],
    defaultVisaTypes: {
      tourist: 'B1/B2',
      student: 'F-1',
    },
  },
  GB: {
    code: 'GB',
    name: 'United Kingdom',
    schengen: false,
    aliases: ['UK', 'GBR', 'Britain', 'Great Britain'],
    visaCategories: ['tourist', 'student'],
    defaultVisaTypes: {
      tourist: 'Standard Visitor',
      student: 'Student',
    },
  },
  CA: {
    code: 'CA',
    name: 'Canada',
    schengen: false,
    aliases: ['CAN'],
    visaCategories: ['tourist', 'student'],
    defaultVisaTypes: {
      tourist: 'Visitor',
      student: 'Study Permit',
    },
  },
  AU: {
    code: 'AU',
    name: 'Australia',
    schengen: false,
    aliases: ['AUS'],
    visaCategories: ['tourist', 'student'],
    defaultVisaTypes: {
      tourist: 'Visitor',
      student: 'Student',
    },
  },
  DE: {
    code: 'DE',
    name: 'Germany',
    schengen: true,
    aliases: ['DEU', 'Federal Republic of Germany'],
    visaCategories: ['tourist', 'student'],
    defaultVisaTypes: {
      tourist: 'Schengen',
      student: 'National D',
    },
  },
  ES: {
    code: 'ES',
    name: 'Spain',
    schengen: true,
    aliases: ['ESP'],
    visaCategories: ['tourist', 'student'],
    defaultVisaTypes: {
      tourist: 'Schengen',
      student: 'National D',
    },
  },
  FR: {
    code: 'FR',
    name: 'France',
    schengen: true,
    aliases: ['FRA'],
    visaCategories: ['tourist', 'student'],
    defaultVisaTypes: {
      tourist: 'Schengen',
      student: 'National D',
    },
  },
  JP: {
    code: 'JP',
    name: 'Japan',
    schengen: false,
    aliases: ['JPN'],
    visaCategories: ['tourist', 'student'],
    defaultVisaTypes: {
      tourist: 'Temporary Visitor',
      student: 'Student',
    },
  },
  KR: {
    code: 'KR',
    name: 'South Korea',
    schengen: false,
    aliases: ['KOR', 'Korea', 'Republic of Korea'],
    visaCategories: ['tourist', 'student'],
    defaultVisaTypes: {
      tourist: 'Tourist',
      student: 'Student',
    },
  },
  AE: {
    code: 'AE',
    name: 'United Arab Emirates',
    schengen: false,
    aliases: ['UAE', 'Emirates'],
    visaCategories: ['tourist', 'student'],
    defaultVisaTypes: {
      tourist: 'Tourist',
      student: 'Student',
    },
  },
};

/**
 * Get country config by canonical code
 */
export function getCountryConfigByCode(code: string): CountryConfig | null {
  if (!code) return null;
  const upperCode = code.toUpperCase();
  return COUNTRY_REGISTRY[upperCode] || null;
}

/**
 * Get country config by any code or alias (case-insensitive)
 */
export function getCountryConfigByAnyCode(codeOrAlias: string): CountryConfig | null {
  if (!codeOrAlias) return null;
  const upper = codeOrAlias.toUpperCase().trim();

  // First try direct code match
  const direct = getCountryConfigByCode(upper);
  if (direct) return direct;

  // Try ISO dataset match by code
  const isoMatch = ISO_COUNTRIES.find((c) => c.code.toUpperCase() === upper);
  if (isoMatch) {
    return {
      code: isoMatch.code.toUpperCase(),
      name: isoMatch.name,
      visaCategories: ['tourist', 'student'],
    };
  }

  // Then try aliases
  for (const config of Object.values(COUNTRY_REGISTRY)) {
    if (config.aliases) {
      const aliasMatch = config.aliases.some((alias) => alias.toUpperCase() === upper);
      if (aliasMatch) return config;
    }
  }

  // Try partial name match (case-insensitive)
  const lower = codeOrAlias.toLowerCase().trim();
  for (const config of Object.values(COUNTRY_REGISTRY)) {
    if (config.name.toLowerCase() === lower) return config;
    if (config.name.toLowerCase().includes(lower)) return config;
    if (lower.includes(config.name.toLowerCase())) return config;
  }

  return null;
}

/**
 * Normalize country code to canonical form
 *
 * @param codeOrName - Country code, alias, or name
 * @returns Canonical country code (e.g., "US", "GB") or null if not found
 */
export function normalizeCountryCode(codeOrName: string | null | undefined): string | null {
  if (!codeOrName) return null;
  const value = codeOrName.trim();
  const config = getCountryConfigByAnyCode(value);
  if (config?.code) return config.code.toUpperCase();

  // Try ISO dataset name match
  const lower = value.toLowerCase();
  const isoByName = ISO_COUNTRIES.find(
    (c) =>
      c.name.toLowerCase() === lower ||
      c.name.toLowerCase().includes(lower) ||
      lower.includes(c.name.toLowerCase()) ||
      (c.altNames || []).some((a) => a.toLowerCase() === lower)
  );
  if (isoByName) return isoByName.code.toUpperCase();

  // Fallback: uppercase trimmed string (best-effort)
  return value.toUpperCase();
}

/**
 * Get country name from code
 *
 * @param code - Country code (canonical or alias)
 * @returns Canonical country name or "Unknown" if not found
 */
export function getCountryNameFromCode(code: string | null | undefined): string {
  if (!code) return 'Unknown';
  const config = getCountryConfigByAnyCode(code);
  return config?.name || 'Unknown';
}

/**
 * Check if country is Schengen
 */
export function isSchengenCountry(code: string | null | undefined): boolean {
  if (!code) return false;
  const config = getCountryConfigByAnyCode(code);
  return config?.schengen === true;
}

/**
 * Check if country supports visa category
 */
export function countrySupportsVisaCategory(
  code: string | null | undefined,
  category: VisaCategory
): boolean {
  if (!code) return false;
  const config = getCountryConfigByAnyCode(code);
  return config?.visaCategories.includes(category) || false;
}

/**
 * Get all priority country codes
 */
export function getAllPriorityCountryCodes(): string[] {
  return Object.keys(COUNTRY_REGISTRY);
}

/**
 * Assert country consistency
 *
 * Checks if all provided country codes match the canonical code.
 * Used to catch mismatches early.
 *
 * @param canonicalCode - The canonical country code (ground truth)
 * @param otherCodes - Other country codes to check against canonical
 * @returns Object with consistency status and list of mismatches
 */
export function assertCountryConsistency(
  canonicalCode: string | null | undefined,
  ...otherCodes: Array<string | null | undefined>
): { consistent: boolean; mismatches: string[] } {
  if (!canonicalCode) {
    return { consistent: false, mismatches: ['Canonical code is missing'] };
  }

  const canonical = normalizeCountryCode(canonicalCode);
  if (!canonical) {
    return {
      consistent: false,
      mismatches: [`Canonical code "${canonicalCode}" is not a valid priority country`],
    };
  }

  const mismatches: string[] = [];

  for (const otherCode of otherCodes) {
    if (!otherCode) continue; // Skip null/undefined
    const normalized = normalizeCountryCode(otherCode);
    if (normalized && normalized !== canonical) {
      mismatches.push(
        `"${otherCode}" (normalized: ${normalized}) does not match canonical "${canonical}"`
      );
    }
  }

  return {
    consistent: mismatches.length === 0,
    mismatches,
  };
}

/**
 * Canonical country context (for use in AI context)
 */
export interface CanonicalCountryContext {
  countryCode: string; // Canonical code, e.g., "FR"
  countryName: string; // Canonical name, e.g., "France"
  schengen: boolean;
}

/**
 * Build canonical country context from code
 */
export function buildCanonicalCountryContext(
  code: string | null | undefined
): CanonicalCountryContext | null {
  if (!code) return null;
  const config = getCountryConfigByAnyCode(code);
  if (!config) return null;

  return {
    countryCode: config.code,
    countryName: config.name,
    schengen: config.schengen || false,
  };
}
