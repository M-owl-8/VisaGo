/**
 * Checklist Helper Functions
 * Utilities for managing category, required, and priority consistency
 */

export type ChecklistPriority = 'high' | 'medium' | 'low';

/**
 * Normalize priority value to valid ChecklistPriority
 */
export function normalizePriority(
  value: string | ChecklistPriority | null | undefined
): ChecklistPriority {
  if (value === 'high' || value === 'medium' || value === 'low') {
    return value;
  }
  // default fallback
  return 'medium';
}

/**
 * Derive required boolean from category
 */
export function deriveRequiredFromCategory(
  category: 'required' | 'highly_recommended' | 'optional'
): boolean {
  return category === 'required';
}

/**
 * Derive category from required and priority (for backward compatibility)
 */
export function deriveCategoryFromRequiredAndPriority(
  required: boolean | undefined,
  priority: 'high' | 'medium' | 'low' | undefined
): 'required' | 'highly_recommended' | 'optional' {
  if (required) return 'required';
  if (priority === 'high' || priority === 'medium') return 'highly_recommended';
  return 'optional';
}

/**
 * Infer category from item (for backward compatibility)
 * Used when category is missing from checklist items
 */
export function inferCategory(item: {
  category?: 'required' | 'highly_recommended' | 'optional';
  required?: boolean;
  priority?: 'high' | 'medium' | 'low';
}): 'required' | 'highly_recommended' | 'optional' {
  if (item.category) return item.category;
  return deriveCategoryFromRequiredAndPriority(item.required, item.priority);
}

/**
 * Normalize category value
 */
export function normalizeCategory(
  category: string | undefined
): 'required' | 'highly_recommended' | 'optional' {
  if (category === 'required' || category === 'highly_recommended' || category === 'optional') {
    return category;
  }
  return 'optional'; // Default fallback
}

/**
 * Ensure category, required, and priority are consistent
 * Priority: category > required/priority (for backward compatibility)
 */
export function ensureCategoryConsistency(item: {
  category?: 'required' | 'highly_recommended' | 'optional';
  required?: boolean;
  priority?: 'high' | 'medium' | 'low';
}): {
  category: 'required' | 'highly_recommended' | 'optional';
  required: boolean;
  priority: 'high' | 'medium' | 'low';
} {
  let category = item.category;
  let required = item.required;
  let priority = item.priority;

  // If category is provided, it takes precedence
  if (category) {
    required = deriveRequiredFromCategory(category);
    if (!priority) {
      priority =
        category === 'required' ? 'high' : category === 'highly_recommended' ? 'medium' : 'low';
    }
  } else {
    // If category is missing, derive it from required and priority
    category = deriveCategoryFromRequiredAndPriority(required, priority);
    if (required === undefined) {
      required = deriveRequiredFromCategory(category);
    }
    if (!priority) {
      priority =
        category === 'required' ? 'high' : category === 'highly_recommended' ? 'medium' : 'low';
    }
  }

  // Ensure priority is always set
  if (!priority) {
    priority = 'medium'; // Default if all else fails
  }

  return { category, required: !!required, priority };
}
