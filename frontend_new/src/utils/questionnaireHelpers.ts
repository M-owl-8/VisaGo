/**
 * Questionnaire Helpers
 * Utility functions for working with questionnaire data
 */

import {
  QuestionnaireData,
  VisaQuestionnaireSummary,
} from '../types/questionnaire';
import {
  convertLegacyQuestionnaireToSummary,
  isValidQuestionnaireSummary,
} from './questionnaireMapper';

/**
 * Extract questionnaire summary from bio string
 * Handles both legacy and new formats
 */
export function extractQuestionnaireSummary(
  bio: string | null | undefined,
  appLanguage: 'uz' | 'ru' | 'en' = 'en',
): VisaQuestionnaireSummary | null {
  if (!bio) return null;

  try {
    const parsed = JSON.parse(bio);

    // Check if it's the new format with summary
    if (parsed._hasSummary && parsed.summary) {
      const summary = parsed.summary;
      if (isValidQuestionnaireSummary(summary)) {
        return summary;
      }
    }

    // Try to convert legacy format
    return convertLegacyQuestionnaireToSummary(parsed, appLanguage);
  } catch (error) {
    console.error('Failed to extract questionnaire summary:', error);
    return null;
  }
}

/**
 * Extract legacy questionnaire data from bio string
 * For backwards compatibility
 */
export function extractLegacyQuestionnaireData(
  bio: string | null | undefined,
): Partial<QuestionnaireData> | null {
  if (!bio) return null;

  try {
    const parsed = JSON.parse(bio);

    // If it's the new format, extract legacy fields
    if (parsed._hasSummary) {
      const {summary, _version, _hasSummary, ...legacyData} = parsed;
      return legacyData;
    }

    // Legacy format: return as-is
    return parsed;
  } catch (error) {
    console.error('Failed to extract legacy questionnaire data:', error);
    return null;
  }
}




