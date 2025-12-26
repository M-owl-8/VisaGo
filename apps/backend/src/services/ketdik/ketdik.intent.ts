/**
 * Simple keyword-based intent classifier for Ketdik document instruction questions.
 * Returns true only for "how/where to obtain/prepare" style queries.
 */
export function isKetdikInstructionIntent(text: string): boolean {
  if (!text) return false;

  const normalized = text.toLowerCase();

  // Exclude explicit checklist/approval/risk/eligibility intents
  const disallow = [
    'approval',
    'chance',
    'probability',
    'eligible',
    'eligibility',
    'risk',
    'checklist',
    'list of documents',
    'which documents',
    'what documents',
    'required documents',
  ];
  if (disallow.some((phrase) => normalized.includes(phrase))) {
    return false;
  }

  const instructionKeywords = [
    'how to get',
    'where to get',
    'how do i get',
    'how to obtain',
    'where to obtain',
    'obtain',
    'prepare document',
    'prepare my document',
    'notarize',
    'notary',
    'translation',
    'translate',
    'certified translation',
    'apostille',
    'bank statement',
    'sponsorship letter',
    'sponsor letter',
    'police clearance',
    'police certificate',
    'employment letter',
    'employment certificate',
    'insurance',
    'travel insurance',
    'kadastr',
    'property document',
    'certificate',
    'medical certificate',
  ];

  return instructionKeywords.some((phrase) => normalized.includes(phrase));
}


