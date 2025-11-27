/**
 * JSON Validator and Sanity Checker
 * Ensures GPT-4 responses are valid JSON and meet all requirements
 */

import { logError, logWarn, logInfo } from '../middleware/logger';

export interface ChecklistValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  corrected?: any;
}

export interface ChecklistItem {
  document: string;
  name: string;
  nameUz?: string;
  nameRu?: string;
  category?: 'required' | 'highly_recommended' | 'optional';
  required?: boolean;
  priority?: 'high' | 'medium' | 'low';
  description?: string;
  descriptionUz?: string;
  descriptionRu?: string;
  whereToObtain?: string;
  whereToObtainUz?: string;
  whereToObtainRu?: string;
}

export interface ChecklistResponse {
  type?: string;
  country?: string;
  checklist: ChecklistItem[];
}

/**
 * Extract JSON from potentially malformed GPT-4 response
 */
export function extractJsonFromResponse(rawResponse: string): string | null {
  try {
    // Try direct parse first
    JSON.parse(rawResponse);
    return rawResponse;
  } catch {
    // Try to find JSON in markdown code blocks
    const jsonBlockMatch = rawResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonBlockMatch) {
      try {
        JSON.parse(jsonBlockMatch[1]);
        return jsonBlockMatch[1];
      } catch {
        // Continue to next method
      }
    }

    // Try to find JSON object boundaries
    const jsonObjectMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (jsonObjectMatch) {
      try {
        JSON.parse(jsonObjectMatch[0]);
        return jsonObjectMatch[0];
      } catch {
        // Continue to next method
      }
    }

    // Try to find largest valid JSON object
    let largestValidJson: string | null = null;
    let maxLength = 0;

    for (let i = 0; i < rawResponse.length; i++) {
      if (rawResponse[i] === '{') {
        let depth = 0;
        let jsonCandidate = '';
        for (let j = i; j < rawResponse.length; j++) {
          jsonCandidate += rawResponse[j];
          if (rawResponse[j] === '{') depth++;
          if (rawResponse[j] === '}') depth--;
          if (depth === 0 && jsonCandidate.length > maxLength) {
            try {
              JSON.parse(jsonCandidate);
              largestValidJson = jsonCandidate;
              maxLength = jsonCandidate.length;
            } catch {
              // Not valid JSON
            }
            break;
          }
        }
      }
    }

    return largestValidJson;
  }
}

/**
 * Validate checklist structure and content
 */
export function validateChecklistResponse(
  parsed: any,
  country: string,
  visaType: string
): ChecklistValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check top-level structure
  if (!parsed || typeof parsed !== 'object') {
    errors.push('Response is not a valid object');
    return { isValid: false, errors, warnings };
  }

  // Check checklist array
  if (!Array.isArray(parsed.checklist)) {
    errors.push('Missing or invalid checklist array');
    return { isValid: false, errors, warnings };
  }

  const items = parsed.checklist;
  const itemCount = items.length;

  // Validate item count
  if (itemCount < 8) {
    errors.push(`Too few items: ${itemCount} (minimum 8 required)`);
  } else if (itemCount > 15) {
    warnings.push(`Too many items: ${itemCount} (maximum 15 recommended)`);
  }

  // Validate categories
  const categories = new Set<string>();
  const categoryCounts: Record<string, number> = {
    required: 0,
    highly_recommended: 0,
    optional: 0,
  };

  items.forEach((item: any, index: number) => {
    // Check required fields
    if (!item.document) {
      errors.push(`Item ${index + 1}: Missing document field`);
    }
    if (!item.name) {
      errors.push(`Item ${index + 1}: Missing name field`);
    }

    // Validate category
    if (!item.category) {
      errors.push(`Item ${index + 1}: Missing category field`);
    } else if (!['required', 'highly_recommended', 'optional'].includes(item.category)) {
      errors.push(`Item ${index + 1}: Invalid category "${item.category}"`);
    } else {
      categories.add(item.category);
      categoryCounts[item.category]++;
    }

    // Validate required boolean matches category
    if (item.category === 'required' && item.required !== true) {
      warnings.push(`Item ${index + 1}: category is "required" but required is not true`);
    }
    if (
      (item.category === 'highly_recommended' || item.category === 'optional') &&
      item.required === true
    ) {
      warnings.push(`Item ${index + 1}: category is "${item.category}" but required is true`);
    }

    // Check translations
    if (!item.nameUz) {
      warnings.push(`Item ${index + 1}: Missing nameUz translation`);
    }
    if (!item.nameRu) {
      warnings.push(`Item ${index + 1}: Missing nameRu translation`);
    }
    if (!item.descriptionUz) {
      warnings.push(`Item ${index + 1}: Missing descriptionUz translation`);
    }
    if (!item.descriptionRu) {
      warnings.push(`Item ${index + 1}: Missing descriptionRu translation`);
    }
    if (!item.whereToObtainUz) {
      warnings.push(`Item ${index + 1}: Missing whereToObtainUz translation`);
    }
    if (!item.whereToObtainRu) {
      warnings.push(`Item ${index + 1}: Missing whereToObtainRu translation`);
    }
  });

  // Validate all three categories are present
  if (!categories.has('required')) {
    errors.push('Missing "required" category');
  }
  if (!categories.has('highly_recommended')) {
    errors.push('Missing "highly_recommended" category');
  }
  if (!categories.has('optional')) {
    errors.push('Missing "optional" category');
  }

  // Validate country-specific terminology
  const countryLower = country.toLowerCase();
  const visaTypeLower = visaType.toLowerCase();
  const hasCountrySpecificTerm = items.some((item: any) => {
    const name = (item.name || '').toLowerCase();
    const desc = (item.description || '').toLowerCase();

    if (countryLower.includes('usa') || countryLower.includes('united states')) {
      if (visaTypeLower.includes('student')) {
        return (
          name.includes('i-20') ||
          name.includes('sevis') ||
          desc.includes('i-20') ||
          desc.includes('sevis')
        );
      }
      return name.includes('ds-160') || desc.includes('ds-160');
    }
    if (countryLower.includes('canada')) {
      if (visaTypeLower.includes('student')) {
        return (
          name.includes('loa') ||
          name.includes('dli') ||
          desc.includes('loa') ||
          desc.includes('dli')
        );
      }
      return name.includes('gic') || desc.includes('gic');
    }
    if (countryLower.includes('uk') || countryLower.includes('united kingdom')) {
      if (visaTypeLower.includes('student')) {
        return name.includes('cas') || desc.includes('cas');
      }
      return name.includes('28 day') || desc.includes('28 day');
    }
    if (countryLower.includes('australia')) {
      if (visaTypeLower.includes('student')) {
        return (
          name.includes('oshc') ||
          name.includes('coe') ||
          desc.includes('oshc') ||
          desc.includes('coe')
        );
      }
      return name.includes('gte') || desc.includes('gte');
    }
    if (
      countryLower.includes('germany') ||
      countryLower.includes('spain') ||
      countryLower.includes('schengen')
    ) {
      return (
        name.includes('€30,000') ||
        name.includes('30000') ||
        desc.includes('€30,000') ||
        desc.includes('30000')
      );
    }
    return false;
  });

  if (!hasCountrySpecificTerm) {
    warnings.push(`No country-specific terminology found for ${country} ${visaType}`);
  }

  const isValid = errors.length === 0;

  return {
    isValid,
    errors,
    warnings,
  };
}

/**
 * Auto-correct checklist items
 */
export function autoCorrectChecklist(
  parsed: ChecklistResponse,
  country: string,
  visaType: string
): ChecklistResponse {
  const corrected = { ...parsed };
  const items = [...corrected.checklist];

  // Auto-correct missing categories
  items.forEach((item, index) => {
    if (!item.category) {
      logWarn(`[JSON Validator] Auto-correcting missing category for item ${index + 1}`);
      item.category = 'highly_recommended';
    }

    // Ensure required matches category
    if (item.category === 'required') {
      item.required = true;
      item.priority = 'high';
    } else if (item.category === 'highly_recommended') {
      item.required = false;
      if (!item.priority || item.priority === 'low') {
        item.priority = 'medium';
      }
    } else if (item.category === 'optional') {
      item.required = false;
      item.priority = 'low';
    }

    // Ensure priority exists
    if (!item.priority) {
      item.priority =
        item.category === 'required'
          ? 'high'
          : item.category === 'highly_recommended'
            ? 'medium'
            : 'low';
    }
  });

  corrected.checklist = items;
  return corrected;
}

/**
 * Parse and validate GPT-4 response with retry logic
 */
export function parseAndValidateChecklistResponse(
  rawResponse: string,
  country: string,
  visaType: string,
  attempt: number = 1
): {
  parsed: ChecklistResponse | null;
  validation: ChecklistValidationResult;
  needsRetry: boolean;
} {
  logInfo('[JSON Validator] Parsing GPT-4 response', {
    attempt,
    responseLength: rawResponse.length,
    country,
    visaType,
  });

  // Extract JSON
  const jsonString = extractJsonFromResponse(rawResponse);
  if (!jsonString) {
    logError(
      '[JSON Validator] Failed to extract JSON from response',
      new Error('No valid JSON found'),
      { attempt, responsePreview: rawResponse.substring(0, 200) }
    );
    return {
      parsed: null,
      validation: {
        isValid: false,
        errors: ['Failed to extract JSON from response'],
        warnings: [],
      },
      needsRetry: attempt < 2,
    };
  }

  // Parse JSON
  let parsed: ChecklistResponse;
  try {
    parsed = JSON.parse(jsonString);
  } catch (error) {
    logError('[JSON Validator] Failed to parse extracted JSON', error as Error, {
      attempt,
      jsonPreview: jsonString.substring(0, 200),
    });
    return {
      parsed: null,
      validation: {
        isValid: false,
        errors: ['Failed to parse JSON'],
        warnings: [],
      },
      needsRetry: attempt < 2,
    };
  }

  // Validate structure
  const validation = validateChecklistResponse(parsed, country, visaType);

  if (!validation.isValid) {
    logWarn('[JSON Validator] Validation failed', {
      attempt,
      errors: validation.errors,
      warnings: validation.warnings,
    });
    return {
      parsed: null,
      validation,
      needsRetry: attempt < 2,
    };
  }

  // Auto-correct warnings
  if (validation.warnings.length > 0) {
    logInfo('[JSON Validator] Auto-correcting warnings', {
      warnings: validation.warnings,
    });
    const corrected = autoCorrectChecklist(parsed, country, visaType);
    return {
      parsed: corrected,
      validation: {
        isValid: true,
        errors: [],
        warnings: validation.warnings,
      },
      needsRetry: false,
    };
  }

  logInfo('[JSON Validator] Validation passed', {
    attempt,
    itemCount: parsed.checklist.length,
  });

  return {
    parsed,
    validation,
    needsRetry: false,
  };
}
