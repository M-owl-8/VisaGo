/**
 * Checklist Generation Configuration
 * Centralized constants for checklist generation thresholds and limits
 */

/**
 * Minimum number of items required for a valid checklist (hard error threshold)
 * Below this, the checklist is considered invalid and fallback is used
 */
export const MIN_ITEMS_HARD = 4;

/**
 * Ideal minimum number of items (warning threshold)
 * Below this, a warning is logged but the checklist is still accepted
 */
export const IDEAL_MIN_ITEMS = 10;

/**
 * Maximum number of items allowed (hard error threshold)
 * Above this, the checklist is considered invalid
 */
export const MAX_ITEMS_HARD = 24;

/**
 * Ideal maximum number of items (warning threshold)
 * Above this, a warning is logged but the checklist is still accepted
 */
export const IDEAL_MAX_ITEMS = 16;

/**
 * Maximum number of retries for OpenAI API calls
 */
export const MAX_OPENAI_RETRIES = 3;

/**
 * Timeout for OpenAI API calls (milliseconds)
 */
export const OPENAI_TIMEOUT_MS = 60000;

