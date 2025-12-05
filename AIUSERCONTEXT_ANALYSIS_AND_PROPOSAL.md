# AIUserContext & Questionnaire Summary Analysis

**Date:** 2025-01-27  
**Purpose:** Analyze current questionnaire storage, extraction, and AIUserContext building to propose a rock-solid canonical interface for GPT usage

---

## 1. Current Questionnaire Storage

### 1.1 Storage Locations

#### **Primary Storage: `User.bio` (JSON string)**

- **Field:** `User.bio` (nullable String in Prisma schema)
- **Format:** JSON string containing questionnaire data
- **Multiple formats supported:**
  1. Legacy format (QuestionnaireData)
  2. V2 format with summary (QuestionnaireV2 + VisaQuestionnaireSummary)
  3. Hybrid format (legacy + summary)

#### **Secondary Storage: `Application.questionnaireData`**

- **Status:** Not currently used in backend (frontend may pass it)
- **Format:** Same as User.bio (JSON)

---

### 1.2 Legacy Format (QuestionnaireData)

**Shape:**

```typescript
{
  purpose: 'study' | 'work' | 'tourism' | 'business' | 'immigration' | 'other';
  country: string; // Country ID or code
  duration: 'less_than_1' | '1_3_months' | '3_6_months' | '6_12_months' | 'more_than_1_year';
  traveledBefore: boolean;
  currentStatus: 'student' | 'employee' | 'entrepreneur' | 'unemployed' | 'other';
  hasInvitation: boolean;
  financialSituation: 'stable_income' | 'sponsor' | 'savings' | 'preparing';
  maritalStatus: 'single' | 'married' | 'divorced';
  hasChildren: 'no' | 'one' | 'two_plus';
  englishLevel: 'beginner' | 'intermediate' | 'advanced' | 'native';
}
```

**Location:** Stored directly in `User.bio` as JSON string

**Issues:**

- ❌ No `sponsorType` field (only `financialSituation`)
- ❌ No explicit `previousVisaRejections` field
- ❌ No `riskLevel` or risk score
- ❌ No structured financial data (bankBalance, monthlyIncome)
- ❌ No travel history details
- ❌ No ties to home country details

---

### 1.3 V2 Format (QuestionnaireV2)

**Shape:**

```typescript
{
  version: '2.0';
  targetCountry: 'US' | 'GB' | 'ES' | 'DE' | 'JP' | 'AE' | 'CA' | 'AU';
  visaType: 'tourist' | 'student';

  personal: {
    ageRange: 'under_18' | '18_25' | '26_35' | '36_50' | '51_plus';
    maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
    nationality: 'UZ' | 'other';
    passportStatus: 'valid_6plus_months' | 'valid_less_6_months' | 'no_passport';
  };

  travel: {
    durationCategory: 'up_to_30_days' | '31_90_days' | 'more_than_90_days';
    plannedWhen: 'within_3_months' | '3_to_12_months' | 'not_sure';
    isExactDatesKnown: boolean;
  };

  status: {
    currentStatus: 'student' | 'employed' | 'self_employed' | 'unemployed' | 'business_owner' | 'school_child';
    highestEducation: 'school' | 'college' | 'bachelor' | 'master' | 'phd' | 'other';
    isMinor: boolean;
  };

  finance: {
    payer: 'self' | 'parents' | 'other_family' | 'employer' | 'scholarship' | 'other_sponsor';
    approxMonthlyIncomeRange: 'less_500' | '500_1000' | '1000_3000' | '3000_plus' | 'not_applicable';
    hasBankStatement: boolean;
    hasStableIncome: boolean;
  };

  invitation: {
    hasInvitation: boolean;
    studentInvitationType?: 'university_acceptance' | 'language_course' | 'exchange_program';
    touristInvitationType?: 'no_invitation' | 'hotel_booking' | 'family_or_friends' | 'tour_agency';
  };

  stay: {
    accommodationType: 'hotel' | 'host_family' | 'relative' | 'rented_apartment' | 'dormitory' | 'not_decided';
    hasRoundTripTicket: boolean;
  };

  history: {
    hasTraveledBefore: boolean;
    regionsVisited: ('schengen' | 'usa_canada' | 'uk' | 'asia' | 'middle_east')[];
    hasVisaRefusals: boolean;
  };

  ties: {
    hasProperty: boolean;
    propertyType?: ('apartment' | 'house' | 'land' | 'business')[];
    hasCloseFamilyInUzbekistan: boolean;
  };

  documents: {
    hasEmploymentOrStudyProof: boolean;
    hasInsurance: boolean;
    hasPassport: boolean;
    hasBirthCertificate: boolean;
    hasPropertyDocs: boolean;
  };

  special: {
    travelingWithChildren: boolean;
    hasMedicalReasonForTrip: boolean;
    hasCriminalRecord: boolean;
  };
}
```

**Location:** Stored in `User.bio` as JSON string

**Transformation:** V2 is converted to `VisaQuestionnaireSummary` via `buildSummaryFromQuestionnaireV2()`

---

### 1.4 Hybrid Format (Legacy + Summary)

**Shape:**

```typescript
{
  // Legacy fields (for backward compatibility)
  purpose: 'study' | 'work' | 'tourism' | ...;
  country: string;
  duration: 'less_than_1' | ...;
  // ... all legacy fields

  // New standardized summary
  summary: {
    version: '1.0' | '2.0';
    visaType: 'student' | 'tourist';
    targetCountry: string;
    appLanguage: 'uz' | 'ru' | 'en';
    // ... VisaQuestionnaireSummary fields
  };

  // Metadata
  _version: '1.0';
  _hasSummary: true;
}
```

**Location:** Stored in `User.bio` as JSON string

---

## 2. VisaQuestionnaireSummary (Extracted Summary)

### 2.1 Current Shape

**Location:** `apps/backend/src/types/ai-context.ts` (lines 20-113)

**Shape:**

```typescript
interface VisaQuestionnaireSummary {
  // REQUIRED fields
  version: string; // e.g. "2.0"
  visaType: 'student' | 'tourist';
  targetCountry: string; // "US" | "CA" | "NZ" | "AU" | "JP" | "KR" | "UK" | "ES" | "DE" | "PL"
  appLanguage: 'uz' | 'ru' | 'en';

  // OPTIONAL legacy fields (all nullable)
  age?: number;
  citizenship?: string;
  currentCountry?: string;
  maritalStatus?: 'single' | 'married' | 'divorced' | 'widowed';
  hasChildren?: 'no' | 'one' | 'two_or_more';
  ageRange?: 'under_18' | '18_25' | '26_35' | '36_45' | '46_plus';
  duration?: 'less_than_1_month' | '1_3_months' | '3_6_months' | '6_12_months' | 'more_than_1_year';
  englishLevel?: 'basic' | 'intermediate' | 'advanced';
  hasUniversityInvitation?: boolean;
  hasOtherInvitation?: boolean;
  invitationDetails?: string;
  monthlyIncomeUSD?: number;
  bankBalanceUSD?: number;
  sponsorType?: 'self' | 'parent' | 'relative' | 'company' | 'other'; // ⚠️ CRITICAL, but nullable
  hasPropertyInUzbekistan?: boolean;
  hasFamilyInUzbekistan?: boolean;
  hasInternationalTravel?: boolean;
  previousVisaRejections?: boolean; // ⚠️ CRITICAL, but nullable
  previousRejectionDetails?: string;
  previousOverstay?: boolean;

  documents: {
    hasPassport?: boolean;
    hasBankStatement?: boolean;
    hasEmploymentOrStudyProof?: boolean;
    hasTravelInsurance?: boolean;
    hasInsurance?: boolean;
    hasFlightBooking?: boolean;
    hasHotelBookingOrAccommodation?: boolean;
  };

  notes?: string;
  mainConcerns?: string;

  // NEW: Extended structure (v2) - all optional
  personalInfo?: {
    fullName?: string;
    dateOfBirth?: string;
    nationality?: string;
    passportStatus?: 'valid' | 'expired' | 'no_passport';
    currentResidenceCountry?: string;
  };

  travelInfo?: {
    purpose?: string;
    plannedDates?: string;
    funding?: 'self' | 'sponsor' | 'company' | 'scholarship' | 'mix';
    monthlyCapacity?: number;
    accommodation?: 'reserved' | 'university_housing' | 'not_reserved';
    tuitionStatus?: 'fully_paid' | 'scholarship' | 'partial_scholarship';
    duration?:
      | 'less_than_15_days'
      | '15_30_days'
      | '1_3_months'
      | '3_6_months'
      | 'more_than_6_months';
  };

  employment?: {
    isEmployed?: boolean;
    employerName?: string;
    monthlySalaryUSD?: number;
    currentStatus?: 'student' | 'employed' | 'self_employed' | 'unemployed'; // ⚠️ CRITICAL, but nullable
  };

  education?: {
    isStudent?: boolean;
    university?: string;
    programType?: 'bachelor' | 'master' | 'phd' | 'exchange' | 'language';
    diplomaAvailable?: boolean;
    transcriptAvailable?: boolean;
    hasGraduated?: boolean;
  };

  financialInfo?: {
    selfFundsUSD?: number;
    sponsorDetails?: {
      relationship?: 'parent' | 'sibling' | 'relative' | 'friend' | 'other';
      employment?: 'employed' | 'business_owner' | 'retired' | 'other';
      annualIncomeUSD?: number;
    };
  };

  travelHistory?: {
    visitedCountries?: string[];
    hasRefusals?: boolean; // ⚠️ CRITICAL, but nullable
    refusalDetails?: string;
    traveledBefore?: boolean;
  };

  ties?: {
    propertyDocs?: boolean;
    familyTies?: boolean;
  };
}
```

### 2.2 Extraction Logic

**Function:** `extractQuestionnaireSummary(bio: string | null | undefined): VisaQuestionnaireSummary | null`

**Location:** `apps/backend/src/services/ai-context.service.ts` (lines 127-175)

**Flow:**

1. Parse JSON from `User.bio`
2. Check if V2 format (`version === '2.0'`) → call `buildSummaryFromQuestionnaireV2()`
3. Check if hybrid format (`_hasSummary && summary`) → return `summary`
4. Legacy format → return `null` (no conversion)

**Issues:**

- ❌ Returns `null` for legacy format (no conversion)
- ❌ No validation of extracted summary
- ❌ No defaults for missing fields

---

## 3. AIUserContext (Passed to GPT)

### 3.1 Current Shape

**Location:** `apps/backend/src/types/ai-context.ts` (lines 119-150)

**Shape:**

```typescript
interface AIUserContext {
  userProfile: {
    userId: string; // ✅ REQUIRED
    appLanguage: 'uz' | 'ru' | 'en'; // ✅ REQUIRED
    citizenship?: string; // ⚠️ OPTIONAL
    age?: number; // ⚠️ OPTIONAL
  };

  application: {
    applicationId: string; // ✅ REQUIRED
    visaType: 'student' | 'tourist'; // ✅ REQUIRED
    country: string; // ✅ REQUIRED
    status: 'draft' | 'in_progress' | 'submitted' | 'approved' | 'rejected'; // ✅ REQUIRED
  };

  questionnaireSummary?: VisaQuestionnaireSummary; // ⚠️ OPTIONAL - can be undefined!

  uploadedDocuments: {
    type: string;
    fileName: string;
    url?: string;
    status: 'uploaded' | 'approved' | 'rejected';
  }[];

  appActions: {
    timestamp: string;
    actionType: string;
    details?: any;
  }[];

  riskScore?: {
    // ⚠️ OPTIONAL - only if questionnaireSummary exists
    probabilityPercent: number;
    riskFactors: string[];
    positiveFactors: string[];
    level: 'low' | 'medium' | 'high';
  };
}
```

### 3.2 Building Logic

**Function:** `buildAIUserContext(userId: string, applicationId: string): Promise<AIUserContext>`

**Location:** `apps/backend/src/services/ai-context.service.ts` (lines 184-343)

**Flow:**

1. Fetch `VisaApplication` with related data (user, country, visaType, documents)
2. Extract questionnaire summary from `user.bio` via `extractQuestionnaireSummary()`
3. Determine visa type (from summary or application)
4. Map application status
5. Get country code (from summary or application)
6. Map uploaded documents
7. Get app language (from user or summary)
8. Build `userProfile` (with optional `citizenship` and `age`)
9. Build `application` info
10. Build context (with optional `questionnaireSummary`)
11. Calculate risk score (only if `questionnaireSummary` exists)

**Issues:**

- ❌ `questionnaireSummary` can be `undefined` (if extraction fails or legacy format)
- ❌ `userProfile.citizenship` and `userProfile.age` are optional
- ❌ `riskScore` is only calculated if `questionnaireSummary` exists
- ❌ No defaults for critical fields when `questionnaireSummary` is missing

---

## 4. Critical Fields for Checklist Decisions

### 4.1 Fields Used by GPT in Prompts

**Location:** `apps/backend/src/services/visa-checklist-engine.service.ts` (lines 300-352)

**Fields extracted from `questionnaireSummary`:**

```typescript
const purpose = summary?.travelInfo?.purpose || summary?.visaType || 'tourism';
const duration = summary?.travelInfo?.duration || summary?.duration || 'Not specified';
const sponsorType =
  summary?.sponsorType || (summary?.financialInfo?.sponsorDetails ? 'sponsor' : 'self');
const employmentStatus = summary?.employment?.currentStatus || 'Not specified';
const hasInvitation = summary?.hasUniversityInvitation || summary?.hasOtherInvitation || false;
const travelHistory =
  summary?.hasInternationalTravel || summary?.travelHistory?.traveledBefore || false;
const previousRefusals =
  summary?.previousVisaRejections || summary?.travelHistory?.hasRefusals || false;
const bankBalance = summary?.bankBalanceUSD || summary?.financialInfo?.selfFundsUSD;
const monthlyIncome = summary?.monthlyIncomeUSD || summary?.employment?.monthlySalaryUSD;
const hasProperty = summary?.hasPropertyInUzbekistan || summary?.ties?.propertyDocs || false;
const hasFamily = summary?.hasFamilyInUzbekistan || summary?.ties?.familyTies || false;
const hasChildren = summary?.hasChildren && summary.hasChildren !== 'no';
const age = summary?.age || aiUserContext.userProfile?.age;
```

### 4.2 Critical Fields That Can Be Null/Missing

#### **⚠️ CRITICAL: `sponsorType`**

- **Used for:** Determining if sponsor documents are needed
- **Current state:** Optional (`sponsorType?: 'self' | 'parent' | ...`)
- **Default used:** `'self'` (if missing)
- **Impact:** If missing, GPT may not include sponsor documents when needed

#### **⚠️ CRITICAL: `currentStatus` / `employmentStatus`**

- **Used for:** Determining employment documents, study proof
- **Current state:** Optional (`employment?.currentStatus?: 'student' | 'employed' | ...`)
- **Default used:** `'Not specified'` (if missing)
- **Impact:** GPT may include wrong documents (e.g., employment letter for students)

#### **⚠️ CRITICAL: `previousVisaRejections` / `hasRefusals`**

- **Used for:** Risk assessment, additional documents
- **Current state:** Optional (`previousVisaRejections?: boolean`, `travelHistory?.hasRefusals?: boolean`)
- **Default used:** `false` (if missing)
- **Impact:** May miss important risk mitigation documents

#### **⚠️ CRITICAL: `riskLevel` / `riskScore`**

- **Used for:** Determining additional documents for high-risk applicants
- **Current state:** Optional (`riskScore?: { level: 'low' | 'medium' | 'high', ... }`)
- **Default used:** Not calculated if `questionnaireSummary` is missing
- **Impact:** High-risk applicants may not get appropriate documents

#### **⚠️ CRITICAL: `hasInternationalTravel`**

- **Used for:** Determining if travel history documents are needed
- **Current state:** Optional (`hasInternationalTravel?: boolean`, `travelHistory?.traveledBefore?: boolean`)
- **Default used:** `false` (if missing)
- **Impact:** May miss travel history documents

#### **⚠️ CRITICAL: `bankBalanceUSD` / `selfFundsUSD`**

- **Used for:** Financial document requirements
- **Current state:** Optional (`bankBalanceUSD?: number`, `financialInfo?.selfFundsUSD?: number`)
- **Default used:** `undefined` (if missing)
- **Impact:** GPT may not include appropriate financial documents

#### **⚠️ CRITICAL: `citizenship`**

- **Used for:** Country-specific document requirements
- **Current state:** Optional (`userProfile.citizenship?: string`)
- **Default used:** `undefined` (if missing)
- **Impact:** May miss country-specific documents

#### **⚠️ CRITICAL: `age`**

- **Used for:** Minor/adult document requirements
- **Current state:** Optional (`userProfile.age?: number`, `summary?.age?: number`)
- **Default used:** `undefined` (if missing)
- **Impact:** May miss age-specific documents (e.g., parental consent for minors)

---

## 5. Proposed Canonical AIUserContext Interface

### 5.1 Design Principles

1. **No nullable core fields** - All critical fields have defaults
2. **Explicit defaults** - Clear fallback values for missing data
3. **Type safety** - Strict types, no `undefined` for required fields
4. **Backward compatible** - Can be built from existing data structures
5. **GPT-ready** - All fields needed for checklist generation are present

### 5.2 Proposed Interface

```typescript
/**
 * Canonical AIUserContext - Rock-solid interface for GPT usage
 * All critical fields have explicit defaults, no nullable core fields
 */
interface CanonicalAIUserContext {
  // ✅ REQUIRED - Always present
  userProfile: {
    userId: string;
    appLanguage: 'uz' | 'ru' | 'en';
    citizenship: string; // Default: 'UZ' (Uzbekistan)
    age: number | null; // null if unknown, but field always present
  };

  application: {
    applicationId: string;
    visaType: 'student' | 'tourist';
    country: string; // ISO country code
    status: 'draft' | 'in_progress' | 'submitted' | 'approved' | 'rejected';
  };

  // ✅ REQUIRED - Always present (with defaults if missing)
  applicantProfile: {
    // Core identity
    citizenship: string; // Default: 'UZ'
    age: number | null; // null if unknown

    // Visa details
    visaType: 'student' | 'tourist';
    targetCountry: string;
    duration:
      | 'less_than_1_month'
      | '1_3_months'
      | '3_6_months'
      | '6_12_months'
      | 'more_than_1_year'
      | 'unknown';

    // Financial
    sponsorType: 'self' | 'parent' | 'relative' | 'company' | 'other'; // Default: 'self'
    bankBalanceUSD: number | null; // null if unknown
    monthlyIncomeUSD: number | null; // null if unknown

    // Employment/Education
    currentStatus: 'student' | 'employed' | 'self_employed' | 'unemployed' | 'retired' | 'unknown'; // Default: 'unknown'
    isStudent: boolean; // Default: false
    isEmployed: boolean; // Default: false

    // Travel history
    hasInternationalTravel: boolean; // Default: false
    previousVisaRejections: boolean; // Default: false
    previousOverstay: boolean; // Default: false

    // Ties to home country
    hasPropertyInUzbekistan: boolean; // Default: false
    hasFamilyInUzbekistan: boolean; // Default: false
    maritalStatus: 'single' | 'married' | 'divorced' | 'widowed' | 'unknown'; // Default: 'unknown'
    hasChildren: boolean; // Default: false

    // Invitations
    hasUniversityInvitation: boolean; // Default: false
    hasOtherInvitation: boolean; // Default: false

    // Documents already obtained
    documents: {
      hasPassport: boolean;
      hasBankStatement: boolean;
      hasEmploymentOrStudyProof: boolean;
      hasInsurance: boolean;
      hasFlightBooking: boolean;
      hasHotelBookingOrAccommodation: boolean;
    };
  };

  // ✅ REQUIRED - Always present
  riskScore: {
    probabilityPercent: number; // Default: 70 (baseline)
    level: 'low' | 'medium' | 'high'; // Default: 'medium'
    riskFactors: string[]; // Default: []
    positiveFactors: string[]; // Default: []
  };

  uploadedDocuments: {
    type: string;
    fileName: string;
    url?: string;
    status: 'uploaded' | 'approved' | 'rejected';
  }[];

  appActions: {
    timestamp: string;
    actionType: string;
    details?: any;
  }[];

  // Optional metadata (for debugging/logging)
  metadata?: {
    sourceFormat: 'v2' | 'legacy' | 'hybrid' | 'unknown';
    extractionWarnings?: string[]; // Warnings about missing/incomplete data
    fallbackFieldsUsed?: string[]; // Fields that used defaults
  };
}
```

### 5.3 Key Improvements

1. **`applicantProfile` is always present** - No optional `questionnaireSummary`
2. **All critical fields have defaults** - `sponsorType` defaults to `'self'`, `currentStatus` defaults to `'unknown'`
3. **`riskScore` is always present** - Calculated even if questionnaire is missing
4. **Explicit nulls** - `age`, `bankBalanceUSD`, `monthlyIncomeUSD` can be `null` (explicit "unknown")
5. **Boolean flags** - `hasInternationalTravel`, `previousVisaRejections`, etc. are always `boolean` (never `undefined`)
6. **Documents object** - Always present with all boolean flags
7. **Metadata** - Optional field for tracking data quality

---

## 6. Migration / Adapter Strategy

### 6.1 Adapter Function

**Function:** `buildCanonicalAIUserContext(userId: string, applicationId: string): Promise<CanonicalAIUserContext>`

**Location:** `apps/backend/src/services/ai-context.service.ts` (new function)

**Strategy:**

1. Call existing `buildAIUserContext()` to get current format
2. Extract data from `questionnaireSummary` (if present) or use defaults
3. Build `applicantProfile` with explicit defaults for all fields
4. Always calculate `riskScore` (even if questionnaire is missing)
5. Add metadata about data quality

### 6.2 Field Mapping Logic

```typescript
function buildCanonicalAIUserContext(currentContext: AIUserContext): CanonicalAIUserContext {
  const summary = currentContext.questionnaireSummary;
  const warnings: string[] = [];
  const fallbacks: string[] = [];

  // Extract citizenship (default: 'UZ')
  const citizenship =
    summary?.citizenship ||
    summary?.personalInfo?.nationality ||
    currentContext.userProfile.citizenship ||
    'UZ';
  if (!summary?.citizenship && !currentContext.userProfile.citizenship) {
    fallbacks.push('citizenship');
  }

  // Extract age (can be null)
  const age = summary?.age || currentContext.userProfile.age || null;
  if (age === null) {
    warnings.push('Age is unknown - may miss age-specific documents');
  }

  // Extract sponsorType (default: 'self')
  let sponsorType: 'self' | 'parent' | 'relative' | 'company' | 'other' = 'self';
  if (summary?.sponsorType) {
    sponsorType = summary.sponsorType;
  } else if (summary?.financialInfo?.sponsorDetails?.relationship) {
    const rel = summary.financialInfo.sponsorDetails.relationship;
    sponsorType =
      rel === 'parent' ? 'parent' : rel === 'sibling' || rel === 'relative' ? 'relative' : 'other';
  } else if (summary?.travelInfo?.funding && summary.travelInfo.funding !== 'self') {
    sponsorType = summary.travelInfo.funding === 'sponsor' ? 'relative' : 'other';
  } else {
    fallbacks.push('sponsorType');
  }

  // Extract currentStatus (default: 'unknown')
  let currentStatus:
    | 'student'
    | 'employed'
    | 'self_employed'
    | 'unemployed'
    | 'retired'
    | 'unknown' = 'unknown';
  if (summary?.employment?.currentStatus) {
    currentStatus =
      summary.employment.currentStatus === 'retired' ? 'retired' : summary.employment.currentStatus;
  } else if (summary?.education?.isStudent) {
    currentStatus = 'student';
  } else if (summary?.employment?.isEmployed) {
    currentStatus = 'employed';
  } else {
    fallbacks.push('currentStatus');
  }

  // Extract previousVisaRejections (default: false)
  const previousVisaRejections =
    summary?.previousVisaRejections ?? summary?.travelHistory?.hasRefusals ?? false;

  // Extract hasInternationalTravel (default: false)
  const hasInternationalTravel =
    summary?.hasInternationalTravel ?? summary?.travelHistory?.traveledBefore ?? false;

  // Extract bankBalanceUSD (can be null)
  const bankBalanceUSD = summary?.bankBalanceUSD ?? summary?.financialInfo?.selfFundsUSD ?? null;

  // Extract monthlyIncomeUSD (can be null)
  const monthlyIncomeUSD =
    summary?.monthlyIncomeUSD ?? summary?.employment?.monthlySalaryUSD ?? null;

  // Extract documents (all default to false)
  const documents = {
    hasPassport: summary?.documents?.hasPassport ?? false,
    hasBankStatement: summary?.documents?.hasBankStatement ?? false,
    hasEmploymentOrStudyProof: summary?.documents?.hasEmploymentOrStudyProof ?? false,
    hasInsurance:
      summary?.documents?.hasInsurance ?? summary?.documents?.hasTravelInsurance ?? false,
    hasFlightBooking: summary?.documents?.hasFlightBooking ?? false,
    hasHotelBookingOrAccommodation: summary?.documents?.hasHotelBookingOrAccommodation ?? false,
  };

  // Always calculate risk score (even if questionnaire is missing)
  let riskScore: CanonicalAIUserContext['riskScore'];
  if (summary) {
    const probability = calculateVisaProbability(summary);
    riskScore = {
      probabilityPercent: probability.score,
      level: probability.level,
      riskFactors: probability.riskFactors,
      positiveFactors: probability.positiveFactors,
    };
  } else {
    // Default risk score for missing questionnaire
    riskScore = {
      probabilityPercent: 70,
      level: 'medium',
      riskFactors: ['Questionnaire data incomplete - using default risk assessment'],
      positiveFactors: [],
    };
    warnings.push('Questionnaire missing - using default risk score');
  }

  // Determine source format
  let sourceFormat: 'v2' | 'legacy' | 'hybrid' | 'unknown' = 'unknown';
  if (summary) {
    if (summary.version === '2.0') {
      sourceFormat = 'v2';
    } else if (summary.version === '1.0') {
      sourceFormat = 'hybrid';
    } else {
      sourceFormat = 'legacy';
    }
  }

  return {
    userProfile: {
      userId: currentContext.userProfile.userId,
      appLanguage: currentContext.userProfile.appLanguage,
      citizenship,
      age,
    },
    application: currentContext.application,
    applicantProfile: {
      citizenship,
      age,
      visaType: currentContext.application.visaType,
      targetCountry: currentContext.application.country,
      duration: summary?.duration ?? summary?.travelInfo?.duration ?? 'unknown',
      sponsorType,
      bankBalanceUSD,
      monthlyIncomeUSD,
      currentStatus,
      isStudent: (currentStatus === 'student' || summary?.education?.isStudent) ?? false,
      isEmployed:
        (currentStatus === 'employed' ||
          currentStatus === 'self_employed' ||
          summary?.employment?.isEmployed) ??
        false,
      hasInternationalTravel,
      previousVisaRejections,
      previousOverstay: summary?.previousOverstay ?? false,
      hasPropertyInUzbekistan:
        summary?.hasPropertyInUzbekistan ?? summary?.ties?.propertyDocs ?? false,
      hasFamilyInUzbekistan: summary?.hasFamilyInUzbekistan ?? summary?.ties?.familyTies ?? false,
      maritalStatus: summary?.maritalStatus ?? 'unknown',
      hasChildren: (summary?.hasChildren && summary.hasChildren !== 'no') ?? false,
      hasUniversityInvitation: summary?.hasUniversityInvitation ?? false,
      hasOtherInvitation: summary?.hasOtherInvitation ?? false,
      documents,
    },
    riskScore,
    uploadedDocuments: currentContext.uploadedDocuments,
    appActions: currentContext.appActions,
    metadata: {
      sourceFormat,
      extractionWarnings: warnings.length > 0 ? warnings : undefined,
      fallbackFieldsUsed: fallbacks.length > 0 ? fallbacks : undefined,
    },
  };
}
```

### 6.3 Migration Steps

1. **Create new interface** - Add `CanonicalAIUserContext` to `apps/backend/src/types/ai-context.ts`
2. **Create adapter function** - Add `buildCanonicalAIUserContext()` to `apps/backend/src/services/ai-context.service.ts`
3. **Update GPT services** - Modify `visa-checklist-engine.service.ts` and `ai-openai.service.ts` to use canonical format
4. **Add validation** - Add Zod schema for canonical format validation
5. **Add logging** - Log warnings and fallbacks for monitoring
6. **Gradual rollout** - Use canonical format in new code, keep old format for backward compatibility
7. **Update tests** - Add tests for adapter function and canonical format

### 6.4 Backward Compatibility

- **Keep existing `buildAIUserContext()`** - Don't break existing code
- **Add new `buildCanonicalAIUserContext()`** - New function for canonical format
- **Gradual migration** - Update services one by one
- **Feature flag** - Allow switching between formats during transition

---

## 7. Summary

### 7.1 Current Issues

1. ❌ `questionnaireSummary` can be `undefined` in `AIUserContext`
2. ❌ Critical fields (`sponsorType`, `currentStatus`, `previousVisaRejections`) are nullable
3. ❌ No defaults for missing fields in GPT prompts
4. ❌ `riskScore` is only calculated if questionnaire exists
5. ❌ Legacy format extraction returns `null` (no conversion)

### 7.2 Proposed Solution

1. ✅ **Canonical interface** - All critical fields have explicit defaults
2. ✅ **Always present** - `applicantProfile` and `riskScore` are always present
3. ✅ **Explicit nulls** - Unknown values are `null` (not `undefined`)
4. ✅ **Adapter function** - Maps existing data to canonical format
5. ✅ **Metadata tracking** - Tracks data quality and fallbacks used

### 7.3 Next Steps

1. Review and approve canonical interface
2. Implement adapter function
3. Update GPT services to use canonical format
4. Add validation and tests
5. Monitor warnings and fallbacks in production

---

**End of Analysis**
