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

  // Remove common suffixes like "visa" if present
  normalizedVisaType = normalizedVisaType.replace(/\s+visa\s*$/i, '').trim();

  // Normalize B1/B2 variations (handle slash, space, dash variations)
  normalizedVisaType = normalizedVisaType.replace(/\s*[\/\-]\s*/g, '/'); // Normalize separators to slash
  normalizedVisaType = normalizedVisaType.replace(/\s+/g, ' '); // Normalize multiple spaces to single space

  const countryAliases = VISA_TYPE_RULE_ALIASES[normalizedCountryCode];

  if (countryAliases && countryAliases[normalizedVisaType]) {
    return countryAliases[normalizedVisaType];
  }

  return normalizedVisaType;
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
