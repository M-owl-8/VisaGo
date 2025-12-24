/**
 * Condition Evaluator
 * Safe, limited DSL for evaluating document conditions
 * NO eval() - uses explicit parsing and evaluation
 */

import { CanonicalAIUserContext } from '../types/ai-context';
import { logWarn } from '../middleware/logger';

export type ConditionResult = true | false | 'unknown';

/**
 * Evaluate a condition string against CanonicalAIUserContext
 *
 * Supported operators:
 * - === (equality)
 * - !== (inequality)
 * - && (AND)
 * - || (OR)
 * - Parentheses for grouping
 *
 * Supported field paths (flat variables - no nested paths):
 * - sponsorType
 * - currentStatus
 * - isStudent
 * - isEmployed
 * - hasInternationalTravel
 * - previousVisaRejections
 * - previousOverstay
 * - hasPropertyInUzbekistan
 * - hasPropertyInHomeCountry (alias for hasPropertyInUzbekistan)
 * - hasFamilyInUzbekistan
 * - hasFamilyInHomeCountry (alias for hasFamilyInUzbekistan)
 * - hasChildren
 * - hasUniversityInvitation
 * - hasOtherInvitation
 * - hasHostInCanada (alias for hasOtherInvitation for tourist visas)
 * - visaType
 * - maritalStatus (flat - from applicantProfile.maritalStatus)
 * - riskLevel (flat - from riskScore.level)
 * - employmentStatus (from employment.currentStatus)
 * - hasStableIncome (from employment.hasStableIncome)
 * - isSponsored (from financial.isSponsored)
 * - hasBusinessInvitation (from businessModule.invitationFromCompany)
 * - hasWorkPermit (from workModule.hasWorkPermit)
 * - hasAdmissionLetter (from studentModule.hasAdmissionLetter)
 * - hasInvitationLetter (from familyModule.hasInvitationLetter)
 * - willSponsor (from familyModule.willSponsor)
 * - hasOnwardTicket (from transitModule.onwardTicket)
 *
 * Examples:
 * - "sponsorType === 'self'"
 * - "currentStatus === 'employed'"
 * - "previousVisaRejections === true"
 * - "sponsorType !== 'self' && currentStatus === 'employed'"
 * - "(isStudent === true) || (hasUniversityInvitation === true)"
 */
export function evaluateCondition(
  condition: string,
  context: CanonicalAIUserContext
): ConditionResult {
  if (!condition || condition.trim() === '') {
    return true; // No condition means always include
  }

  try {
    // Normalize whitespace
    const normalized = condition.trim().replace(/\s+/g, ' ');

    // Parse and evaluate
    return evaluateExpression(normalized, context);
  } catch (error) {
    logWarn('[ConditionEvaluator] Error evaluating condition', {
      condition,
      error: error instanceof Error ? error.message : String(error),
    });
    return 'unknown';
  }
}

/**
 * Get field value from context
 */
function getFieldValue(
  fieldPath: string,
  context: CanonicalAIUserContext
): string | boolean | number | null | undefined {
  const profile = context.applicantProfile;
  const riskScore = context.riskScore;

  // Direct profile fields (flat variables - no nested paths)
  switch (fieldPath) {
    case 'sponsorType':
      return profile.sponsorType;
    case 'currentStatus':
      return profile.currentStatus;
    case 'isStudent':
      return profile.isStudent;
    case 'isEmployed':
      return profile.isEmployed;
    case 'hasInternationalTravel':
      return profile.hasInternationalTravel;
    case 'previousVisaRejections':
      return profile.previousVisaRejections;
    case 'previousOverstay':
      return profile.previousOverstay;
    case 'hasPropertyInUzbekistan':
      return profile.hasPropertyInUzbekistan;
    case 'hasPropertyInHomeCountry':
      // Alias for hasPropertyInUzbekistan (used in VisaRuleSet conditions)
      return profile.hasPropertyInUzbekistan;
    case 'hasFamilyInUzbekistan':
      return profile.hasFamilyInUzbekistan;
    case 'hasFamilyInHomeCountry':
      // Alias for hasFamilyInUzbekistan (used in VisaRuleSet conditions)
      return profile.hasFamilyInUzbekistan;
    case 'hasChildren':
      return profile.hasChildren;
    case 'hasUniversityInvitation':
      return profile.hasUniversityInvitation;
    case 'hasOtherInvitation':
      return profile.hasOtherInvitation;
    case 'hasHostInCanada':
      // Alias for hasOtherInvitation (used in VisaRuleSet conditions for tourist visas)
      return profile.hasOtherInvitation;
    case 'visaType':
      return profile.visaType;
    case 'maritalStatus':
      return profile.maritalStatus;
    // Flat riskLevel (from riskScore.level)
    case 'riskLevel':
      return riskScore?.level;
    // Legacy support for nested path (for backward compatibility)
    case 'riskScore.level':
      return riskScore?.level;
    // Employment fields (from employment object)
    case 'employmentStatus':
      return profile.employment?.currentStatus || profile.currentStatus;
    case 'hasStableIncome':
      // Check if employment has stable income or if isEmployed is true
      return profile.employment?.hasStableIncome ?? profile.isEmployed;
    // Financial fields (from financial object)
    case 'isSponsored':
      // Check if sponsorType is not 'self' or if financial.isSponsored is true
      return profile.financial?.isSponsored ?? profile.sponsorType !== 'self';
    // Business module fields (from questionnaire modules)
    case 'hasBusinessInvitation':
      return profile.businessModule?.invitationFromCompany ?? false;
    // Work module fields (from questionnaire modules)
    case 'hasWorkPermit':
      return profile.workModule?.hasWorkPermit ?? false;
    // Student module fields (from questionnaire modules)
    case 'hasAdmissionLetter':
      return profile.studentModule?.hasAdmissionLetter ?? profile.hasUniversityInvitation;
    // Family module fields (from questionnaire modules)
    case 'hasInvitationLetter':
      return profile.familyModule?.hasInvitationLetter ?? profile.hasOtherInvitation;
    case 'willSponsor':
      return profile.familyModule?.willSponsor ?? false;
    // Transit module fields (from questionnaire modules)
    case 'hasOnwardTicket':
      return profile.transitModule?.onwardTicket ?? false;
    default:
      return undefined;
  }
}

/**
 * Evaluate a simple expression (no AND/OR)
 */
function evaluateSimpleExpression(expr: string, context: CanonicalAIUserContext): ConditionResult {
  // Match: field === value or field !== value
  const equalityMatch = expr.match(/^(\w+(?:\.\w+)?)\s*(===|!==)\s*(.+)$/);
  if (!equalityMatch) {
    return 'unknown';
  }

  const [, fieldPath, operator, valueStr] = equalityMatch;
  const fieldValue = getFieldValue(fieldPath, context);

  // If field is undefined, return unknown
  if (fieldValue === undefined) {
    return 'unknown';
  }

  // Parse value (string, boolean, or number)
  let expectedValue: string | boolean | number;
  if (valueStr === 'true') {
    expectedValue = true;
  } else if (valueStr === 'false') {
    expectedValue = false;
  } else if (valueStr.startsWith("'") && valueStr.endsWith("'")) {
    // String literal
    expectedValue = valueStr.slice(1, -1);
  } else if (valueStr.startsWith('"') && valueStr.endsWith('"')) {
    // String literal with double quotes
    expectedValue = valueStr.slice(1, -1);
  } else {
    // Try as number or use as-is
    const numValue = Number(valueStr);
    expectedValue = isNaN(numValue) ? valueStr : numValue;
  }

  // Compare
  if (operator === '===') {
    return fieldValue === expectedValue;
  } else if (operator === '!==') {
    return fieldValue !== expectedValue;
  }

  return 'unknown';
}

/**
 * Evaluate expression with AND/OR support
 */
function evaluateExpression(expr: string, context: CanonicalAIUserContext): ConditionResult {
  // Remove outer parentheses if present
  let working = expr.trim();
  while (working.startsWith('(') && working.endsWith(')')) {
    // Check if parentheses are balanced
    let depth = 0;
    let shouldRemove = true;
    for (let i = 0; i < working.length; i++) {
      if (working[i] === '(') depth++;
      if (working[i] === ')') depth--;
      if (depth === 0 && i < working.length - 1) {
        shouldRemove = false;
        break;
      }
    }
    if (shouldRemove) {
      working = working.slice(1, -1).trim();
    } else {
      break;
    }
  }

  // Check for AND/OR operators (outside parentheses)
  const andIndex = findOperatorOutsideParens(working, '&&');
  const orIndex = findOperatorOutsideParens(working, '||');

  if (andIndex !== -1 && (orIndex === -1 || andIndex < orIndex)) {
    // Evaluate AND
    const left = working.substring(0, andIndex).trim();
    const right = working.substring(andIndex + 2).trim();
    const leftResult = evaluateExpression(left, context);
    const rightResult = evaluateExpression(right, context);

    // AND logic: both must be true, unknown if either is unknown
    if (leftResult === 'unknown' || rightResult === 'unknown') {
      return 'unknown';
    }
    return leftResult && rightResult;
  } else if (orIndex !== -1) {
    // Evaluate OR
    const left = working.substring(0, orIndex).trim();
    const right = working.substring(orIndex + 2).trim();
    const leftResult = evaluateExpression(left, context);
    const rightResult = evaluateExpression(right, context);

    // OR logic: true if either is true, unknown if both are unknown
    if (leftResult === true || rightResult === true) {
      return true;
    }
    if (leftResult === 'unknown' || rightResult === 'unknown') {
      return 'unknown';
    }
    return false;
  }

  // No AND/OR, evaluate as simple expression
  return evaluateSimpleExpression(working, context);
}

/**
 * Find operator outside parentheses
 */
function findOperatorOutsideParens(expr: string, operator: string): number {
  let depth = 0;
  for (let i = 0; i < expr.length - operator.length + 1; i++) {
    if (expr[i] === '(') depth++;
    if (expr[i] === ')') depth--;
    if (depth === 0 && expr.substring(i, i + operator.length) === operator) {
      return i;
    }
  }
  return -1;
}
