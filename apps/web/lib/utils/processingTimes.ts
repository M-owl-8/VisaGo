/**
 * Processing time estimates for visa applications
 * 
 * IMPORTANT: These are estimates based on:
 * - Official embassy published processing times (where available)
 * - General guidance from immigration authorities
 * - Typical ranges reported by applicants
 * 
 * These are NOT guarantees and should always be presented as estimates.
 * Processing times can vary significantly based on individual circumstances.
 */

interface ProcessingTimeEstimate {
  min: number; // weeks
  max: number; // weeks
  confidence: 'official' | 'typical' | 'estimated';
  source?: string;
}

// Country code → visa type → processing time
const PROCESSING_TIMES: Record<string, Record<string, ProcessingTimeEstimate>> = {
  US: {
    tourist: { min: 2, max: 12, confidence: 'official', source: 'USCIS published times' },
    student: { min: 8, max: 16, confidence: 'official', source: 'USCIS F-1 processing times' },
    default: { min: 4, max: 12, confidence: 'typical' },
  },
  CA: {
    tourist: { min: 2, max: 4, confidence: 'official', source: 'IRCC published times' },
    student: { min: 4, max: 8, confidence: 'official', source: 'IRCC study permit times' },
    default: { min: 3, max: 6, confidence: 'typical' },
  },
  GB: {
    tourist: { min: 3, max: 6, confidence: 'typical' },
    student: { min: 3, max: 8, confidence: 'typical' },
    default: { min: 3, max: 8, confidence: 'typical' },
  },
  AU: {
    tourist: { min: 2, max: 4, confidence: 'typical' },
    student: { min: 4, max: 8, confidence: 'typical' },
    default: { min: 3, max: 6, confidence: 'typical' },
  },
  DE: {
    tourist: { min: 2, max: 6, confidence: 'typical' },
    student: { min: 4, max: 12, confidence: 'typical' },
    default: { min: 3, max: 8, confidence: 'typical' },
  },
  FR: {
    tourist: { min: 2, max: 4, confidence: 'typical' },
    student: { min: 2, max: 6, confidence: 'typical' },
    default: { min: 2, max: 6, confidence: 'typical' },
  },
  AE: {
    tourist: { min: 1, max: 2, confidence: 'typical' },
    default: { min: 1, max: 3, confidence: 'typical' },
  },
};

/**
 * Get processing time estimate for a country and visa type
 * 
 * @param countryCode - ISO country code (e.g., 'US', 'CA')
 * @param visaType - Visa type (e.g., 'tourist', 'student')
 * @returns Formatted processing time string with appropriate confidence language
 */
export function getProcessingTimeEstimate(
  countryCode?: string,
  visaType?: string
): {
  text: string;
  confidence: 'official' | 'typical' | 'estimated' | 'generic';
} {
  if (!countryCode) {
    return {
      text: 'Processing times vary by country. Most applications are reviewed within a few weeks after submission.',
      confidence: 'generic',
    };
  }

  const countryData = PROCESSING_TIMES[countryCode.toUpperCase()];
  
  if (!countryData) {
    return {
      text: 'Processing times vary by country. Most applications are reviewed within a few weeks after submission.',
      confidence: 'generic',
    };
  }

  const normalizedVisaType = visaType?.toLowerCase() || 'default';
  const timeData = countryData[normalizedVisaType] || countryData.default;

  if (!timeData) {
    return {
      text: 'Processing times vary. Most applications are reviewed within a few weeks after submission.',
      confidence: 'generic',
    };
  }

  // Format the time range
  const timeRange = timeData.min === timeData.max 
    ? `${timeData.min} week${timeData.min > 1 ? 's' : ''}`
    : `${timeData.min}–${timeData.max} weeks`;

  // Choose language based on confidence
  let prefix = '';
  if (timeData.confidence === 'official') {
    prefix = 'Based on official guidance, processing typically takes ';
  } else if (timeData.confidence === 'typical') {
    prefix = 'Most applications are processed in ';
  } else {
    prefix = 'Applications typically take ';
  }

  const suffix = ' after submission to authorities.';

  return {
    text: prefix + timeRange + suffix,
    confidence: timeData.confidence,
  };
}

/**
 * Get milestone message based on progress percentage
 */
export function getMilestoneMessage(progressPercentage: number): string | null {
  if (progressPercentage < 20) {
    return null; // Too early for milestone
  } else if (progressPercentage >= 20 && progressPercentage < 40) {
    return "Good start — you're building momentum";
  } else if (progressPercentage >= 40 && progressPercentage < 60) {
    return "You're nearly halfway there";
  } else if (progressPercentage >= 60 && progressPercentage < 80) {
    return "Over halfway — keep it up";
  } else if (progressPercentage >= 80 && progressPercentage < 95) {
    return "Almost done — just a few steps left";
  } else if (progressPercentage >= 95 && progressPercentage < 100) {
    return "You're very close to completion";
  } else if (progressPercentage === 100) {
    return "All documents ready";
  }
  
  return null;
}

/**
 * Get reassuring context for rejected documents
 */
export function getRejectionReassurance(): string {
  return "Many applicants need to adjust a document before approval — this is a normal part of the process.";
}

/**
 * Get "what happens next" message based on application state
 */
export function getWhatHappensNext(
  hasChecklist: boolean,
  checklistReady: boolean,
  verifiedCount: number,
  rejectedCount: number,
  pendingCount: number,
  requiredCount: number,
  isSubmitted: boolean
): string {
  if (isSubmitted) {
    return "Your application is with the authorities. They'll review your documents and may reach out if they need anything else. You'll receive updates by email.";
  }

  if (!hasChecklist || !checklistReady) {
    return "Once your checklist is ready, you'll see all the documents you need. You can then upload them one by one, and we'll review each submission.";
  }

  if (rejectedCount > 0) {
    return "Review the feedback on documents that need updates, make the corrections, and re-upload. Once all required documents are verified, you'll be ready to submit.";
  }

  if (verifiedCount === requiredCount && requiredCount > 0) {
    return "All required documents are verified. You can review your application and proceed with submission when ready.";
  }

  if (pendingCount > 0) {
    return "Upload the remaining documents when you have them ready. After you upload, we'll review each one — most reviews finish within a few minutes. If anything needs adjustment, we'll let you know.";
  }

  return "Continue uploading your documents. We'll review each one as you submit them.";
}






