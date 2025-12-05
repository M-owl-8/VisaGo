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
    'b1/b2 visitor': 'tourist',
    'b1/b2': 'tourist',
    visitor: 'tourist',
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
  const normalizedVisaType = visaType.toLowerCase().trim();

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
  const normalizedCountryCode = countryCode.toUpperCase();
  const normalizedOriginal = originalVisaType.toLowerCase().trim();

  const countryAliases = VISA_TYPE_RULE_ALIASES[normalizedCountryCode];

  return !!(
    countryAliases &&
    countryAliases[normalizedOriginal] &&
    countryAliases[normalizedOriginal] === normalizedVisaType
  );
}
