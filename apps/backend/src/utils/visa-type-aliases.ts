/**
 * Visa Type Alias Mapping
 * Maps application visa types to their corresponding VisaRuleSet visa types
 *
 * This allows us to reuse existing VisaRuleSet entries for visa types that
 * are functionally equivalent but have different names in the application.
 *
 * Example: US "b1/b2 visitor" applications use the "tourist" VisaRuleSet
 */

export type VisaTypeAliasMap = {
  [countryCode: string]: { [aliasVisaType: string]: string };
};

/**
 * Mapping of visa type aliases to their canonical VisaRuleSet types
 * Key: country code (uppercase)
 * Value: object mapping alias visa type (lowercase) to canonical visa type (lowercase)
 */
const VISA_TYPE_RULE_ALIASES: VisaTypeAliasMap = {
  US: {
    // B1/B2 Visitor Visa variations (all map to "tourist" for rules lookup)
    'b1/b2 visitor visa': 'tourist',
    'b1/b2 visitor': 'tourist',
    'b1/b2': 'tourist',
    'b1 b2': 'tourist', // Space instead of slash
    'b-1/b-2': 'tourist', // With dashes
    'b-1 b-2': 'tourist', // With dashes and space
    visitor: 'tourist',
    'visitor visa': 'tourist',
    // Common UI variations
    'b1/b2 tourist': 'tourist',
    'b1/b2 travel': 'tourist',
  },
  // Canada: Uses "Visitor" as visa type name, but rules stored as "tourist"
  CA: {
    visitor: 'tourist',
    'visitor visa': 'tourist',
    'visitor visa canada': 'tourist',
    tourist: 'tourist', // Explicit mapping for consistency
    'tourist visa': 'tourist',
  },
  // Australia: Uses "Visitor" as visa type name, but rules stored as "tourist"
  AU: {
    visitor: 'tourist',
    'visitor visa': 'tourist',
    'visitor visa australia': 'tourist',
    tourist: 'tourist', // Explicit mapping for consistency
    'tourist visa': 'tourist',
  },
  // United Kingdom: Uses "Standard Visitor" as visa type name, but rules stored as "tourist"
  GB: {
    visitor: 'tourist',
    'standard visitor': 'tourist',
    'standard visitor visa': 'tourist',
    'visitor visa': 'tourist',
    'uk visitor': 'tourist',
    tourist: 'tourist', // Explicit mapping for consistency
    'tourist visa': 'tourist',
  },
  // Schengen countries: ES, DE, FR, IT, AT, BE, CH, CZ, DK, EE, FI, GR, HU, IS, LV, LI, LT, LU, MT, NL, NO, PL, PT, SE, SK, SI
  ES: {
    'schengen tourist visa': 'tourist',
    'schengen tourist': 'tourist',
    'schengen visa': 'tourist',
    'tourist visa': 'tourist',
  },
  DE: {
    'schengen tourist visa': 'tourist',
    'schengen tourist': 'tourist',
    'schengen visa': 'tourist',
    'tourist visa': 'tourist',
  },
  FR: {
    'schengen tourist visa': 'tourist',
    'schengen tourist': 'tourist',
    'schengen visa': 'tourist',
    'tourist visa': 'tourist',
  },
  IT: {
    'schengen tourist visa': 'tourist',
    'schengen tourist': 'tourist',
    'schengen visa': 'tourist',
    'tourist visa': 'tourist',
  },
  AT: {
    'schengen tourist visa': 'tourist',
    'schengen tourist': 'tourist',
    'schengen visa': 'tourist',
    'tourist visa': 'tourist',
  },
  BE: {
    'schengen tourist visa': 'tourist',
    'schengen tourist': 'tourist',
    'schengen visa': 'tourist',
    'tourist visa': 'tourist',
  },
  CH: {
    'schengen tourist visa': 'tourist',
    'schengen tourist': 'tourist',
    'schengen visa': 'tourist',
    'tourist visa': 'tourist',
  },
  CZ: {
    'schengen tourist visa': 'tourist',
    'schengen tourist': 'tourist',
    'schengen visa': 'tourist',
    'tourist visa': 'tourist',
  },
  DK: {
    'schengen tourist visa': 'tourist',
    'schengen tourist': 'tourist',
    'schengen visa': 'tourist',
    'tourist visa': 'tourist',
  },
  EE: {
    'schengen tourist visa': 'tourist',
    'schengen tourist': 'tourist',
    'schengen visa': 'tourist',
    'tourist visa': 'tourist',
  },
  FI: {
    'schengen tourist visa': 'tourist',
    'schengen tourist': 'tourist',
    'schengen visa': 'tourist',
    'tourist visa': 'tourist',
  },
  GR: {
    'schengen tourist visa': 'tourist',
    'schengen tourist': 'tourist',
    'schengen visa': 'tourist',
    'tourist visa': 'tourist',
  },
  HU: {
    'schengen tourist visa': 'tourist',
    'schengen tourist': 'tourist',
    'schengen visa': 'tourist',
    'tourist visa': 'tourist',
  },
  IS: {
    'schengen tourist visa': 'tourist',
    'schengen tourist': 'tourist',
    'schengen visa': 'tourist',
    'tourist visa': 'tourist',
  },
  LV: {
    'schengen tourist visa': 'tourist',
    'schengen tourist': 'tourist',
    'schengen visa': 'tourist',
    'tourist visa': 'tourist',
  },
  LI: {
    'schengen tourist visa': 'tourist',
    'schengen tourist': 'tourist',
    'schengen visa': 'tourist',
    'tourist visa': 'tourist',
  },
  LT: {
    'schengen tourist visa': 'tourist',
    'schengen tourist': 'tourist',
    'schengen visa': 'tourist',
    'tourist visa': 'tourist',
  },
  LU: {
    'schengen tourist visa': 'tourist',
    'schengen tourist': 'tourist',
    'schengen visa': 'tourist',
    'tourist visa': 'tourist',
  },
  MT: {
    'schengen tourist visa': 'tourist',
    'schengen tourist': 'tourist',
    'schengen visa': 'tourist',
    'tourist visa': 'tourist',
  },
  NL: {
    'schengen tourist visa': 'tourist',
    'schengen tourist': 'tourist',
    'schengen visa': 'tourist',
    'tourist visa': 'tourist',
  },
  NO: {
    'schengen tourist visa': 'tourist',
    'schengen tourist': 'tourist',
    'schengen visa': 'tourist',
    'tourist visa': 'tourist',
  },
  PL: {
    'schengen tourist visa': 'tourist',
    'schengen tourist': 'tourist',
    'schengen visa': 'tourist',
    'tourist visa': 'tourist',
  },
  PT: {
    'schengen tourist visa': 'tourist',
    'schengen tourist': 'tourist',
    'schengen visa': 'tourist',
    'tourist visa': 'tourist',
  },
  SE: {
    'schengen tourist visa': 'tourist',
    'schengen tourist': 'tourist',
    'schengen visa': 'tourist',
    'tourist visa': 'tourist',
  },
  SK: {
    'schengen tourist visa': 'tourist',
    'schengen tourist': 'tourist',
    'schengen visa': 'tourist',
    'tourist visa': 'tourist',
  },
  SI: {
    'schengen tourist visa': 'tourist',
    'schengen tourist': 'tourist',
    'schengen visa': 'tourist',
    'tourist visa': 'tourist',
  },
};

/**
 * Normalize visa type for rules lookup
 *
 * Maps application visa types to their corresponding VisaRuleSet visa types
 * using the alias mapping. If no alias exists, returns the original visa type.
 *
 * @param countryCode - Country code (e.g., "US", "AU")
 * @param visaType - Visa type from application (e.g., "b1/b2 visitor", "tourist")
 * @returns Normalized visa type for rules lookup (e.g., "tourist")
 *
 * @example
 * normalizeVisaTypeForRules("US", "b1/b2 visitor") // returns "tourist"
 * normalizeVisaTypeForRules("US", "tourist") // returns "tourist"
 * normalizeVisaTypeForRules("AU", "tourist") // returns "tourist"
 */
export function normalizeVisaTypeForRules(countryCode: string, visaType: string): string {
  const normalizedCountryCode = countryCode.toUpperCase();
  let normalizedVisaType = visaType.toLowerCase().trim();

  // Normalize B1/B2 variations (handle slash, space, dash variations)
  normalizedVisaType = normalizedVisaType.replace(/\s*[\/\-]\s*/g, '/'); // Normalize separators to slash
  normalizedVisaType = normalizedVisaType.replace(/\s+/g, ' '); // Normalize multiple spaces to single space

  const countryAliases = VISA_TYPE_RULE_ALIASES[normalizedCountryCode];

  // FIRST: Check aliases with original string (including "visa" suffix if present)
  if (countryAliases && countryAliases[normalizedVisaType]) {
    return countryAliases[normalizedVisaType];
  }

  // SECOND: Remove common suffixes like "visa" and check again
  const withoutVisa = normalizedVisaType.replace(/\s+visa\s*$/i, '').trim();
  if (withoutVisa !== normalizedVisaType && countryAliases && countryAliases[withoutVisa]) {
    return countryAliases[withoutVisa];
  }

  // THIRD: Return normalized version without "visa" suffix
  return withoutVisa;
}

/**
 * Check if an alias mapping was applied
 *
 * @param countryCode - Country code
 * @param originalVisaType - Original visa type from application
 * @param normalizedVisaType - Normalized visa type for rules lookup
 * @returns true if an alias mapping was applied
 */
export function wasAliasApplied(
  countryCode: string,
  originalVisaType: string,
  normalizedVisaType: string
): boolean {
  // Normalize the original visa type the same way normalizeVisaTypeForRules does
  const normalizedOriginal = normalizeVisaTypeForRules(countryCode, originalVisaType);

  // If normalization changed the value, an alias was applied
  const originalLower = originalVisaType
    .toLowerCase()
    .trim()
    .replace(/\s+visa\s*$/i, '')
    .trim();
  return normalizedOriginal !== originalLower && normalizedOriginal === normalizedVisaType;
}
