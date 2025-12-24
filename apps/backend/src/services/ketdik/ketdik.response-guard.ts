/**
 * Lightweight safety/quality validator for Ketdik responses.
 * Marks a response unsafe if it drifts into approvals, eligibility, or checklists.
 */
export function isKetdikResponseSafe(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();

  const forbiddenPatterns = [
    '100% approved',
    'guarantee',
    'guaranteed approval',
    'visa will be approved',
    'approval is guaranteed',
    'your visa will be approved',
    'required documents:',
    'documents required:',
    'checklist:',
    'list of documents',
    'here are the documents you need',
    'eligibility',
    'risk score',
    'probability',
    'approval chance',
  ];

  if (forbiddenPatterns.some((phrase) => lower.includes(phrase))) {
    return false;
  }

  // If it claims embassy rules without pointing to official sources, mark unsafe
  const mentionsEmbassy =
    lower.includes('embassy requires') || lower.includes('consulate requires');
  const hasOfficialCue =
    lower.includes('official') ||
    lower.includes('verify with') ||
    lower.includes('check with') ||
    lower.includes('vfs') ||
    lower.includes('gov');

  if (mentionsEmbassy && !hasOfficialCue) {
    return false;
  }

  return true;
}
