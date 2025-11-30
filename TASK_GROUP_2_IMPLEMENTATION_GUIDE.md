# Task Group 2 - Implementation Guide

**Status:** Partially Complete

## Completed

✅ **`apps/backend/src/services/ai-context.service.ts`**
- Added import: `import type { ApplicantProfile } from '../types/visa-brain';`
- Added `buildApplicantProfile()` function that maps `AIUserContext` to `ApplicantProfile`
- Added helper functions: `mapDurationCategory()`, `mapSponsorType()`

## Remaining Changes Needed

### `apps/backend/src/services/ai-openai.service.ts`

**1. Add imports at the top:**
```typescript
import { buildApplicantProfile } from './ai-context.service';
import type { ApplicantProfile } from '../types/visa-brain';
```

**2. Replace the manual field extraction (lines ~1406-1495) with:**

```typescript
// Build ApplicantProfile from AIUserContext
// This uses the canonical schema instead of manually extracting fields
const profile: ApplicantProfile = buildApplicantProfile(userContext, country, visaType);

// Extract risk factors from riskScore if available
const riskFactors: string[] = [];
if (userContext.riskScore) {
  riskFactors.push(...userContext.riskScore.riskFactors);
}

// Add risk factors based on profile data
if (profile.durationCategory && (profile.durationCategory === '>180_days' || profile.durationCategory === 'more_than_1_year')) {
  riskFactors.push(
    'Long stay duration - requires stronger proof of ties and financial capacity'
  );
}

if (profile.sponsorType && profile.sponsorType !== 'self') {
  riskFactors.push(
    `Sponsored by ${profile.sponsorType} - include sponsor financial documents`
  );
}

if (profile.hasTravelHistory === false) {
  riskFactors.push(
    'No previous international travel - include stronger proof of ties to home country'
  );
}

if (profile.previousVisaRefusals) {
  riskFactors.push(
    'Previous visa refusal - include explanation letter and stronger supporting documents'
  );
}

// Extract Uzbekistan context from profile
const homeCountry = profile.residenceCountry || 'Uzbekistan';
const citizenship = profile.nationality || 'UZ';
const isUzbekCitizen = profile.nationality === 'UZ';
```

**3. Update `applicantContext` object (around line 1504) to use profile fields:**

```typescript
applicantContext: {
  // Use ApplicantProfile fields (canonical schema)
  visaType: profile.visaTypeCode,
  duration: profile.durationCategory,
  sponsorType: profile.sponsorType,
  hasTravelHistory: profile.hasTravelHistory,
  hasPreviousRefusals: profile.previousVisaRefusals,
  financialCapacity: profile.bankBalanceUSD
    ? `Bank balance: ~$${profile.bankBalanceUSD}`
    : 'Not specified',
  tiesToHomeCountry: {
    hasProperty: profile.hasPropertyInHomeCountry,
    hasFamily: profile.hasFamilyInHomeCountry,
  },
  // Explicit Uzbekistan context from profile
  homeCountry,
  citizenship,
  isUzbekCitizen,
  documentOrigin: isUzbekCitizen
    ? 'All documents are issued in Uzbekistan (passport, bank statements, income certificates, property documents, etc.)'
    : `Documents are issued in ${homeCountry}`,
},
```

**4. Update `userPrompt` template (around line 1534) to use profile fields:**

```typescript
const userPrompt = `Generate the document checklist following the schema and rules above.

Key Applicant Information:
- Destination Country: ${profile.destinationCountryName} (${profile.destinationCountryCode})
- Visa Type: ${profile.visaTypeLabel} (${profile.visaTypeCode})
- Home Country: ${homeCountry} (${citizenship})
- Applicant is from Uzbekistan: ${isUzbekCitizen ? 'Yes' : 'No'}
- Duration: ${profile.durationCategory || 'Not specified'}
- Sponsor: ${profile.sponsorType ? profile.sponsorType.charAt(0).toUpperCase() + profile.sponsorType.slice(1) : 'Self-funded'}
- Travel History: ${profile.hasTravelHistory ? 'Has previous travel' : profile.hasTravelHistory === false ? 'No previous international travel' : 'Not specified'}
- Previous Refusals: ${profile.previousVisaRefusals ? 'Yes' : 'No'}
- Financial Capacity: ${profile.bankBalanceUSD ? `~$${profile.bankBalanceUSD}` : 'Not specified'}
- Document Origin: ${isUzbekCitizen ? 'All documents are issued in Uzbekistan' : `Documents are issued in ${homeCountry}`}
- Risk Score: ${userContext.riskScore ? `${userContext.riskScore.probabilityPercent}% (${userContext.riskScore.level})` : 'Not calculated'}

Risk Factors to Consider:
${riskFactors.length > 0 ? riskFactors.map((f) => `- ${f}`).join('\n') : '- Standard application profile'}

Knowledge Base Context:
${visaKb || 'No specific knowledge base available - use general requirements for this country/visa type.'}

${documentGuidesText ? `\nDocument Guides:\n${documentGuidesText}` : ''}

CRITICAL REMINDERS:
- ALWAYS output 10-16 documents total (aim for 12-14 for optimal coverage)
- ALWAYS include ALL THREE categories (required, highly_recommended, optional)
- NEVER output fewer than 10 items
- NEVER output only "required" items
- Use correct country-specific terminology (I-20 for USA, LOA for Canada, CAS for UK, etc.)
- All whereToObtain fields must be realistic for Uzbekistan
- All items MUST have complete UZ and RU translations

Return ONLY valid JSON matching the schema, no other text, no markdown, no comments.`;
```

## Summary

The changes replace manual field extraction from `userContext.questionnaireSummary` with the canonical `ApplicantProfile` schema. This:

1. ✅ Centralizes data mapping logic in `buildApplicantProfile()`
2. ✅ Uses typed, canonical schema instead of ad-hoc field access
3. ✅ Makes the code more maintainable and consistent
4. ✅ Keeps backward compatibility (no API changes)

## Testing

After applying changes, verify:
- Checklist generation still works
- All profile fields are correctly populated
- Risk factors are still calculated correctly
- GPT-4 receives the same information (just from a different source)



