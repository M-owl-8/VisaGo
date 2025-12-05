# Visa Checklist Pipeline - Technical Architecture Document

**Last Updated:** 2025-01-03  
**Status:** Production System Analysis

---

## Table of Contents

1. [Data Models](#data-models)
2. [Backend Flow](#backend-flow)
3. [Frontend Flow](#frontend-flow)
4. [Risk List](#risk-list)
5. [Concrete Recommended Code Changes](#concrete-recommended-code-changes)

---

## Data Models

### Core Models

#### 1. Application / VisaApplication

**Files:**
- `apps/backend/prisma/schema.prisma` (lines 112-137, 493-515)
- Two models exist: `VisaApplication` (legacy) and `Application` (new unified)

**Fields:**
```prisma
model VisaApplication {
  id                 String    @id
  userId             String
  countryId          String
  visaTypeId         String
  status             String    @default("draft")
  progressPercentage Int       @default(0)
  // Relations
  country            Country
  visaType           VisaType
  documents          UserDocument[]
  checkResults       DocumentCheckResult[]
}

model Application {
  id                String    @id
  userId            String
  countryId         String
  visaTypeId        String
  status            String    @default("draft")
  // Relations
  country           Country
  visaType          VisaType
  documentChecklist DocumentChecklist?  // One-to-one relation
}
```

**Key Points:**
- `VisaApplication` is legacy but still used
- `Application` is newer with direct `DocumentChecklist` relation
- Both link to `Country` and `VisaType` via foreign keys

---

#### 2. Country

**File:** `apps/backend/prisma/schema.prisma` (lines 73-89)

**Fields:**
```prisma
model Country {
  id          String   @id
  name        String   @unique
  code        String   @unique  // ISO 3166-1 alpha-2 (e.g., "AU", "US")
  flagEmoji   String
  description String?
  // Relations
  visaTypes   VisaType[]
  applications VisaApplication[]
}
```

**Critical Field:** `code` - Must match `VisaRuleSet.countryCode` (uppercase)

---

#### 3. VisaType

**File:** `apps/backend/prisma/schema.prisma` (lines 91-110)

**Fields:**
```prisma
model VisaType {
  id             String   @id
  countryId      String
  name           String   // e.g., "Tourist Visa", "Student Visa", "F-1 Student Visa"
  description    String?
  processingDays Int
  validity       String
  fee            Float
  requirements   String   // JSON
  documentTypes  String   // JSON array
  // Relations
  country        Country
  applications   VisaApplication[]
}
```

**Critical Field:** `name` - Must be normalized before matching `VisaRuleSet.visaType`
- Stored as: "Tourist Visa", "Student Visa"
- Normalized to: "tourist", "student" (strip "visa" suffix, lowercase)

---

#### 4. EmbassySource

**File:** `apps/backend/prisma/schema.prisma` (lines 569-593)

**Fields:**
```prisma
model EmbassySource {
  id            String    @id
  countryCode   String    // ISO 3166-1 alpha-2
  visaType      String    // "student" | "tourist" | "work"
  url           String    // Official embassy/consulate page URL
  name          String?
  description   String?
  isActive      Boolean   @default(true)
  lastFetchedAt DateTime?
  lastStatus    String?   // "success" | "failed" | "pending"
  // Relations
  ruleSets      VisaRuleSet[]
}
```

**Purpose:** Tracks official embassy sources that generate `VisaRuleSet` entries

---

#### 5. VisaRuleSet

**File:** `apps/backend/prisma/schema.prisma` (lines 595-620)

**Fields:**
```prisma
model VisaRuleSet {
  id                String   @id
  countryCode       String   // ISO 3166-1 alpha-2 (e.g., "AU")
  visaType          String   // "student" | "tourist" | "work" (lowercase, no "visa" suffix)
  data              Json     // VisaRuleSetData structure
  version           Int      @default(1)
  isApproved        Boolean  @default(false)  // CRITICAL: Only approved rulesets are used
  approvedAt        DateTime?
  approvedBy        String?
  rejectionReason   String?
  sourceId          String?  // Links to EmbassySource
  extractionMetadata Json?
  // Relations
  source            EmbassySource?
  versions          VisaRuleVersion[]
}
```

**Critical Fields:**
- `countryCode`: Must be uppercase (e.g., "AU")
- `visaType`: Must be lowercase, no "visa" suffix (e.g., "tourist", "student")
- `isApproved`: Only `true` rulesets are used in production
- `data`: JSON structure containing `requiredDocuments[]`, `financialRequirements`, etc.

**Data Structure (VisaRuleSetData):**
```typescript
interface VisaRuleSetData {
  requiredDocuments: Array<{
    documentType: string;  // e.g., "passport", "bank_statement"
    category: 'required' | 'highly_recommended' | 'optional';
    description?: string;
    validityRequirements?: string;
    formatRequirements?: string;
  }>;
  financialRequirements?: {
    minimumBalance?: number;
    currency?: string;
    bankStatementMonths?: number;
    sponsorRequirements?: {...};
  };
  processingInfo?: {...};
  fees?: {...};
  additionalRequirements?: {...};
  sourceInfo?: {
    extractedFrom?: string;  // URL
    extractedAt?: string;
    confidence?: number;
  };
}
```

---

#### 6. DocumentChecklist

**File:** `apps/backend/prisma/schema.prisma` (lines 517-532)

**Fields:**
```prisma
model DocumentChecklist {
  id            String    @id
  applicationId String    @unique
  status        String    @default("processing")  // "processing" | "ready" | "failed"
  checklistData String?   // JSON string with checklist items
  aiGenerated   Boolean   @default(false)
  generatedAt  DateTime?
  errorMessage  String?
  // Relations
  application   Application @relation(...)
}
```

**Status Values:**
- `processing`: Checklist generation in progress (async)
- `ready`: Checklist available and can be returned
- `failed`: Generation failed (should trigger fallback)

**checklistData JSON Structure:**
```json
{
  "items": [
    {
      "id": "checklist-item-0",
      "documentType": "passport",
      "name": "Passport",
      "nameUz": "Pasport",
      "nameRu": "Паспорт",
      "description": "...",
      "category": "required",
      "required": true,
      "priority": "high",
      "status": "missing" | "pending" | "verified" | "rejected",
      "userDocumentId": "...",
      "fileUrl": "...",
      // ... other fields
    }
  ],
  "aiGenerated": true,
  "aiFallbackUsed": false,
  "aiErrorOccurred": false
}
```

---

## Backend Flow

### Service Architecture

#### 1. DocumentChecklistService

**File:** `apps/backend/src/services/document-checklist.service.ts`

**Main Methods:**

1. **`generateChecklist(applicationId, userId)`** (line 77)
   - Entry point for checklist generation/retrieval
   - Returns: `DocumentChecklist | { status: 'processing' | 'failed' }`

2. **`generateChecklistAsync(applicationId, userId, application)`** (line 285)
   - Async background generation
   - Handles RULES vs LEGACY mode selection
   - Stores result in `DocumentChecklist` table

3. **`generateChecklistFromRules(...)`** (line 905)
   - RULES mode: Uses approved `VisaRuleSet` + GPT-4 enrichment
   - Builds personalized checklist from rules

4. **`generateRobustFallbackChecklist(...)`** (line 1490)
   - LEGACY mode: Hard-coded fallback checklist
   - Used when no ruleset exists or AI fails

5. **`normalizeVisaType(visaTypeName)`** (line 69)
   - Helper: Strips "visa" suffix and lowercases
   - "Tourist Visa" → "tourist"

**Key Flow Logic:**

```typescript
// Step 1: Check cache
if (storedChecklist?.status === 'ready') {
  // Check if approved ruleset exists (invalidate cache if yes)
  const approvedRuleSet = await VisaRulesService.getActiveRuleSet(countryCode, visaType);
  if (!approvedRuleSet) {
    return cachedChecklist;  // Use cache
  }
  // Invalidate and regenerate
}

// Step 2: Extract countryCode and visaType
const countryCode = application.country.code.toUpperCase();  // "AU"
const visaType = normalizeVisaType(application.visaType.name);  // "tourist"

// Step 3: Query VisaRuleSet
const approvedRuleSet = await VisaRulesService.getActiveRuleSet(countryCode, visaType);

// Step 4: Determine mode
const mode = approvedRuleSet ? 'RULES' : 'LEGACY';

// Step 5: Generate checklist
if (mode === 'RULES') {
  aiChecklist = await generateChecklistFromRules(approvedRuleSet, ...);
} else {
  // Try VisaChecklistEngineService first, fallback to AIOpenAIService
  aiChecklist = await VisaChecklistEngineService.generateChecklist(...);
  // or
  aiChecklist = await AIOpenAIService.generateChecklist(...);
}

// Step 6: Store in DocumentChecklist table
await prisma.documentChecklist.update({
  where: { applicationId },
  data: {
    status: 'ready',
    checklistData: JSON.stringify({ items: sanitizedItems, ... }),
    aiGenerated: true,
  }
});
```

---

#### 2. VisaRulesService

**File:** `apps/backend/src/services/visa-rules.service.ts`

**Main Methods:**

1. **`getActiveRuleSet(countryCode, visaType)`** (line 84)
   - Queries for approved ruleset
   - Returns: `VisaRuleSetData | null`
   - Query:
     ```typescript
     prisma.visaRuleSet.findFirst({
       where: {
         countryCode: countryCode.toUpperCase(),
         visaType: visaType.toLowerCase(),
         isApproved: true,
       },
       orderBy: { version: 'desc' }
     })
     ```

2. **`getLatestRuleSet(...)`** (line 123)
   - Gets latest ruleset (approved or pending)

3. **`approveRuleSet(ruleSetId, approvedBy)`** (line 239)
   - Admin action to approve ruleset
   - Unapproves all other versions for same country/visaType

---

#### 3. VisaChecklistEngineService

**File:** `apps/backend/src/services/visa-checklist-engine.service.ts`

**Main Methods:**

1. **`generateChecklist(countryCode, visaType, aiUserContext, previousChecklist?)`** (line 47)
   - Uses `VisaRuleSet` + `AIUserContext` to generate personalized checklist
   - Calls GPT-4 with structured output
   - Returns: `ChecklistResponse` with validated checklist items

**Flow:**
```typescript
// 1. Get approved ruleset
const ruleSet = await VisaRulesService.getActiveRuleSet(countryCode, visaType);
if (!ruleSet) return { checklist: [] };

// 2. Build prompts
const systemPrompt = buildSystemPrompt(countryCode, visaType, ruleSet);
const userPrompt = buildUserPrompt(aiUserContext, ruleSet, previousChecklist);

// 3. Call GPT-4
const response = await openaiClient.chat.completions.create({
  model: checklistModel,
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ],
  response_format: { type: 'json_object' }
});

// 4. Validate and return
const parsed = ChecklistResponseSchema.parse(JSON.parse(response.choices[0].message.content));
return parsed;
```

---

#### 4. AIOpenAIService

**File:** `apps/backend/src/services/ai-openai.service.ts`

**Main Methods:**

1. **`generateChecklist(userContext, countryName, visaTypeName)`** (line 1008)
   - LEGACY mode: GPT-4 decides all documents
   - Uses hybrid mode if ruleset exists (but not approved)
   - Returns: Legacy checklist format

**Modes:**
- **LEGACY**: GPT-4 decides everything (old behavior)
- **HYBRID**: Uses ruleset for base checklist, GPT-4 enriches (if ruleset exists but not approved)

---

### Route Handlers

#### Document Checklist Routes

**File:** `apps/backend/src/routes/document-checklist.ts`

**Endpoints:**

1. **`GET /api/document-checklist/:applicationId`** (line 26)
   - Handler: `DocumentChecklistService.generateChecklist()`
   - Returns: Checklist or `{ status: 'processing' }`
   - Response format:
     ```json
     {
       "success": true,
       "data": {
         "applicationId": "...",
         "items": [...],
         "summary": {
           "total": 10,
           "uploaded": 3,
           "verified": 2,
           "missing": 7,
           "rejected": 1
         },
         "progress": 20,
         "aiFallbackUsed": false
       }
     }
     ```

2. **`PUT /api/document-checklist/:applicationId/items/:itemId`** (line 117)
   - Updates checklist item status
   - Regenerates checklist after update

3. **`POST /api/document-checklist/:applicationId/regenerate`** (line 107 in route file, if exists)
   - Force regenerate checklist
   - Invalidates cache

---

### Data Flow: UI Selection → API Response

```
1. USER SELECTS COUNTRY & VISA TYPE
   └─> Frontend: User selects "Australia" + "Tourist Visa"
   └─> Frontend: Calls POST /api/applications
       └─> Creates Application record
           └─> countryId: "country-au-id"
           └─> visaTypeId: "visatype-tourist-id"
           └─> country.code: "AU"
           └─> visaType.name: "Tourist Visa"

2. FRONTEND REQUESTS CHECKLIST
   └─> Frontend: Calls GET /api/document-checklist/:applicationId
   └─> Route: document-checklist.ts → DocumentChecklistService.generateChecklist()

3. BACKEND: CHECK CACHE
   └─> Query: prisma.documentChecklist.findUnique({ where: { applicationId } })
   └─> If status === 'ready' AND no approved ruleset:
       └─> Return cached checklist
   └─> If status === 'ready' AND approved ruleset exists:
       └─> Invalidate cache, continue to generation

4. BACKEND: EXTRACT COUNTRY/VISA INFO
   └─> Load application with relations:
       └─> application.country.code → "AU"
       └─> application.visaType.name → "Tourist Visa"
   └─> Normalize:
       └─> countryCode = "AU".toUpperCase() → "AU"
       └─> visaType = normalizeVisaType("Tourist Visa") → "tourist"

5. BACKEND: QUERY VISARULESET
   └─> VisaRulesService.getActiveRuleSet("AU", "tourist")
   └─> Query:
       SELECT * FROM VisaRuleSet
       WHERE countryCode = 'AU'
         AND visaType = 'tourist'
         AND isApproved = true
       ORDER BY version DESC
       LIMIT 1
   └─> Result: VisaRuleSetData | null

6. BACKEND: DETERMINE MODE
   └─> If approvedRuleSet exists:
       └─> mode = 'RULES'
       └─> Call: generateChecklistFromRules(approvedRuleSet, ...)
   └─> Else:
       └─> mode = 'LEGACY'
       └─> Try: VisaChecklistEngineService.generateChecklist(...)
       └─> Fallback: AIOpenAIService.generateChecklist(...)

7. BACKEND: GENERATE CHECKLIST (RULES MODE)
   └─> generateChecklistFromRules():
       └─> Build ApplicantProfile from questionnaire
       └─> Extract embassy URLs from ruleset
       └─> Build system prompt with ruleset.data.requiredDocuments
       └─> Build user prompt with ApplicantProfile
       └─> Call GPT-4 with rules-based prompt
       └─> Parse and validate response
       └─> Map to legacy format

8. BACKEND: GENERATE CHECKLIST (LEGACY MODE)
   └─> AIOpenAIService.generateChecklist():
       └─> Build AIUserContext from questionnaire
       └─> Call GPT-4 with generic prompt
       └─> Parse response
       └─> Fallback to hard-coded 4-item checklist if AI fails

9. BACKEND: STORE CHECKLIST
   └─> prisma.documentChecklist.upsert({
         where: { applicationId },
         create: { status: 'ready', checklistData: JSON.stringify(...) },
         update: { status: 'ready', checklistData: JSON.stringify(...) }
       })

10. BACKEND: RETURN RESPONSE
    └─> Format: { success: true, data: { items: [...], summary: {...} } }
    └─> Or: { success: true, data: { status: 'processing', items: [] } }

11. FRONTEND: RENDER CHECKLIST
    └─> Parse response.data.items
    └─> Display checklist items with status indicators
    └─> Show progress bar
    └─> Handle 'processing' status with retry logic
```

---

## Frontend Flow

### API Client

**Files:**
- `apps/web/lib/api/client.ts` (line 294)
- `frontend_new/src/services/api.ts` (line 1163)

**Method:**
```typescript
async getDocumentChecklist(applicationId: string): Promise<ApiResponse> {
  const response = await this.api.get(`/document-checklist/${applicationId}`);
  return response.data;
}
```

---

### React Hooks

**File:** `apps/web/lib/hooks/useApplication.ts` (line 64)

**Flow:**
```typescript
useEffect(() => {
  const [appRes, checklistRes] = await Promise.all([
    apiClient.getApplication(applicationId),
    apiClient.getDocumentChecklist(applicationId),
  ]);
  
  if (checklistRes.success && checklistRes.data) {
    // Parse checklistData if string
    const checklistData = checklistRes.data;
    if (checklistData.checklistData && typeof checklistData.checklistData === 'string') {
      const parsed = JSON.parse(checklistData.checklistData);
      setChecklist({
        ...checklistData,
        items: parsed.checklist || parsed.items || [],
      });
    } else {
      setChecklist(checklistData);
    }
  }
}, [applicationId]);
```

---

### React Native Screen

**File:** `frontend_new/src/screens/visa/ApplicationDetailScreen.tsx` (line 65)

**Flow:**
```typescript
const loadApplicationData = useCallback(async (force = false) => {
  const [appResponse, checklistResponse] = await Promise.all([
    apiClient.getApplication(applicationId),
    apiClient.getDocumentChecklist(applicationId),
  ]);
  
  if (checklistResponse.success && checklistResponse.data) {
    if (checklistResponse.data.status === 'processing') {
      setIsProcessing(true);
      setChecklistItems([]);
      // Retry after 3 seconds
      setTimeout(() => {
        loadApplicationData(true);
      }, 3000);
    } else if (checklistResponse.data.items && Array.isArray(checklistResponse.data.items)) {
      setChecklistItems(checklistResponse.data.items);
      // Calculate summary
      const summary = calculateSummary(checklistResponse.data.items);
      setSummary(summary);
    }
  }
}, [applicationId]);
```

---

## Risk List

### 1. Fallback to LEGACY Mode

**Risks:**

1. **VisaType Name Mismatch** ✅ FIXED
   - **Issue:** `VisaType.name` = "Tourist Visa" but query uses "tourist visa"
   - **Fix Applied:** `normalizeVisaType()` strips "visa" suffix
   - **Remaining Risk:** Edge cases like "F-1 Student Visa" → "f-1 student" (may not match ruleset)

2. **CountryCode Case Mismatch**
   - **Risk:** `Country.code` stored as "au" instead of "AU"
   - **Mitigation:** Code uses `.toUpperCase()`, but DB data must be correct

3. **Ruleset Not Approved**
   - **Risk:** Ruleset exists but `isApproved = false`
   - **Mitigation:** Admin must approve ruleset before use

4. **Ruleset Query Returns Null**
   - **Risk:** No ruleset exists for country/visaType combination
   - **Mitigation:** Falls back to LEGACY mode (expected behavior)

5. **Database Connection Issues**
   - **Risk:** Prisma query fails, throws error
   - **Mitigation:** Try-catch in `getActiveRuleSet()` logs error, returns null

---

### 2. Mismatch Between Visa Types

**Risks:**

1. **VisaType.name Variations**
   - **Examples:**
     - "Tourist Visa" vs "Tourist" vs "Visitor Visa"
     - "Student Visa" vs "F-1 Student Visa" vs "Study Visa"
   - **Impact:** Normalization may not match ruleset.visaType
   - **Mitigation:** `normalizeVisaType()` handles common cases, but complex names may fail

2. **Ruleset.visaType Format**
   - **Risk:** Ruleset stored as "tourist_visa" or "student-visa" instead of "tourist"
   - **Impact:** Query will not match
   - **Mitigation:** Ensure ruleset creation normalizes visaType

3. **Multiple VisaTypes for Same Country**
   - **Risk:** "Tourist Visa" and "Visitor Visa" both exist, but ruleset only for "tourist"
   - **Impact:** One visaType uses ruleset, other falls back to LEGACY

---

### 3. Mismatch Between Country Codes

**Risks:**

1. **Country.code Format**
   - **Risk:** Stored as "AUS" instead of "AU" (ISO 3166-1 alpha-3 vs alpha-2)
   - **Impact:** Query will not match ruleset.countryCode
   - **Mitigation:** Ensure seed data uses ISO 3166-1 alpha-2

2. **Case Sensitivity**
   - **Risk:** Database stores "au" instead of "AU"
   - **Mitigation:** Code uses `.toUpperCase()`, but DB must be correct

3. **Country Name vs Code**
   - **Risk:** Using country name instead of code in queries
   - **Mitigation:** Code correctly uses `country.code`

---

### 4. Outdated Cached Checklists

**Risks:**

1. **Cache Not Invalidated on Ruleset Approval** ✅ PARTIALLY FIXED
   - **Issue:** Checklist cached before ruleset approval, never regenerates
   - **Fix Applied:** Code checks for approved ruleset before returning cache
   - **Remaining Risk:** If ruleset approved AFTER cache created, cache is invalidated on next request (good)

2. **Cache Not Invalidated on Ruleset Update**
   - **Risk:** New ruleset version approved, but cache still uses old version
   - **Mitigation:** Current fix invalidates cache when approved ruleset exists (any version)

3. **Cache TTL Not Implemented**
   - **Risk:** Checklist cached indefinitely, never refreshes
   - **Mitigation:** Manual regeneration endpoint exists

4. **Race Condition: Cache Created During Ruleset Approval**
   - **Risk:** Checklist generated in LEGACY mode, then ruleset approved immediately after
   - **Impact:** Cache contains LEGACY checklist, not ruleset-based
   - **Mitigation:** Next request will invalidate and regenerate

---

### 5. Frontend and Backend Schema Mismatch

**Risks:**

1. **checklistData Format**
   - **Backend:** Stores as JSON string in `DocumentChecklist.checklistData`
   - **Frontend:** Expects `items` array directly
   - **Mitigation:** Route handler parses and formats response

2. **Response Structure**
   - **Backend Returns:**
     ```json
     {
       "success": true,
       "data": {
         "items": [...],
         "summary": {...},
         "progress": 20
       }
     }
     ```
   - **Frontend Expects:** `response.data.items` array
   - **Status:** ✅ Compatible

3. **Processing Status**
   - **Backend Returns:** `{ status: 'processing', items: [] }`
   - **Frontend Handles:** Shows loading state, retries after 3 seconds
   - **Status:** ✅ Compatible

4. **TypeScript Interface Mismatch**
   - **Backend:** `DocumentChecklist` interface (line 50)
   - **Frontend:** `DocumentChecklist` interface in `useApplication.ts` (line 28)
   - **Risk:** Fields may differ
   - **Mitigation:** Both use similar structure, but should be shared type

---

## Concrete Recommended Code Changes

### 1. Fix VisaType Normalization Edge Cases

**File:** `apps/backend/src/services/document-checklist.service.ts`

**Current Code (line 69):**
```typescript
private static normalizeVisaType(visaTypeName: string): string {
  return visaTypeName.toLowerCase().trim().replace(/\s+visa\s*$/i, '').trim();
}
```

**Issue:** "F-1 Student Visa" → "f-1 student" (may not match ruleset)

**Recommended Fix:**
```typescript
private static normalizeVisaType(visaTypeName: string): string {
  let normalized = visaTypeName.toLowerCase().trim();
  
  // Remove "visa" suffix
  normalized = normalized.replace(/\s+visa\s*$/i, '').trim();
  
  // Handle common variations
  const variations: Record<string, string> = {
    'f-1 student': 'student',
    'f1 student': 'student',
    'm-1 student': 'student',
    'j-1 student': 'student',
    'visitor': 'tourist',
    'visitor visa': 'tourist',
    'business': 'tourist',  // May need country-specific handling
    'work': 'work',
    'skilled worker': 'work',
  };
  
  // Check for exact match first
  if (variations[normalized]) {
    return variations[normalized];
  }
  
  // Check for partial match (e.g., "student visa" contains "student")
  for (const [key, value] of Object.entries(variations)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }
  
  return normalized;
}
```

---

### 2. Add Cache Version Tracking

**File:** `apps/backend/prisma/schema.prisma`

**Add Field:**
```prisma
model DocumentChecklist {
  // ... existing fields ...
  rulesetVersion Int?  // Version of VisaRuleSet used to generate this checklist
  rulesetId      String?  // ID of VisaRuleSet used
}
```

**File:** `apps/backend/src/services/document-checklist.service.ts`

**Update Cache Check:**
```typescript
// In generateChecklist() method, after getting approvedRuleSet
if (storedChecklist?.status === 'ready') {
  const approvedRuleSet = await VisaRulesService.getActiveRuleSet(countryCode, visaType);
  
  if (!approvedRuleSet) {
    return cachedChecklist;  // No ruleset, use cache
  }
  
  // Get ruleset record to check version
  const rulesetRecord = await prisma.visaRuleSet.findFirst({
    where: {
      countryCode: countryCode.toUpperCase(),
      visaType: visaType.toLowerCase(),
      isApproved: true,
    },
    orderBy: { version: 'desc' },
  });
  
  // Invalidate if ruleset version changed
  if (storedChecklist.rulesetVersion !== rulesetRecord?.version) {
    logInfo('[Checklist][Cache] Invalidating - ruleset version changed', {
      oldVersion: storedChecklist.rulesetVersion,
      newVersion: rulesetRecord?.version,
    });
    // Continue to regeneration
  } else {
    return cachedChecklist;  // Same version, use cache
  }
}
```

---

### 3. Add Validation for CountryCode Format

**File:** `apps/backend/src/services/visa-rules.service.ts`

**Add Validation:**
```typescript
static async getActiveRuleSet(
  countryCode: string,
  visaType: string
): Promise<VisaRuleSetData | null> {
  // Validate countryCode is ISO 3166-1 alpha-2 (2 uppercase letters)
  const normalizedCountryCode = countryCode.toUpperCase().trim();
  if (!/^[A-Z]{2}$/.test(normalizedCountryCode)) {
    logWarn('[VisaRules] Invalid countryCode format', {
      countryCode,
      normalizedCountryCode,
    });
    return null;
  }
  
  // Validate visaType is not empty
  const normalizedVisaType = visaType.toLowerCase().trim();
  if (!normalizedVisaType) {
    logWarn('[VisaRules] Empty visaType', { visaType });
    return null;
  }
  
  try {
    const ruleSet = await prisma.visaRuleSet.findFirst({
      where: {
        countryCode: normalizedCountryCode,
        visaType: normalizedVisaType,
        isApproved: true,
      },
      orderBy: { version: 'desc' },
    });
    // ... rest of method
  }
}
```

---

### 4. Add Shared TypeScript Types

**File:** `apps/backend/src/types/checklist.ts` (NEW)

```typescript
export interface ChecklistItem {
  id: string;
  documentType: string;
  name: string;
  nameUz: string;
  nameRu: string;
  description: string;
  descriptionUz: string;
  descriptionRu: string;
  category?: 'required' | 'highly_recommended' | 'optional';
  required: boolean;
  priority: string;
  status: 'missing' | 'pending' | 'verified' | 'rejected';
  userDocumentId?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  uploadedAt?: string;
  verificationNotes?: string;
  aiVerified?: boolean;
  aiConfidence?: number;
  whereToObtain?: string;
  whereToObtainUz?: string;
  whereToObtainRu?: string;
}

export interface DocumentChecklist {
  applicationId: string;
  countryId: string;
  visaTypeId: string;
  items: ChecklistItem[];
  totalRequired: number;
  completed: number;
  progress: number;
  generatedAt: string;
  aiGenerated: boolean;
  aiFallbackUsed?: boolean;
  aiErrorOccurred?: boolean;
}

export interface ChecklistSummary {
  total: number;
  uploaded: number;
  verified: number;
  missing: number;
  rejected: number;
}
```

**Update:** Import in both backend and frontend

---

### 5. Add Logging for Mode Selection

**File:** `apps/backend/src/services/document-checklist.service.ts`

**Already Added, but enhance:**
```typescript
// After getActiveRuleSet() call
if (approvedRuleSet) {
  logInfo('[Checklist][Mode] Using RULES mode', {
    applicationId,
    countryCode,
    visaType,
    rulesetDocumentsCount: approvedRuleSet.requiredDocuments?.length || 0,
    rulesetVersion: 'latest',  // TODO: Get actual version
  });
} else {
  logWarn('[Checklist][Mode] Falling back to LEGACY mode', {
    applicationId,
    countryCode,
    visaType,
    reason: 'no_approved_ruleset',
    // Log what was queried
    queriedCountryCode: countryCode,
    queriedVisaType: visaType,
  });
}
```

---

### 6. Add Database Migration for Cache Version Tracking

**File:** `apps/backend/prisma/migrations/XXXX_add_checklist_ruleset_version/migration.sql`

```sql
ALTER TABLE "DocumentChecklist" 
ADD COLUMN "rulesetVersion" INTEGER,
ADD COLUMN "rulesetId" TEXT;

CREATE INDEX "DocumentChecklist_rulesetId_idx" ON "DocumentChecklist"("rulesetId");
```

---

### 7. Add Admin Endpoint to Invalidate All Caches

**File:** `apps/backend/src/routes/admin.ts`

```typescript
/**
 * POST /api/admin/checklist/invalidate-all
 * Invalidate all cached checklists (use when ruleset approved)
 */
router.post('/checklist/invalidate-all', async (req, res, next) => {
  try {
    // Set all 'ready' checklists to 'pending' to force regeneration
    const result = await prisma.documentChecklist.updateMany({
      where: { status: 'ready' },
      data: { status: 'pending' },
    });
    
    return res.json({
      success: true,
      message: `Invalidated ${result.count} cached checklists`,
    });
  } catch (error) {
    next(error);
  }
});
```

---

### 8. Add Monitoring/Alerting

**File:** `apps/backend/src/services/document-checklist.service.ts`

**Add Metrics:**
```typescript
// Track mode usage
if (mode === 'RULES') {
  // Increment metric: checklist.rules_mode.count
  logInfo('[Checklist][Metrics] RULES mode used', {
    countryCode,
    visaType,
  });
} else {
  // Increment metric: checklist.legacy_mode.count
  logWarn('[Checklist][Metrics] LEGACY mode used', {
    countryCode,
    visaType,
    reason: 'no_approved_ruleset',
  });
}
```

---

## Summary

### Current State
- ✅ VisaType normalization fixed (strips "visa" suffix)
- ✅ Cache invalidation when approved ruleset exists
- ✅ Logging for mode selection
- ⚠️ Edge cases in visaType normalization (F-1, etc.)
- ⚠️ No cache version tracking
- ⚠️ No shared TypeScript types

### Recommended Priority
1. **High:** Add cache version tracking (prevents stale checklists)
2. **High:** Enhance visaType normalization (handles F-1, visitor, etc.)
3. **Medium:** Add shared TypeScript types (prevents schema drift)
4. **Medium:** Add validation for countryCode format
5. **Low:** Add admin endpoint to invalidate all caches
6. **Low:** Add monitoring/alerting

---

**Document End**


**Last Updated:** 2025-01-03  
**Status:** Production System Analysis

---

## Table of Contents

1. [Data Models](#data-models)
2. [Backend Flow](#backend-flow)
3. [Frontend Flow](#frontend-flow)
4. [Risk List](#risk-list)
5. [Concrete Recommended Code Changes](#concrete-recommended-code-changes)

---

## Data Models

### Core Models

#### 1. Application / VisaApplication

**Files:**
- `apps/backend/prisma/schema.prisma` (lines 112-137, 493-515)
- Two models exist: `VisaApplication` (legacy) and `Application` (new unified)

**Fields:**
```prisma
model VisaApplication {
  id                 String    @id
  userId             String
  countryId          String
  visaTypeId         String
  status             String    @default("draft")
  progressPercentage Int       @default(0)
  // Relations
  country            Country
  visaType           VisaType
  documents          UserDocument[]
  checkResults       DocumentCheckResult[]
}

model Application {
  id                String    @id
  userId            String
  countryId         String
  visaTypeId        String
  status            String    @default("draft")
  // Relations
  country           Country
  visaType          VisaType
  documentChecklist DocumentChecklist?  // One-to-one relation
}
```

**Key Points:**
- `VisaApplication` is legacy but still used
- `Application` is newer with direct `DocumentChecklist` relation
- Both link to `Country` and `VisaType` via foreign keys

---

#### 2. Country

**File:** `apps/backend/prisma/schema.prisma` (lines 73-89)

**Fields:**
```prisma
model Country {
  id          String   @id
  name        String   @unique
  code        String   @unique  // ISO 3166-1 alpha-2 (e.g., "AU", "US")
  flagEmoji   String
  description String?
  // Relations
  visaTypes   VisaType[]
  applications VisaApplication[]
}
```

**Critical Field:** `code` - Must match `VisaRuleSet.countryCode` (uppercase)

---

#### 3. VisaType

**File:** `apps/backend/prisma/schema.prisma` (lines 91-110)

**Fields:**
```prisma
model VisaType {
  id             String   @id
  countryId      String
  name           String   // e.g., "Tourist Visa", "Student Visa", "F-1 Student Visa"
  description    String?
  processingDays Int
  validity       String
  fee            Float
  requirements   String   // JSON
  documentTypes  String   // JSON array
  // Relations
  country        Country
  applications   VisaApplication[]
}
```

**Critical Field:** `name` - Must be normalized before matching `VisaRuleSet.visaType`
- Stored as: "Tourist Visa", "Student Visa"
- Normalized to: "tourist", "student" (strip "visa" suffix, lowercase)

---

#### 4. EmbassySource

**File:** `apps/backend/prisma/schema.prisma` (lines 569-593)

**Fields:**
```prisma
model EmbassySource {
  id            String    @id
  countryCode   String    // ISO 3166-1 alpha-2
  visaType      String    // "student" | "tourist" | "work"
  url           String    // Official embassy/consulate page URL
  name          String?
  description   String?
  isActive      Boolean   @default(true)
  lastFetchedAt DateTime?
  lastStatus    String?   // "success" | "failed" | "pending"
  // Relations
  ruleSets      VisaRuleSet[]
}
```

**Purpose:** Tracks official embassy sources that generate `VisaRuleSet` entries

---

#### 5. VisaRuleSet

**File:** `apps/backend/prisma/schema.prisma` (lines 595-620)

**Fields:**
```prisma
model VisaRuleSet {
  id                String   @id
  countryCode       String   // ISO 3166-1 alpha-2 (e.g., "AU")
  visaType          String   // "student" | "tourist" | "work" (lowercase, no "visa" suffix)
  data              Json     // VisaRuleSetData structure
  version           Int      @default(1)
  isApproved        Boolean  @default(false)  // CRITICAL: Only approved rulesets are used
  approvedAt        DateTime?
  approvedBy        String?
  rejectionReason   String?
  sourceId          String?  // Links to EmbassySource
  extractionMetadata Json?
  // Relations
  source            EmbassySource?
  versions          VisaRuleVersion[]
}
```

**Critical Fields:**
- `countryCode`: Must be uppercase (e.g., "AU")
- `visaType`: Must be lowercase, no "visa" suffix (e.g., "tourist", "student")
- `isApproved`: Only `true` rulesets are used in production
- `data`: JSON structure containing `requiredDocuments[]`, `financialRequirements`, etc.

**Data Structure (VisaRuleSetData):**
```typescript
interface VisaRuleSetData {
  requiredDocuments: Array<{
    documentType: string;  // e.g., "passport", "bank_statement"
    category: 'required' | 'highly_recommended' | 'optional';
    description?: string;
    validityRequirements?: string;
    formatRequirements?: string;
  }>;
  financialRequirements?: {
    minimumBalance?: number;
    currency?: string;
    bankStatementMonths?: number;
    sponsorRequirements?: {...};
  };
  processingInfo?: {...};
  fees?: {...};
  additionalRequirements?: {...};
  sourceInfo?: {
    extractedFrom?: string;  // URL
    extractedAt?: string;
    confidence?: number;
  };
}
```

---

#### 6. DocumentChecklist

**File:** `apps/backend/prisma/schema.prisma` (lines 517-532)

**Fields:**
```prisma
model DocumentChecklist {
  id            String    @id
  applicationId String    @unique
  status        String    @default("processing")  // "processing" | "ready" | "failed"
  checklistData String?   // JSON string with checklist items
  aiGenerated   Boolean   @default(false)
  generatedAt  DateTime?
  errorMessage  String?
  // Relations
  application   Application @relation(...)
}
```

**Status Values:**
- `processing`: Checklist generation in progress (async)
- `ready`: Checklist available and can be returned
- `failed`: Generation failed (should trigger fallback)

**checklistData JSON Structure:**
```json
{
  "items": [
    {
      "id": "checklist-item-0",
      "documentType": "passport",
      "name": "Passport",
      "nameUz": "Pasport",
      "nameRu": "Паспорт",
      "description": "...",
      "category": "required",
      "required": true,
      "priority": "high",
      "status": "missing" | "pending" | "verified" | "rejected",
      "userDocumentId": "...",
      "fileUrl": "...",
      // ... other fields
    }
  ],
  "aiGenerated": true,
  "aiFallbackUsed": false,
  "aiErrorOccurred": false
}
```

---

## Backend Flow

### Service Architecture

#### 1. DocumentChecklistService

**File:** `apps/backend/src/services/document-checklist.service.ts`

**Main Methods:**

1. **`generateChecklist(applicationId, userId)`** (line 77)
   - Entry point for checklist generation/retrieval
   - Returns: `DocumentChecklist | { status: 'processing' | 'failed' }`

2. **`generateChecklistAsync(applicationId, userId, application)`** (line 285)
   - Async background generation
   - Handles RULES vs LEGACY mode selection
   - Stores result in `DocumentChecklist` table

3. **`generateChecklistFromRules(...)`** (line 905)
   - RULES mode: Uses approved `VisaRuleSet` + GPT-4 enrichment
   - Builds personalized checklist from rules

4. **`generateRobustFallbackChecklist(...)`** (line 1490)
   - LEGACY mode: Hard-coded fallback checklist
   - Used when no ruleset exists or AI fails

5. **`normalizeVisaType(visaTypeName)`** (line 69)
   - Helper: Strips "visa" suffix and lowercases
   - "Tourist Visa" → "tourist"

**Key Flow Logic:**

```typescript
// Step 1: Check cache
if (storedChecklist?.status === 'ready') {
  // Check if approved ruleset exists (invalidate cache if yes)
  const approvedRuleSet = await VisaRulesService.getActiveRuleSet(countryCode, visaType);
  if (!approvedRuleSet) {
    return cachedChecklist;  // Use cache
  }
  // Invalidate and regenerate
}

// Step 2: Extract countryCode and visaType
const countryCode = application.country.code.toUpperCase();  // "AU"
const visaType = normalizeVisaType(application.visaType.name);  // "tourist"

// Step 3: Query VisaRuleSet
const approvedRuleSet = await VisaRulesService.getActiveRuleSet(countryCode, visaType);

// Step 4: Determine mode
const mode = approvedRuleSet ? 'RULES' : 'LEGACY';

// Step 5: Generate checklist
if (mode === 'RULES') {
  aiChecklist = await generateChecklistFromRules(approvedRuleSet, ...);
} else {
  // Try VisaChecklistEngineService first, fallback to AIOpenAIService
  aiChecklist = await VisaChecklistEngineService.generateChecklist(...);
  // or
  aiChecklist = await AIOpenAIService.generateChecklist(...);
}

// Step 6: Store in DocumentChecklist table
await prisma.documentChecklist.update({
  where: { applicationId },
  data: {
    status: 'ready',
    checklistData: JSON.stringify({ items: sanitizedItems, ... }),
    aiGenerated: true,
  }
});
```

---

#### 2. VisaRulesService

**File:** `apps/backend/src/services/visa-rules.service.ts`

**Main Methods:**

1. **`getActiveRuleSet(countryCode, visaType)`** (line 84)
   - Queries for approved ruleset
   - Returns: `VisaRuleSetData | null`
   - Query:
     ```typescript
     prisma.visaRuleSet.findFirst({
       where: {
         countryCode: countryCode.toUpperCase(),
         visaType: visaType.toLowerCase(),
         isApproved: true,
       },
       orderBy: { version: 'desc' }
     })
     ```

2. **`getLatestRuleSet(...)`** (line 123)
   - Gets latest ruleset (approved or pending)

3. **`approveRuleSet(ruleSetId, approvedBy)`** (line 239)
   - Admin action to approve ruleset
   - Unapproves all other versions for same country/visaType

---

#### 3. VisaChecklistEngineService

**File:** `apps/backend/src/services/visa-checklist-engine.service.ts`

**Main Methods:**

1. **`generateChecklist(countryCode, visaType, aiUserContext, previousChecklist?)`** (line 47)
   - Uses `VisaRuleSet` + `AIUserContext` to generate personalized checklist
   - Calls GPT-4 with structured output
   - Returns: `ChecklistResponse` with validated checklist items

**Flow:**
```typescript
// 1. Get approved ruleset
const ruleSet = await VisaRulesService.getActiveRuleSet(countryCode, visaType);
if (!ruleSet) return { checklist: [] };

// 2. Build prompts
const systemPrompt = buildSystemPrompt(countryCode, visaType, ruleSet);
const userPrompt = buildUserPrompt(aiUserContext, ruleSet, previousChecklist);

// 3. Call GPT-4
const response = await openaiClient.chat.completions.create({
  model: checklistModel,
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ],
  response_format: { type: 'json_object' }
});

// 4. Validate and return
const parsed = ChecklistResponseSchema.parse(JSON.parse(response.choices[0].message.content));
return parsed;
```

---

#### 4. AIOpenAIService

**File:** `apps/backend/src/services/ai-openai.service.ts`

**Main Methods:**

1. **`generateChecklist(userContext, countryName, visaTypeName)`** (line 1008)
   - LEGACY mode: GPT-4 decides all documents
   - Uses hybrid mode if ruleset exists (but not approved)
   - Returns: Legacy checklist format

**Modes:**
- **LEGACY**: GPT-4 decides everything (old behavior)
- **HYBRID**: Uses ruleset for base checklist, GPT-4 enriches (if ruleset exists but not approved)

---

### Route Handlers

#### Document Checklist Routes

**File:** `apps/backend/src/routes/document-checklist.ts`

**Endpoints:**

1. **`GET /api/document-checklist/:applicationId`** (line 26)
   - Handler: `DocumentChecklistService.generateChecklist()`
   - Returns: Checklist or `{ status: 'processing' }`
   - Response format:
     ```json
     {
       "success": true,
       "data": {
         "applicationId": "...",
         "items": [...],
         "summary": {
           "total": 10,
           "uploaded": 3,
           "verified": 2,
           "missing": 7,
           "rejected": 1
         },
         "progress": 20,
         "aiFallbackUsed": false
       }
     }
     ```

2. **`PUT /api/document-checklist/:applicationId/items/:itemId`** (line 117)
   - Updates checklist item status
   - Regenerates checklist after update

3. **`POST /api/document-checklist/:applicationId/regenerate`** (line 107 in route file, if exists)
   - Force regenerate checklist
   - Invalidates cache

---

### Data Flow: UI Selection → API Response

```
1. USER SELECTS COUNTRY & VISA TYPE
   └─> Frontend: User selects "Australia" + "Tourist Visa"
   └─> Frontend: Calls POST /api/applications
       └─> Creates Application record
           └─> countryId: "country-au-id"
           └─> visaTypeId: "visatype-tourist-id"
           └─> country.code: "AU"
           └─> visaType.name: "Tourist Visa"

2. FRONTEND REQUESTS CHECKLIST
   └─> Frontend: Calls GET /api/document-checklist/:applicationId
   └─> Route: document-checklist.ts → DocumentChecklistService.generateChecklist()

3. BACKEND: CHECK CACHE
   └─> Query: prisma.documentChecklist.findUnique({ where: { applicationId } })
   └─> If status === 'ready' AND no approved ruleset:
       └─> Return cached checklist
   └─> If status === 'ready' AND approved ruleset exists:
       └─> Invalidate cache, continue to generation

4. BACKEND: EXTRACT COUNTRY/VISA INFO
   └─> Load application with relations:
       └─> application.country.code → "AU"
       └─> application.visaType.name → "Tourist Visa"
   └─> Normalize:
       └─> countryCode = "AU".toUpperCase() → "AU"
       └─> visaType = normalizeVisaType("Tourist Visa") → "tourist"

5. BACKEND: QUERY VISARULESET
   └─> VisaRulesService.getActiveRuleSet("AU", "tourist")
   └─> Query:
       SELECT * FROM VisaRuleSet
       WHERE countryCode = 'AU'
         AND visaType = 'tourist'
         AND isApproved = true
       ORDER BY version DESC
       LIMIT 1
   └─> Result: VisaRuleSetData | null

6. BACKEND: DETERMINE MODE
   └─> If approvedRuleSet exists:
       └─> mode = 'RULES'
       └─> Call: generateChecklistFromRules(approvedRuleSet, ...)
   └─> Else:
       └─> mode = 'LEGACY'
       └─> Try: VisaChecklistEngineService.generateChecklist(...)
       └─> Fallback: AIOpenAIService.generateChecklist(...)

7. BACKEND: GENERATE CHECKLIST (RULES MODE)
   └─> generateChecklistFromRules():
       └─> Build ApplicantProfile from questionnaire
       └─> Extract embassy URLs from ruleset
       └─> Build system prompt with ruleset.data.requiredDocuments
       └─> Build user prompt with ApplicantProfile
       └─> Call GPT-4 with rules-based prompt
       └─> Parse and validate response
       └─> Map to legacy format

8. BACKEND: GENERATE CHECKLIST (LEGACY MODE)
   └─> AIOpenAIService.generateChecklist():
       └─> Build AIUserContext from questionnaire
       └─> Call GPT-4 with generic prompt
       └─> Parse response
       └─> Fallback to hard-coded 4-item checklist if AI fails

9. BACKEND: STORE CHECKLIST
   └─> prisma.documentChecklist.upsert({
         where: { applicationId },
         create: { status: 'ready', checklistData: JSON.stringify(...) },
         update: { status: 'ready', checklistData: JSON.stringify(...) }
       })

10. BACKEND: RETURN RESPONSE
    └─> Format: { success: true, data: { items: [...], summary: {...} } }
    └─> Or: { success: true, data: { status: 'processing', items: [] } }

11. FRONTEND: RENDER CHECKLIST
    └─> Parse response.data.items
    └─> Display checklist items with status indicators
    └─> Show progress bar
    └─> Handle 'processing' status with retry logic
```

---

## Frontend Flow

### API Client

**Files:**
- `apps/web/lib/api/client.ts` (line 294)
- `frontend_new/src/services/api.ts` (line 1163)

**Method:**
```typescript
async getDocumentChecklist(applicationId: string): Promise<ApiResponse> {
  const response = await this.api.get(`/document-checklist/${applicationId}`);
  return response.data;
}
```

---

### React Hooks

**File:** `apps/web/lib/hooks/useApplication.ts` (line 64)

**Flow:**
```typescript
useEffect(() => {
  const [appRes, checklistRes] = await Promise.all([
    apiClient.getApplication(applicationId),
    apiClient.getDocumentChecklist(applicationId),
  ]);
  
  if (checklistRes.success && checklistRes.data) {
    // Parse checklistData if string
    const checklistData = checklistRes.data;
    if (checklistData.checklistData && typeof checklistData.checklistData === 'string') {
      const parsed = JSON.parse(checklistData.checklistData);
      setChecklist({
        ...checklistData,
        items: parsed.checklist || parsed.items || [],
      });
    } else {
      setChecklist(checklistData);
    }
  }
}, [applicationId]);
```

---

### React Native Screen

**File:** `frontend_new/src/screens/visa/ApplicationDetailScreen.tsx` (line 65)

**Flow:**
```typescript
const loadApplicationData = useCallback(async (force = false) => {
  const [appResponse, checklistResponse] = await Promise.all([
    apiClient.getApplication(applicationId),
    apiClient.getDocumentChecklist(applicationId),
  ]);
  
  if (checklistResponse.success && checklistResponse.data) {
    if (checklistResponse.data.status === 'processing') {
      setIsProcessing(true);
      setChecklistItems([]);
      // Retry after 3 seconds
      setTimeout(() => {
        loadApplicationData(true);
      }, 3000);
    } else if (checklistResponse.data.items && Array.isArray(checklistResponse.data.items)) {
      setChecklistItems(checklistResponse.data.items);
      // Calculate summary
      const summary = calculateSummary(checklistResponse.data.items);
      setSummary(summary);
    }
  }
}, [applicationId]);
```

---

## Risk List

### 1. Fallback to LEGACY Mode

**Risks:**

1. **VisaType Name Mismatch** ✅ FIXED
   - **Issue:** `VisaType.name` = "Tourist Visa" but query uses "tourist visa"
   - **Fix Applied:** `normalizeVisaType()` strips "visa" suffix
   - **Remaining Risk:** Edge cases like "F-1 Student Visa" → "f-1 student" (may not match ruleset)

2. **CountryCode Case Mismatch**
   - **Risk:** `Country.code` stored as "au" instead of "AU"
   - **Mitigation:** Code uses `.toUpperCase()`, but DB data must be correct

3. **Ruleset Not Approved**
   - **Risk:** Ruleset exists but `isApproved = false`
   - **Mitigation:** Admin must approve ruleset before use

4. **Ruleset Query Returns Null**
   - **Risk:** No ruleset exists for country/visaType combination
   - **Mitigation:** Falls back to LEGACY mode (expected behavior)

5. **Database Connection Issues**
   - **Risk:** Prisma query fails, throws error
   - **Mitigation:** Try-catch in `getActiveRuleSet()` logs error, returns null

---

### 2. Mismatch Between Visa Types

**Risks:**

1. **VisaType.name Variations**
   - **Examples:**
     - "Tourist Visa" vs "Tourist" vs "Visitor Visa"
     - "Student Visa" vs "F-1 Student Visa" vs "Study Visa"
   - **Impact:** Normalization may not match ruleset.visaType
   - **Mitigation:** `normalizeVisaType()` handles common cases, but complex names may fail

2. **Ruleset.visaType Format**
   - **Risk:** Ruleset stored as "tourist_visa" or "student-visa" instead of "tourist"
   - **Impact:** Query will not match
   - **Mitigation:** Ensure ruleset creation normalizes visaType

3. **Multiple VisaTypes for Same Country**
   - **Risk:** "Tourist Visa" and "Visitor Visa" both exist, but ruleset only for "tourist"
   - **Impact:** One visaType uses ruleset, other falls back to LEGACY

---

### 3. Mismatch Between Country Codes

**Risks:**

1. **Country.code Format**
   - **Risk:** Stored as "AUS" instead of "AU" (ISO 3166-1 alpha-3 vs alpha-2)
   - **Impact:** Query will not match ruleset.countryCode
   - **Mitigation:** Ensure seed data uses ISO 3166-1 alpha-2

2. **Case Sensitivity**
   - **Risk:** Database stores "au" instead of "AU"
   - **Mitigation:** Code uses `.toUpperCase()`, but DB must be correct

3. **Country Name vs Code**
   - **Risk:** Using country name instead of code in queries
   - **Mitigation:** Code correctly uses `country.code`

---

### 4. Outdated Cached Checklists

**Risks:**

1. **Cache Not Invalidated on Ruleset Approval** ✅ PARTIALLY FIXED
   - **Issue:** Checklist cached before ruleset approval, never regenerates
   - **Fix Applied:** Code checks for approved ruleset before returning cache
   - **Remaining Risk:** If ruleset approved AFTER cache created, cache is invalidated on next request (good)

2. **Cache Not Invalidated on Ruleset Update**
   - **Risk:** New ruleset version approved, but cache still uses old version
   - **Mitigation:** Current fix invalidates cache when approved ruleset exists (any version)

3. **Cache TTL Not Implemented**
   - **Risk:** Checklist cached indefinitely, never refreshes
   - **Mitigation:** Manual regeneration endpoint exists

4. **Race Condition: Cache Created During Ruleset Approval**
   - **Risk:** Checklist generated in LEGACY mode, then ruleset approved immediately after
   - **Impact:** Cache contains LEGACY checklist, not ruleset-based
   - **Mitigation:** Next request will invalidate and regenerate

---

### 5. Frontend and Backend Schema Mismatch

**Risks:**

1. **checklistData Format**
   - **Backend:** Stores as JSON string in `DocumentChecklist.checklistData`
   - **Frontend:** Expects `items` array directly
   - **Mitigation:** Route handler parses and formats response

2. **Response Structure**
   - **Backend Returns:**
     ```json
     {
       "success": true,
       "data": {
         "items": [...],
         "summary": {...},
         "progress": 20
       }
     }
     ```
   - **Frontend Expects:** `response.data.items` array
   - **Status:** ✅ Compatible

3. **Processing Status**
   - **Backend Returns:** `{ status: 'processing', items: [] }`
   - **Frontend Handles:** Shows loading state, retries after 3 seconds
   - **Status:** ✅ Compatible

4. **TypeScript Interface Mismatch**
   - **Backend:** `DocumentChecklist` interface (line 50)
   - **Frontend:** `DocumentChecklist` interface in `useApplication.ts` (line 28)
   - **Risk:** Fields may differ
   - **Mitigation:** Both use similar structure, but should be shared type

---

## Concrete Recommended Code Changes

### 1. Fix VisaType Normalization Edge Cases

**File:** `apps/backend/src/services/document-checklist.service.ts`

**Current Code (line 69):**
```typescript
private static normalizeVisaType(visaTypeName: string): string {
  return visaTypeName.toLowerCase().trim().replace(/\s+visa\s*$/i, '').trim();
}
```

**Issue:** "F-1 Student Visa" → "f-1 student" (may not match ruleset)

**Recommended Fix:**
```typescript
private static normalizeVisaType(visaTypeName: string): string {
  let normalized = visaTypeName.toLowerCase().trim();
  
  // Remove "visa" suffix
  normalized = normalized.replace(/\s+visa\s*$/i, '').trim();
  
  // Handle common variations
  const variations: Record<string, string> = {
    'f-1 student': 'student',
    'f1 student': 'student',
    'm-1 student': 'student',
    'j-1 student': 'student',
    'visitor': 'tourist',
    'visitor visa': 'tourist',
    'business': 'tourist',  // May need country-specific handling
    'work': 'work',
    'skilled worker': 'work',
  };
  
  // Check for exact match first
  if (variations[normalized]) {
    return variations[normalized];
  }
  
  // Check for partial match (e.g., "student visa" contains "student")
  for (const [key, value] of Object.entries(variations)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }
  
  return normalized;
}
```

---

### 2. Add Cache Version Tracking

**File:** `apps/backend/prisma/schema.prisma`

**Add Field:**
```prisma
model DocumentChecklist {
  // ... existing fields ...
  rulesetVersion Int?  // Version of VisaRuleSet used to generate this checklist
  rulesetId      String?  // ID of VisaRuleSet used
}
```

**File:** `apps/backend/src/services/document-checklist.service.ts`

**Update Cache Check:**
```typescript
// In generateChecklist() method, after getting approvedRuleSet
if (storedChecklist?.status === 'ready') {
  const approvedRuleSet = await VisaRulesService.getActiveRuleSet(countryCode, visaType);
  
  if (!approvedRuleSet) {
    return cachedChecklist;  // No ruleset, use cache
  }
  
  // Get ruleset record to check version
  const rulesetRecord = await prisma.visaRuleSet.findFirst({
    where: {
      countryCode: countryCode.toUpperCase(),
      visaType: visaType.toLowerCase(),
      isApproved: true,
    },
    orderBy: { version: 'desc' },
  });
  
  // Invalidate if ruleset version changed
  if (storedChecklist.rulesetVersion !== rulesetRecord?.version) {
    logInfo('[Checklist][Cache] Invalidating - ruleset version changed', {
      oldVersion: storedChecklist.rulesetVersion,
      newVersion: rulesetRecord?.version,
    });
    // Continue to regeneration
  } else {
    return cachedChecklist;  // Same version, use cache
  }
}
```

---

### 3. Add Validation for CountryCode Format

**File:** `apps/backend/src/services/visa-rules.service.ts`

**Add Validation:**
```typescript
static async getActiveRuleSet(
  countryCode: string,
  visaType: string
): Promise<VisaRuleSetData | null> {
  // Validate countryCode is ISO 3166-1 alpha-2 (2 uppercase letters)
  const normalizedCountryCode = countryCode.toUpperCase().trim();
  if (!/^[A-Z]{2}$/.test(normalizedCountryCode)) {
    logWarn('[VisaRules] Invalid countryCode format', {
      countryCode,
      normalizedCountryCode,
    });
    return null;
  }
  
  // Validate visaType is not empty
  const normalizedVisaType = visaType.toLowerCase().trim();
  if (!normalizedVisaType) {
    logWarn('[VisaRules] Empty visaType', { visaType });
    return null;
  }
  
  try {
    const ruleSet = await prisma.visaRuleSet.findFirst({
      where: {
        countryCode: normalizedCountryCode,
        visaType: normalizedVisaType,
        isApproved: true,
      },
      orderBy: { version: 'desc' },
    });
    // ... rest of method
  }
}
```

---

### 4. Add Shared TypeScript Types

**File:** `apps/backend/src/types/checklist.ts` (NEW)

```typescript
export interface ChecklistItem {
  id: string;
  documentType: string;
  name: string;
  nameUz: string;
  nameRu: string;
  description: string;
  descriptionUz: string;
  descriptionRu: string;
  category?: 'required' | 'highly_recommended' | 'optional';
  required: boolean;
  priority: string;
  status: 'missing' | 'pending' | 'verified' | 'rejected';
  userDocumentId?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  uploadedAt?: string;
  verificationNotes?: string;
  aiVerified?: boolean;
  aiConfidence?: number;
  whereToObtain?: string;
  whereToObtainUz?: string;
  whereToObtainRu?: string;
}

export interface DocumentChecklist {
  applicationId: string;
  countryId: string;
  visaTypeId: string;
  items: ChecklistItem[];
  totalRequired: number;
  completed: number;
  progress: number;
  generatedAt: string;
  aiGenerated: boolean;
  aiFallbackUsed?: boolean;
  aiErrorOccurred?: boolean;
}

export interface ChecklistSummary {
  total: number;
  uploaded: number;
  verified: number;
  missing: number;
  rejected: number;
}
```

**Update:** Import in both backend and frontend

---

### 5. Add Logging for Mode Selection

**File:** `apps/backend/src/services/document-checklist.service.ts`

**Already Added, but enhance:**
```typescript
// After getActiveRuleSet() call
if (approvedRuleSet) {
  logInfo('[Checklist][Mode] Using RULES mode', {
    applicationId,
    countryCode,
    visaType,
    rulesetDocumentsCount: approvedRuleSet.requiredDocuments?.length || 0,
    rulesetVersion: 'latest',  // TODO: Get actual version
  });
} else {
  logWarn('[Checklist][Mode] Falling back to LEGACY mode', {
    applicationId,
    countryCode,
    visaType,
    reason: 'no_approved_ruleset',
    // Log what was queried
    queriedCountryCode: countryCode,
    queriedVisaType: visaType,
  });
}
```

---

### 6. Add Database Migration for Cache Version Tracking

**File:** `apps/backend/prisma/migrations/XXXX_add_checklist_ruleset_version/migration.sql`

```sql
ALTER TABLE "DocumentChecklist" 
ADD COLUMN "rulesetVersion" INTEGER,
ADD COLUMN "rulesetId" TEXT;

CREATE INDEX "DocumentChecklist_rulesetId_idx" ON "DocumentChecklist"("rulesetId");
```

---

### 7. Add Admin Endpoint to Invalidate All Caches

**File:** `apps/backend/src/routes/admin.ts`

```typescript
/**
 * POST /api/admin/checklist/invalidate-all
 * Invalidate all cached checklists (use when ruleset approved)
 */
router.post('/checklist/invalidate-all', async (req, res, next) => {
  try {
    // Set all 'ready' checklists to 'pending' to force regeneration
    const result = await prisma.documentChecklist.updateMany({
      where: { status: 'ready' },
      data: { status: 'pending' },
    });
    
    return res.json({
      success: true,
      message: `Invalidated ${result.count} cached checklists`,
    });
  } catch (error) {
    next(error);
  }
});
```

---

### 8. Add Monitoring/Alerting

**File:** `apps/backend/src/services/document-checklist.service.ts`

**Add Metrics:**
```typescript
// Track mode usage
if (mode === 'RULES') {
  // Increment metric: checklist.rules_mode.count
  logInfo('[Checklist][Metrics] RULES mode used', {
    countryCode,
    visaType,
  });
} else {
  // Increment metric: checklist.legacy_mode.count
  logWarn('[Checklist][Metrics] LEGACY mode used', {
    countryCode,
    visaType,
    reason: 'no_approved_ruleset',
  });
}
```

---

## Summary

### Current State
- ✅ VisaType normalization fixed (strips "visa" suffix)
- ✅ Cache invalidation when approved ruleset exists
- ✅ Logging for mode selection
- ⚠️ Edge cases in visaType normalization (F-1, etc.)
- ⚠️ No cache version tracking
- ⚠️ No shared TypeScript types

### Recommended Priority
1. **High:** Add cache version tracking (prevents stale checklists)
2. **High:** Enhance visaType normalization (handles F-1, visitor, etc.)
3. **Medium:** Add shared TypeScript types (prevents schema drift)
4. **Medium:** Add validation for countryCode format
5. **Low:** Add admin endpoint to invalidate all caches
6. **Low:** Add monitoring/alerting

---

**Document End**


**Last Updated:** 2025-01-03  
**Status:** Production System Analysis

---

## Table of Contents

1. [Data Models](#data-models)
2. [Backend Flow](#backend-flow)
3. [Frontend Flow](#frontend-flow)
4. [Risk List](#risk-list)
5. [Concrete Recommended Code Changes](#concrete-recommended-code-changes)

---

## Data Models

### Core Models

#### 1. Application / VisaApplication

**Files:**
- `apps/backend/prisma/schema.prisma` (lines 112-137, 493-515)
- Two models exist: `VisaApplication` (legacy) and `Application` (new unified)

**Fields:**
```prisma
model VisaApplication {
  id                 String    @id
  userId             String
  countryId          String
  visaTypeId         String
  status             String    @default("draft")
  progressPercentage Int       @default(0)
  // Relations
  country            Country
  visaType           VisaType
  documents          UserDocument[]
  checkResults       DocumentCheckResult[]
}

model Application {
  id                String    @id
  userId            String
  countryId         String
  visaTypeId        String
  status            String    @default("draft")
  // Relations
  country           Country
  visaType          VisaType
  documentChecklist DocumentChecklist?  // One-to-one relation
}
```

**Key Points:**
- `VisaApplication` is legacy but still used
- `Application` is newer with direct `DocumentChecklist` relation
- Both link to `Country` and `VisaType` via foreign keys

---

#### 2. Country

**File:** `apps/backend/prisma/schema.prisma` (lines 73-89)

**Fields:**
```prisma
model Country {
  id          String   @id
  name        String   @unique
  code        String   @unique  // ISO 3166-1 alpha-2 (e.g., "AU", "US")
  flagEmoji   String
  description String?
  // Relations
  visaTypes   VisaType[]
  applications VisaApplication[]
}
```

**Critical Field:** `code` - Must match `VisaRuleSet.countryCode` (uppercase)

---

#### 3. VisaType

**File:** `apps/backend/prisma/schema.prisma` (lines 91-110)

**Fields:**
```prisma
model VisaType {
  id             String   @id
  countryId      String
  name           String   // e.g., "Tourist Visa", "Student Visa", "F-1 Student Visa"
  description    String?
  processingDays Int
  validity       String
  fee            Float
  requirements   String   // JSON
  documentTypes  String   // JSON array
  // Relations
  country        Country
  applications   VisaApplication[]
}
```

**Critical Field:** `name` - Must be normalized before matching `VisaRuleSet.visaType`
- Stored as: "Tourist Visa", "Student Visa"
- Normalized to: "tourist", "student" (strip "visa" suffix, lowercase)

---

#### 4. EmbassySource

**File:** `apps/backend/prisma/schema.prisma` (lines 569-593)

**Fields:**
```prisma
model EmbassySource {
  id            String    @id
  countryCode   String    // ISO 3166-1 alpha-2
  visaType      String    // "student" | "tourist" | "work"
  url           String    // Official embassy/consulate page URL
  name          String?
  description   String?
  isActive      Boolean   @default(true)
  lastFetchedAt DateTime?
  lastStatus    String?   // "success" | "failed" | "pending"
  // Relations
  ruleSets      VisaRuleSet[]
}
```

**Purpose:** Tracks official embassy sources that generate `VisaRuleSet` entries

---

#### 5. VisaRuleSet

**File:** `apps/backend/prisma/schema.prisma` (lines 595-620)

**Fields:**
```prisma
model VisaRuleSet {
  id                String   @id
  countryCode       String   // ISO 3166-1 alpha-2 (e.g., "AU")
  visaType          String   // "student" | "tourist" | "work" (lowercase, no "visa" suffix)
  data              Json     // VisaRuleSetData structure
  version           Int      @default(1)
  isApproved        Boolean  @default(false)  // CRITICAL: Only approved rulesets are used
  approvedAt        DateTime?
  approvedBy        String?
  rejectionReason   String?
  sourceId          String?  // Links to EmbassySource
  extractionMetadata Json?
  // Relations
  source            EmbassySource?
  versions          VisaRuleVersion[]
}
```

**Critical Fields:**
- `countryCode`: Must be uppercase (e.g., "AU")
- `visaType`: Must be lowercase, no "visa" suffix (e.g., "tourist", "student")
- `isApproved`: Only `true` rulesets are used in production
- `data`: JSON structure containing `requiredDocuments[]`, `financialRequirements`, etc.

**Data Structure (VisaRuleSetData):**
```typescript
interface VisaRuleSetData {
  requiredDocuments: Array<{
    documentType: string;  // e.g., "passport", "bank_statement"
    category: 'required' | 'highly_recommended' | 'optional';
    description?: string;
    validityRequirements?: string;
    formatRequirements?: string;
  }>;
  financialRequirements?: {
    minimumBalance?: number;
    currency?: string;
    bankStatementMonths?: number;
    sponsorRequirements?: {...};
  };
  processingInfo?: {...};
  fees?: {...};
  additionalRequirements?: {...};
  sourceInfo?: {
    extractedFrom?: string;  // URL
    extractedAt?: string;
    confidence?: number;
  };
}
```

---

#### 6. DocumentChecklist

**File:** `apps/backend/prisma/schema.prisma` (lines 517-532)

**Fields:**
```prisma
model DocumentChecklist {
  id            String    @id
  applicationId String    @unique
  status        String    @default("processing")  // "processing" | "ready" | "failed"
  checklistData String?   // JSON string with checklist items
  aiGenerated   Boolean   @default(false)
  generatedAt  DateTime?
  errorMessage  String?
  // Relations
  application   Application @relation(...)
}
```

**Status Values:**
- `processing`: Checklist generation in progress (async)
- `ready`: Checklist available and can be returned
- `failed`: Generation failed (should trigger fallback)

**checklistData JSON Structure:**
```json
{
  "items": [
    {
      "id": "checklist-item-0",
      "documentType": "passport",
      "name": "Passport",
      "nameUz": "Pasport",
      "nameRu": "Паспорт",
      "description": "...",
      "category": "required",
      "required": true,
      "priority": "high",
      "status": "missing" | "pending" | "verified" | "rejected",
      "userDocumentId": "...",
      "fileUrl": "...",
      // ... other fields
    }
  ],
  "aiGenerated": true,
  "aiFallbackUsed": false,
  "aiErrorOccurred": false
}
```

---

## Backend Flow

### Service Architecture

#### 1. DocumentChecklistService

**File:** `apps/backend/src/services/document-checklist.service.ts`

**Main Methods:**

1. **`generateChecklist(applicationId, userId)`** (line 77)
   - Entry point for checklist generation/retrieval
   - Returns: `DocumentChecklist | { status: 'processing' | 'failed' }`

2. **`generateChecklistAsync(applicationId, userId, application)`** (line 285)
   - Async background generation
   - Handles RULES vs LEGACY mode selection
   - Stores result in `DocumentChecklist` table

3. **`generateChecklistFromRules(...)`** (line 905)
   - RULES mode: Uses approved `VisaRuleSet` + GPT-4 enrichment
   - Builds personalized checklist from rules

4. **`generateRobustFallbackChecklist(...)`** (line 1490)
   - LEGACY mode: Hard-coded fallback checklist
   - Used when no ruleset exists or AI fails

5. **`normalizeVisaType(visaTypeName)`** (line 69)
   - Helper: Strips "visa" suffix and lowercases
   - "Tourist Visa" → "tourist"

**Key Flow Logic:**

```typescript
// Step 1: Check cache
if (storedChecklist?.status === 'ready') {
  // Check if approved ruleset exists (invalidate cache if yes)
  const approvedRuleSet = await VisaRulesService.getActiveRuleSet(countryCode, visaType);
  if (!approvedRuleSet) {
    return cachedChecklist;  // Use cache
  }
  // Invalidate and regenerate
}

// Step 2: Extract countryCode and visaType
const countryCode = application.country.code.toUpperCase();  // "AU"
const visaType = normalizeVisaType(application.visaType.name);  // "tourist"

// Step 3: Query VisaRuleSet
const approvedRuleSet = await VisaRulesService.getActiveRuleSet(countryCode, visaType);

// Step 4: Determine mode
const mode = approvedRuleSet ? 'RULES' : 'LEGACY';

// Step 5: Generate checklist
if (mode === 'RULES') {
  aiChecklist = await generateChecklistFromRules(approvedRuleSet, ...);
} else {
  // Try VisaChecklistEngineService first, fallback to AIOpenAIService
  aiChecklist = await VisaChecklistEngineService.generateChecklist(...);
  // or
  aiChecklist = await AIOpenAIService.generateChecklist(...);
}

// Step 6: Store in DocumentChecklist table
await prisma.documentChecklist.update({
  where: { applicationId },
  data: {
    status: 'ready',
    checklistData: JSON.stringify({ items: sanitizedItems, ... }),
    aiGenerated: true,
  }
});
```

---

#### 2. VisaRulesService

**File:** `apps/backend/src/services/visa-rules.service.ts`

**Main Methods:**

1. **`getActiveRuleSet(countryCode, visaType)`** (line 84)
   - Queries for approved ruleset
   - Returns: `VisaRuleSetData | null`
   - Query:
     ```typescript
     prisma.visaRuleSet.findFirst({
       where: {
         countryCode: countryCode.toUpperCase(),
         visaType: visaType.toLowerCase(),
         isApproved: true,
       },
       orderBy: { version: 'desc' }
     })
     ```

2. **`getLatestRuleSet(...)`** (line 123)
   - Gets latest ruleset (approved or pending)

3. **`approveRuleSet(ruleSetId, approvedBy)`** (line 239)
   - Admin action to approve ruleset
   - Unapproves all other versions for same country/visaType

---

#### 3. VisaChecklistEngineService

**File:** `apps/backend/src/services/visa-checklist-engine.service.ts`

**Main Methods:**

1. **`generateChecklist(countryCode, visaType, aiUserContext, previousChecklist?)`** (line 47)
   - Uses `VisaRuleSet` + `AIUserContext` to generate personalized checklist
   - Calls GPT-4 with structured output
   - Returns: `ChecklistResponse` with validated checklist items

**Flow:**
```typescript
// 1. Get approved ruleset
const ruleSet = await VisaRulesService.getActiveRuleSet(countryCode, visaType);
if (!ruleSet) return { checklist: [] };

// 2. Build prompts
const systemPrompt = buildSystemPrompt(countryCode, visaType, ruleSet);
const userPrompt = buildUserPrompt(aiUserContext, ruleSet, previousChecklist);

// 3. Call GPT-4
const response = await openaiClient.chat.completions.create({
  model: checklistModel,
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ],
  response_format: { type: 'json_object' }
});

// 4. Validate and return
const parsed = ChecklistResponseSchema.parse(JSON.parse(response.choices[0].message.content));
return parsed;
```

---

#### 4. AIOpenAIService

**File:** `apps/backend/src/services/ai-openai.service.ts`

**Main Methods:**

1. **`generateChecklist(userContext, countryName, visaTypeName)`** (line 1008)
   - LEGACY mode: GPT-4 decides all documents
   - Uses hybrid mode if ruleset exists (but not approved)
   - Returns: Legacy checklist format

**Modes:**
- **LEGACY**: GPT-4 decides everything (old behavior)
- **HYBRID**: Uses ruleset for base checklist, GPT-4 enriches (if ruleset exists but not approved)

---

### Route Handlers

#### Document Checklist Routes

**File:** `apps/backend/src/routes/document-checklist.ts`

**Endpoints:**

1. **`GET /api/document-checklist/:applicationId`** (line 26)
   - Handler: `DocumentChecklistService.generateChecklist()`
   - Returns: Checklist or `{ status: 'processing' }`
   - Response format:
     ```json
     {
       "success": true,
       "data": {
         "applicationId": "...",
         "items": [...],
         "summary": {
           "total": 10,
           "uploaded": 3,
           "verified": 2,
           "missing": 7,
           "rejected": 1
         },
         "progress": 20,
         "aiFallbackUsed": false
       }
     }
     ```

2. **`PUT /api/document-checklist/:applicationId/items/:itemId`** (line 117)
   - Updates checklist item status
   - Regenerates checklist after update

3. **`POST /api/document-checklist/:applicationId/regenerate`** (line 107 in route file, if exists)
   - Force regenerate checklist
   - Invalidates cache

---

### Data Flow: UI Selection → API Response

```
1. USER SELECTS COUNTRY & VISA TYPE
   └─> Frontend: User selects "Australia" + "Tourist Visa"
   └─> Frontend: Calls POST /api/applications
       └─> Creates Application record
           └─> countryId: "country-au-id"
           └─> visaTypeId: "visatype-tourist-id"
           └─> country.code: "AU"
           └─> visaType.name: "Tourist Visa"

2. FRONTEND REQUESTS CHECKLIST
   └─> Frontend: Calls GET /api/document-checklist/:applicationId
   └─> Route: document-checklist.ts → DocumentChecklistService.generateChecklist()

3. BACKEND: CHECK CACHE
   └─> Query: prisma.documentChecklist.findUnique({ where: { applicationId } })
   └─> If status === 'ready' AND no approved ruleset:
       └─> Return cached checklist
   └─> If status === 'ready' AND approved ruleset exists:
       └─> Invalidate cache, continue to generation

4. BACKEND: EXTRACT COUNTRY/VISA INFO
   └─> Load application with relations:
       └─> application.country.code → "AU"
       └─> application.visaType.name → "Tourist Visa"
   └─> Normalize:
       └─> countryCode = "AU".toUpperCase() → "AU"
       └─> visaType = normalizeVisaType("Tourist Visa") → "tourist"

5. BACKEND: QUERY VISARULESET
   └─> VisaRulesService.getActiveRuleSet("AU", "tourist")
   └─> Query:
       SELECT * FROM VisaRuleSet
       WHERE countryCode = 'AU'
         AND visaType = 'tourist'
         AND isApproved = true
       ORDER BY version DESC
       LIMIT 1
   └─> Result: VisaRuleSetData | null

6. BACKEND: DETERMINE MODE
   └─> If approvedRuleSet exists:
       └─> mode = 'RULES'
       └─> Call: generateChecklistFromRules(approvedRuleSet, ...)
   └─> Else:
       └─> mode = 'LEGACY'
       └─> Try: VisaChecklistEngineService.generateChecklist(...)
       └─> Fallback: AIOpenAIService.generateChecklist(...)

7. BACKEND: GENERATE CHECKLIST (RULES MODE)
   └─> generateChecklistFromRules():
       └─> Build ApplicantProfile from questionnaire
       └─> Extract embassy URLs from ruleset
       └─> Build system prompt with ruleset.data.requiredDocuments
       └─> Build user prompt with ApplicantProfile
       └─> Call GPT-4 with rules-based prompt
       └─> Parse and validate response
       └─> Map to legacy format

8. BACKEND: GENERATE CHECKLIST (LEGACY MODE)
   └─> AIOpenAIService.generateChecklist():
       └─> Build AIUserContext from questionnaire
       └─> Call GPT-4 with generic prompt
       └─> Parse response
       └─> Fallback to hard-coded 4-item checklist if AI fails

9. BACKEND: STORE CHECKLIST
   └─> prisma.documentChecklist.upsert({
         where: { applicationId },
         create: { status: 'ready', checklistData: JSON.stringify(...) },
         update: { status: 'ready', checklistData: JSON.stringify(...) }
       })

10. BACKEND: RETURN RESPONSE
    └─> Format: { success: true, data: { items: [...], summary: {...} } }
    └─> Or: { success: true, data: { status: 'processing', items: [] } }

11. FRONTEND: RENDER CHECKLIST
    └─> Parse response.data.items
    └─> Display checklist items with status indicators
    └─> Show progress bar
    └─> Handle 'processing' status with retry logic
```

---

## Frontend Flow

### API Client

**Files:**
- `apps/web/lib/api/client.ts` (line 294)
- `frontend_new/src/services/api.ts` (line 1163)

**Method:**
```typescript
async getDocumentChecklist(applicationId: string): Promise<ApiResponse> {
  const response = await this.api.get(`/document-checklist/${applicationId}`);
  return response.data;
}
```

---

### React Hooks

**File:** `apps/web/lib/hooks/useApplication.ts` (line 64)

**Flow:**
```typescript
useEffect(() => {
  const [appRes, checklistRes] = await Promise.all([
    apiClient.getApplication(applicationId),
    apiClient.getDocumentChecklist(applicationId),
  ]);
  
  if (checklistRes.success && checklistRes.data) {
    // Parse checklistData if string
    const checklistData = checklistRes.data;
    if (checklistData.checklistData && typeof checklistData.checklistData === 'string') {
      const parsed = JSON.parse(checklistData.checklistData);
      setChecklist({
        ...checklistData,
        items: parsed.checklist || parsed.items || [],
      });
    } else {
      setChecklist(checklistData);
    }
  }
}, [applicationId]);
```

---

### React Native Screen

**File:** `frontend_new/src/screens/visa/ApplicationDetailScreen.tsx` (line 65)

**Flow:**
```typescript
const loadApplicationData = useCallback(async (force = false) => {
  const [appResponse, checklistResponse] = await Promise.all([
    apiClient.getApplication(applicationId),
    apiClient.getDocumentChecklist(applicationId),
  ]);
  
  if (checklistResponse.success && checklistResponse.data) {
    if (checklistResponse.data.status === 'processing') {
      setIsProcessing(true);
      setChecklistItems([]);
      // Retry after 3 seconds
      setTimeout(() => {
        loadApplicationData(true);
      }, 3000);
    } else if (checklistResponse.data.items && Array.isArray(checklistResponse.data.items)) {
      setChecklistItems(checklistResponse.data.items);
      // Calculate summary
      const summary = calculateSummary(checklistResponse.data.items);
      setSummary(summary);
    }
  }
}, [applicationId]);
```

---

## Risk List

### 1. Fallback to LEGACY Mode

**Risks:**

1. **VisaType Name Mismatch** ✅ FIXED
   - **Issue:** `VisaType.name` = "Tourist Visa" but query uses "tourist visa"
   - **Fix Applied:** `normalizeVisaType()` strips "visa" suffix
   - **Remaining Risk:** Edge cases like "F-1 Student Visa" → "f-1 student" (may not match ruleset)

2. **CountryCode Case Mismatch**
   - **Risk:** `Country.code` stored as "au" instead of "AU"
   - **Mitigation:** Code uses `.toUpperCase()`, but DB data must be correct

3. **Ruleset Not Approved**
   - **Risk:** Ruleset exists but `isApproved = false`
   - **Mitigation:** Admin must approve ruleset before use

4. **Ruleset Query Returns Null**
   - **Risk:** No ruleset exists for country/visaType combination
   - **Mitigation:** Falls back to LEGACY mode (expected behavior)

5. **Database Connection Issues**
   - **Risk:** Prisma query fails, throws error
   - **Mitigation:** Try-catch in `getActiveRuleSet()` logs error, returns null

---

### 2. Mismatch Between Visa Types

**Risks:**

1. **VisaType.name Variations**
   - **Examples:**
     - "Tourist Visa" vs "Tourist" vs "Visitor Visa"
     - "Student Visa" vs "F-1 Student Visa" vs "Study Visa"
   - **Impact:** Normalization may not match ruleset.visaType
   - **Mitigation:** `normalizeVisaType()` handles common cases, but complex names may fail

2. **Ruleset.visaType Format**
   - **Risk:** Ruleset stored as "tourist_visa" or "student-visa" instead of "tourist"
   - **Impact:** Query will not match
   - **Mitigation:** Ensure ruleset creation normalizes visaType

3. **Multiple VisaTypes for Same Country**
   - **Risk:** "Tourist Visa" and "Visitor Visa" both exist, but ruleset only for "tourist"
   - **Impact:** One visaType uses ruleset, other falls back to LEGACY

---

### 3. Mismatch Between Country Codes

**Risks:**

1. **Country.code Format**
   - **Risk:** Stored as "AUS" instead of "AU" (ISO 3166-1 alpha-3 vs alpha-2)
   - **Impact:** Query will not match ruleset.countryCode
   - **Mitigation:** Ensure seed data uses ISO 3166-1 alpha-2

2. **Case Sensitivity**
   - **Risk:** Database stores "au" instead of "AU"
   - **Mitigation:** Code uses `.toUpperCase()`, but DB must be correct

3. **Country Name vs Code**
   - **Risk:** Using country name instead of code in queries
   - **Mitigation:** Code correctly uses `country.code`

---

### 4. Outdated Cached Checklists

**Risks:**

1. **Cache Not Invalidated on Ruleset Approval** ✅ PARTIALLY FIXED
   - **Issue:** Checklist cached before ruleset approval, never regenerates
   - **Fix Applied:** Code checks for approved ruleset before returning cache
   - **Remaining Risk:** If ruleset approved AFTER cache created, cache is invalidated on next request (good)

2. **Cache Not Invalidated on Ruleset Update**
   - **Risk:** New ruleset version approved, but cache still uses old version
   - **Mitigation:** Current fix invalidates cache when approved ruleset exists (any version)

3. **Cache TTL Not Implemented**
   - **Risk:** Checklist cached indefinitely, never refreshes
   - **Mitigation:** Manual regeneration endpoint exists

4. **Race Condition: Cache Created During Ruleset Approval**
   - **Risk:** Checklist generated in LEGACY mode, then ruleset approved immediately after
   - **Impact:** Cache contains LEGACY checklist, not ruleset-based
   - **Mitigation:** Next request will invalidate and regenerate

---

### 5. Frontend and Backend Schema Mismatch

**Risks:**

1. **checklistData Format**
   - **Backend:** Stores as JSON string in `DocumentChecklist.checklistData`
   - **Frontend:** Expects `items` array directly
   - **Mitigation:** Route handler parses and formats response

2. **Response Structure**
   - **Backend Returns:**
     ```json
     {
       "success": true,
       "data": {
         "items": [...],
         "summary": {...},
         "progress": 20
       }
     }
     ```
   - **Frontend Expects:** `response.data.items` array
   - **Status:** ✅ Compatible

3. **Processing Status**
   - **Backend Returns:** `{ status: 'processing', items: [] }`
   - **Frontend Handles:** Shows loading state, retries after 3 seconds
   - **Status:** ✅ Compatible

4. **TypeScript Interface Mismatch**
   - **Backend:** `DocumentChecklist` interface (line 50)
   - **Frontend:** `DocumentChecklist` interface in `useApplication.ts` (line 28)
   - **Risk:** Fields may differ
   - **Mitigation:** Both use similar structure, but should be shared type

---

## Concrete Recommended Code Changes

### 1. Fix VisaType Normalization Edge Cases

**File:** `apps/backend/src/services/document-checklist.service.ts`

**Current Code (line 69):**
```typescript
private static normalizeVisaType(visaTypeName: string): string {
  return visaTypeName.toLowerCase().trim().replace(/\s+visa\s*$/i, '').trim();
}
```

**Issue:** "F-1 Student Visa" → "f-1 student" (may not match ruleset)

**Recommended Fix:**
```typescript
private static normalizeVisaType(visaTypeName: string): string {
  let normalized = visaTypeName.toLowerCase().trim();
  
  // Remove "visa" suffix
  normalized = normalized.replace(/\s+visa\s*$/i, '').trim();
  
  // Handle common variations
  const variations: Record<string, string> = {
    'f-1 student': 'student',
    'f1 student': 'student',
    'm-1 student': 'student',
    'j-1 student': 'student',
    'visitor': 'tourist',
    'visitor visa': 'tourist',
    'business': 'tourist',  // May need country-specific handling
    'work': 'work',
    'skilled worker': 'work',
  };
  
  // Check for exact match first
  if (variations[normalized]) {
    return variations[normalized];
  }
  
  // Check for partial match (e.g., "student visa" contains "student")
  for (const [key, value] of Object.entries(variations)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }
  
  return normalized;
}
```

---

### 2. Add Cache Version Tracking

**File:** `apps/backend/prisma/schema.prisma`

**Add Field:**
```prisma
model DocumentChecklist {
  // ... existing fields ...
  rulesetVersion Int?  // Version of VisaRuleSet used to generate this checklist
  rulesetId      String?  // ID of VisaRuleSet used
}
```

**File:** `apps/backend/src/services/document-checklist.service.ts`

**Update Cache Check:**
```typescript
// In generateChecklist() method, after getting approvedRuleSet
if (storedChecklist?.status === 'ready') {
  const approvedRuleSet = await VisaRulesService.getActiveRuleSet(countryCode, visaType);
  
  if (!approvedRuleSet) {
    return cachedChecklist;  // No ruleset, use cache
  }
  
  // Get ruleset record to check version
  const rulesetRecord = await prisma.visaRuleSet.findFirst({
    where: {
      countryCode: countryCode.toUpperCase(),
      visaType: visaType.toLowerCase(),
      isApproved: true,
    },
    orderBy: { version: 'desc' },
  });
  
  // Invalidate if ruleset version changed
  if (storedChecklist.rulesetVersion !== rulesetRecord?.version) {
    logInfo('[Checklist][Cache] Invalidating - ruleset version changed', {
      oldVersion: storedChecklist.rulesetVersion,
      newVersion: rulesetRecord?.version,
    });
    // Continue to regeneration
  } else {
    return cachedChecklist;  // Same version, use cache
  }
}
```

---

### 3. Add Validation for CountryCode Format

**File:** `apps/backend/src/services/visa-rules.service.ts`

**Add Validation:**
```typescript
static async getActiveRuleSet(
  countryCode: string,
  visaType: string
): Promise<VisaRuleSetData | null> {
  // Validate countryCode is ISO 3166-1 alpha-2 (2 uppercase letters)
  const normalizedCountryCode = countryCode.toUpperCase().trim();
  if (!/^[A-Z]{2}$/.test(normalizedCountryCode)) {
    logWarn('[VisaRules] Invalid countryCode format', {
      countryCode,
      normalizedCountryCode,
    });
    return null;
  }
  
  // Validate visaType is not empty
  const normalizedVisaType = visaType.toLowerCase().trim();
  if (!normalizedVisaType) {
    logWarn('[VisaRules] Empty visaType', { visaType });
    return null;
  }
  
  try {
    const ruleSet = await prisma.visaRuleSet.findFirst({
      where: {
        countryCode: normalizedCountryCode,
        visaType: normalizedVisaType,
        isApproved: true,
      },
      orderBy: { version: 'desc' },
    });
    // ... rest of method
  }
}
```

---

### 4. Add Shared TypeScript Types

**File:** `apps/backend/src/types/checklist.ts` (NEW)

```typescript
export interface ChecklistItem {
  id: string;
  documentType: string;
  name: string;
  nameUz: string;
  nameRu: string;
  description: string;
  descriptionUz: string;
  descriptionRu: string;
  category?: 'required' | 'highly_recommended' | 'optional';
  required: boolean;
  priority: string;
  status: 'missing' | 'pending' | 'verified' | 'rejected';
  userDocumentId?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  uploadedAt?: string;
  verificationNotes?: string;
  aiVerified?: boolean;
  aiConfidence?: number;
  whereToObtain?: string;
  whereToObtainUz?: string;
  whereToObtainRu?: string;
}

export interface DocumentChecklist {
  applicationId: string;
  countryId: string;
  visaTypeId: string;
  items: ChecklistItem[];
  totalRequired: number;
  completed: number;
  progress: number;
  generatedAt: string;
  aiGenerated: boolean;
  aiFallbackUsed?: boolean;
  aiErrorOccurred?: boolean;
}

export interface ChecklistSummary {
  total: number;
  uploaded: number;
  verified: number;
  missing: number;
  rejected: number;
}
```

**Update:** Import in both backend and frontend

---

### 5. Add Logging for Mode Selection

**File:** `apps/backend/src/services/document-checklist.service.ts`

**Already Added, but enhance:**
```typescript
// After getActiveRuleSet() call
if (approvedRuleSet) {
  logInfo('[Checklist][Mode] Using RULES mode', {
    applicationId,
    countryCode,
    visaType,
    rulesetDocumentsCount: approvedRuleSet.requiredDocuments?.length || 0,
    rulesetVersion: 'latest',  // TODO: Get actual version
  });
} else {
  logWarn('[Checklist][Mode] Falling back to LEGACY mode', {
    applicationId,
    countryCode,
    visaType,
    reason: 'no_approved_ruleset',
    // Log what was queried
    queriedCountryCode: countryCode,
    queriedVisaType: visaType,
  });
}
```

---

### 6. Add Database Migration for Cache Version Tracking

**File:** `apps/backend/prisma/migrations/XXXX_add_checklist_ruleset_version/migration.sql`

```sql
ALTER TABLE "DocumentChecklist" 
ADD COLUMN "rulesetVersion" INTEGER,
ADD COLUMN "rulesetId" TEXT;

CREATE INDEX "DocumentChecklist_rulesetId_idx" ON "DocumentChecklist"("rulesetId");
```

---

### 7. Add Admin Endpoint to Invalidate All Caches

**File:** `apps/backend/src/routes/admin.ts`

```typescript
/**
 * POST /api/admin/checklist/invalidate-all
 * Invalidate all cached checklists (use when ruleset approved)
 */
router.post('/checklist/invalidate-all', async (req, res, next) => {
  try {
    // Set all 'ready' checklists to 'pending' to force regeneration
    const result = await prisma.documentChecklist.updateMany({
      where: { status: 'ready' },
      data: { status: 'pending' },
    });
    
    return res.json({
      success: true,
      message: `Invalidated ${result.count} cached checklists`,
    });
  } catch (error) {
    next(error);
  }
});
```

---

### 8. Add Monitoring/Alerting

**File:** `apps/backend/src/services/document-checklist.service.ts`

**Add Metrics:**
```typescript
// Track mode usage
if (mode === 'RULES') {
  // Increment metric: checklist.rules_mode.count
  logInfo('[Checklist][Metrics] RULES mode used', {
    countryCode,
    visaType,
  });
} else {
  // Increment metric: checklist.legacy_mode.count
  logWarn('[Checklist][Metrics] LEGACY mode used', {
    countryCode,
    visaType,
    reason: 'no_approved_ruleset',
  });
}
```

---

## Summary

### Current State
- ✅ VisaType normalization fixed (strips "visa" suffix)
- ✅ Cache invalidation when approved ruleset exists
- ✅ Logging for mode selection
- ⚠️ Edge cases in visaType normalization (F-1, etc.)
- ⚠️ No cache version tracking
- ⚠️ No shared TypeScript types

### Recommended Priority
1. **High:** Add cache version tracking (prevents stale checklists)
2. **High:** Enhance visaType normalization (handles F-1, visitor, etc.)
3. **Medium:** Add shared TypeScript types (prevents schema drift)
4. **Medium:** Add validation for countryCode format
5. **Low:** Add admin endpoint to invalidate all caches
6. **Low:** Add monitoring/alerting

---

**Document End**


**Last Updated:** 2025-01-03  
**Status:** Production System Analysis

---

## Table of Contents

1. [Data Models](#data-models)
2. [Backend Flow](#backend-flow)
3. [Frontend Flow](#frontend-flow)
4. [Risk List](#risk-list)
5. [Concrete Recommended Code Changes](#concrete-recommended-code-changes)

---

## Data Models

### Core Models

#### 1. Application / VisaApplication

**Files:**
- `apps/backend/prisma/schema.prisma` (lines 112-137, 493-515)
- Two models exist: `VisaApplication` (legacy) and `Application` (new unified)

**Fields:**
```prisma
model VisaApplication {
  id                 String    @id
  userId             String
  countryId          String
  visaTypeId         String
  status             String    @default("draft")
  progressPercentage Int       @default(0)
  // Relations
  country            Country
  visaType           VisaType
  documents          UserDocument[]
  checkResults       DocumentCheckResult[]
}

model Application {
  id                String    @id
  userId            String
  countryId         String
  visaTypeId        String
  status            String    @default("draft")
  // Relations
  country           Country
  visaType          VisaType
  documentChecklist DocumentChecklist?  // One-to-one relation
}
```

**Key Points:**
- `VisaApplication` is legacy but still used
- `Application` is newer with direct `DocumentChecklist` relation
- Both link to `Country` and `VisaType` via foreign keys

---

#### 2. Country

**File:** `apps/backend/prisma/schema.prisma` (lines 73-89)

**Fields:**
```prisma
model Country {
  id          String   @id
  name        String   @unique
  code        String   @unique  // ISO 3166-1 alpha-2 (e.g., "AU", "US")
  flagEmoji   String
  description String?
  // Relations
  visaTypes   VisaType[]
  applications VisaApplication[]
}
```

**Critical Field:** `code` - Must match `VisaRuleSet.countryCode` (uppercase)

---

#### 3. VisaType

**File:** `apps/backend/prisma/schema.prisma` (lines 91-110)

**Fields:**
```prisma
model VisaType {
  id             String   @id
  countryId      String
  name           String   // e.g., "Tourist Visa", "Student Visa", "F-1 Student Visa"
  description    String?
  processingDays Int
  validity       String
  fee            Float
  requirements   String   // JSON
  documentTypes  String   // JSON array
  // Relations
  country        Country
  applications   VisaApplication[]
}
```

**Critical Field:** `name` - Must be normalized before matching `VisaRuleSet.visaType`
- Stored as: "Tourist Visa", "Student Visa"
- Normalized to: "tourist", "student" (strip "visa" suffix, lowercase)

---

#### 4. EmbassySource

**File:** `apps/backend/prisma/schema.prisma` (lines 569-593)

**Fields:**
```prisma
model EmbassySource {
  id            String    @id
  countryCode   String    // ISO 3166-1 alpha-2
  visaType      String    // "student" | "tourist" | "work"
  url           String    // Official embassy/consulate page URL
  name          String?
  description   String?
  isActive      Boolean   @default(true)
  lastFetchedAt DateTime?
  lastStatus    String?   // "success" | "failed" | "pending"
  // Relations
  ruleSets      VisaRuleSet[]
}
```

**Purpose:** Tracks official embassy sources that generate `VisaRuleSet` entries

---

#### 5. VisaRuleSet

**File:** `apps/backend/prisma/schema.prisma` (lines 595-620)

**Fields:**
```prisma
model VisaRuleSet {
  id                String   @id
  countryCode       String   // ISO 3166-1 alpha-2 (e.g., "AU")
  visaType          String   // "student" | "tourist" | "work" (lowercase, no "visa" suffix)
  data              Json     // VisaRuleSetData structure
  version           Int      @default(1)
  isApproved        Boolean  @default(false)  // CRITICAL: Only approved rulesets are used
  approvedAt        DateTime?
  approvedBy        String?
  rejectionReason   String?
  sourceId          String?  // Links to EmbassySource
  extractionMetadata Json?
  // Relations
  source            EmbassySource?
  versions          VisaRuleVersion[]
}
```

**Critical Fields:**
- `countryCode`: Must be uppercase (e.g., "AU")
- `visaType`: Must be lowercase, no "visa" suffix (e.g., "tourist", "student")
- `isApproved`: Only `true` rulesets are used in production
- `data`: JSON structure containing `requiredDocuments[]`, `financialRequirements`, etc.

**Data Structure (VisaRuleSetData):**
```typescript
interface VisaRuleSetData {
  requiredDocuments: Array<{
    documentType: string;  // e.g., "passport", "bank_statement"
    category: 'required' | 'highly_recommended' | 'optional';
    description?: string;
    validityRequirements?: string;
    formatRequirements?: string;
  }>;
  financialRequirements?: {
    minimumBalance?: number;
    currency?: string;
    bankStatementMonths?: number;
    sponsorRequirements?: {...};
  };
  processingInfo?: {...};
  fees?: {...};
  additionalRequirements?: {...};
  sourceInfo?: {
    extractedFrom?: string;  // URL
    extractedAt?: string;
    confidence?: number;
  };
}
```

---

#### 6. DocumentChecklist

**File:** `apps/backend/prisma/schema.prisma` (lines 517-532)

**Fields:**
```prisma
model DocumentChecklist {
  id            String    @id
  applicationId String    @unique
  status        String    @default("processing")  // "processing" | "ready" | "failed"
  checklistData String?   // JSON string with checklist items
  aiGenerated   Boolean   @default(false)
  generatedAt  DateTime?
  errorMessage  String?
  // Relations
  application   Application @relation(...)
}
```

**Status Values:**
- `processing`: Checklist generation in progress (async)
- `ready`: Checklist available and can be returned
- `failed`: Generation failed (should trigger fallback)

**checklistData JSON Structure:**
```json
{
  "items": [
    {
      "id": "checklist-item-0",
      "documentType": "passport",
      "name": "Passport",
      "nameUz": "Pasport",
      "nameRu": "Паспорт",
      "description": "...",
      "category": "required",
      "required": true,
      "priority": "high",
      "status": "missing" | "pending" | "verified" | "rejected",
      "userDocumentId": "...",
      "fileUrl": "...",
      // ... other fields
    }
  ],
  "aiGenerated": true,
  "aiFallbackUsed": false,
  "aiErrorOccurred": false
}
```

---

## Backend Flow

### Service Architecture

#### 1. DocumentChecklistService

**File:** `apps/backend/src/services/document-checklist.service.ts`

**Main Methods:**

1. **`generateChecklist(applicationId, userId)`** (line 77)
   - Entry point for checklist generation/retrieval
   - Returns: `DocumentChecklist | { status: 'processing' | 'failed' }`

2. **`generateChecklistAsync(applicationId, userId, application)`** (line 285)
   - Async background generation
   - Handles RULES vs LEGACY mode selection
   - Stores result in `DocumentChecklist` table

3. **`generateChecklistFromRules(...)`** (line 905)
   - RULES mode: Uses approved `VisaRuleSet` + GPT-4 enrichment
   - Builds personalized checklist from rules

4. **`generateRobustFallbackChecklist(...)`** (line 1490)
   - LEGACY mode: Hard-coded fallback checklist
   - Used when no ruleset exists or AI fails

5. **`normalizeVisaType(visaTypeName)`** (line 69)
   - Helper: Strips "visa" suffix and lowercases
   - "Tourist Visa" → "tourist"

**Key Flow Logic:**

```typescript
// Step 1: Check cache
if (storedChecklist?.status === 'ready') {
  // Check if approved ruleset exists (invalidate cache if yes)
  const approvedRuleSet = await VisaRulesService.getActiveRuleSet(countryCode, visaType);
  if (!approvedRuleSet) {
    return cachedChecklist;  // Use cache
  }
  // Invalidate and regenerate
}

// Step 2: Extract countryCode and visaType
const countryCode = application.country.code.toUpperCase();  // "AU"
const visaType = normalizeVisaType(application.visaType.name);  // "tourist"

// Step 3: Query VisaRuleSet
const approvedRuleSet = await VisaRulesService.getActiveRuleSet(countryCode, visaType);

// Step 4: Determine mode
const mode = approvedRuleSet ? 'RULES' : 'LEGACY';

// Step 5: Generate checklist
if (mode === 'RULES') {
  aiChecklist = await generateChecklistFromRules(approvedRuleSet, ...);
} else {
  // Try VisaChecklistEngineService first, fallback to AIOpenAIService
  aiChecklist = await VisaChecklistEngineService.generateChecklist(...);
  // or
  aiChecklist = await AIOpenAIService.generateChecklist(...);
}

// Step 6: Store in DocumentChecklist table
await prisma.documentChecklist.update({
  where: { applicationId },
  data: {
    status: 'ready',
    checklistData: JSON.stringify({ items: sanitizedItems, ... }),
    aiGenerated: true,
  }
});
```

---

#### 2. VisaRulesService

**File:** `apps/backend/src/services/visa-rules.service.ts`

**Main Methods:**

1. **`getActiveRuleSet(countryCode, visaType)`** (line 84)
   - Queries for approved ruleset
   - Returns: `VisaRuleSetData | null`
   - Query:
     ```typescript
     prisma.visaRuleSet.findFirst({
       where: {
         countryCode: countryCode.toUpperCase(),
         visaType: visaType.toLowerCase(),
         isApproved: true,
       },
       orderBy: { version: 'desc' }
     })
     ```

2. **`getLatestRuleSet(...)`** (line 123)
   - Gets latest ruleset (approved or pending)

3. **`approveRuleSet(ruleSetId, approvedBy)`** (line 239)
   - Admin action to approve ruleset
   - Unapproves all other versions for same country/visaType

---

#### 3. VisaChecklistEngineService

**File:** `apps/backend/src/services/visa-checklist-engine.service.ts`

**Main Methods:**

1. **`generateChecklist(countryCode, visaType, aiUserContext, previousChecklist?)`** (line 47)
   - Uses `VisaRuleSet` + `AIUserContext` to generate personalized checklist
   - Calls GPT-4 with structured output
   - Returns: `ChecklistResponse` with validated checklist items

**Flow:**
```typescript
// 1. Get approved ruleset
const ruleSet = await VisaRulesService.getActiveRuleSet(countryCode, visaType);
if (!ruleSet) return { checklist: [] };

// 2. Build prompts
const systemPrompt = buildSystemPrompt(countryCode, visaType, ruleSet);
const userPrompt = buildUserPrompt(aiUserContext, ruleSet, previousChecklist);

// 3. Call GPT-4
const response = await openaiClient.chat.completions.create({
  model: checklistModel,
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ],
  response_format: { type: 'json_object' }
});

// 4. Validate and return
const parsed = ChecklistResponseSchema.parse(JSON.parse(response.choices[0].message.content));
return parsed;
```

---

#### 4. AIOpenAIService

**File:** `apps/backend/src/services/ai-openai.service.ts`

**Main Methods:**

1. **`generateChecklist(userContext, countryName, visaTypeName)`** (line 1008)
   - LEGACY mode: GPT-4 decides all documents
   - Uses hybrid mode if ruleset exists (but not approved)
   - Returns: Legacy checklist format

**Modes:**
- **LEGACY**: GPT-4 decides everything (old behavior)
- **HYBRID**: Uses ruleset for base checklist, GPT-4 enriches (if ruleset exists but not approved)

---

### Route Handlers

#### Document Checklist Routes

**File:** `apps/backend/src/routes/document-checklist.ts`

**Endpoints:**

1. **`GET /api/document-checklist/:applicationId`** (line 26)
   - Handler: `DocumentChecklistService.generateChecklist()`
   - Returns: Checklist or `{ status: 'processing' }`
   - Response format:
     ```json
     {
       "success": true,
       "data": {
         "applicationId": "...",
         "items": [...],
         "summary": {
           "total": 10,
           "uploaded": 3,
           "verified": 2,
           "missing": 7,
           "rejected": 1
         },
         "progress": 20,
         "aiFallbackUsed": false
       }
     }
     ```

2. **`PUT /api/document-checklist/:applicationId/items/:itemId`** (line 117)
   - Updates checklist item status
   - Regenerates checklist after update

3. **`POST /api/document-checklist/:applicationId/regenerate`** (line 107 in route file, if exists)
   - Force regenerate checklist
   - Invalidates cache

---

### Data Flow: UI Selection → API Response

```
1. USER SELECTS COUNTRY & VISA TYPE
   └─> Frontend: User selects "Australia" + "Tourist Visa"
   └─> Frontend: Calls POST /api/applications
       └─> Creates Application record
           └─> countryId: "country-au-id"
           └─> visaTypeId: "visatype-tourist-id"
           └─> country.code: "AU"
           └─> visaType.name: "Tourist Visa"

2. FRONTEND REQUESTS CHECKLIST
   └─> Frontend: Calls GET /api/document-checklist/:applicationId
   └─> Route: document-checklist.ts → DocumentChecklistService.generateChecklist()

3. BACKEND: CHECK CACHE
   └─> Query: prisma.documentChecklist.findUnique({ where: { applicationId } })
   └─> If status === 'ready' AND no approved ruleset:
       └─> Return cached checklist
   └─> If status === 'ready' AND approved ruleset exists:
       └─> Invalidate cache, continue to generation

4. BACKEND: EXTRACT COUNTRY/VISA INFO
   └─> Load application with relations:
       └─> application.country.code → "AU"
       └─> application.visaType.name → "Tourist Visa"
   └─> Normalize:
       └─> countryCode = "AU".toUpperCase() → "AU"
       └─> visaType = normalizeVisaType("Tourist Visa") → "tourist"

5. BACKEND: QUERY VISARULESET
   └─> VisaRulesService.getActiveRuleSet("AU", "tourist")
   └─> Query:
       SELECT * FROM VisaRuleSet
       WHERE countryCode = 'AU'
         AND visaType = 'tourist'
         AND isApproved = true
       ORDER BY version DESC
       LIMIT 1
   └─> Result: VisaRuleSetData | null

6. BACKEND: DETERMINE MODE
   └─> If approvedRuleSet exists:
       └─> mode = 'RULES'
       └─> Call: generateChecklistFromRules(approvedRuleSet, ...)
   └─> Else:
       └─> mode = 'LEGACY'
       └─> Try: VisaChecklistEngineService.generateChecklist(...)
       └─> Fallback: AIOpenAIService.generateChecklist(...)

7. BACKEND: GENERATE CHECKLIST (RULES MODE)
   └─> generateChecklistFromRules():
       └─> Build ApplicantProfile from questionnaire
       └─> Extract embassy URLs from ruleset
       └─> Build system prompt with ruleset.data.requiredDocuments
       └─> Build user prompt with ApplicantProfile
       └─> Call GPT-4 with rules-based prompt
       └─> Parse and validate response
       └─> Map to legacy format

8. BACKEND: GENERATE CHECKLIST (LEGACY MODE)
   └─> AIOpenAIService.generateChecklist():
       └─> Build AIUserContext from questionnaire
       └─> Call GPT-4 with generic prompt
       └─> Parse response
       └─> Fallback to hard-coded 4-item checklist if AI fails

9. BACKEND: STORE CHECKLIST
   └─> prisma.documentChecklist.upsert({
         where: { applicationId },
         create: { status: 'ready', checklistData: JSON.stringify(...) },
         update: { status: 'ready', checklistData: JSON.stringify(...) }
       })

10. BACKEND: RETURN RESPONSE
    └─> Format: { success: true, data: { items: [...], summary: {...} } }
    └─> Or: { success: true, data: { status: 'processing', items: [] } }

11. FRONTEND: RENDER CHECKLIST
    └─> Parse response.data.items
    └─> Display checklist items with status indicators
    └─> Show progress bar
    └─> Handle 'processing' status with retry logic
```

---

## Frontend Flow

### API Client

**Files:**
- `apps/web/lib/api/client.ts` (line 294)
- `frontend_new/src/services/api.ts` (line 1163)

**Method:**
```typescript
async getDocumentChecklist(applicationId: string): Promise<ApiResponse> {
  const response = await this.api.get(`/document-checklist/${applicationId}`);
  return response.data;
}
```

---

### React Hooks

**File:** `apps/web/lib/hooks/useApplication.ts` (line 64)

**Flow:**
```typescript
useEffect(() => {
  const [appRes, checklistRes] = await Promise.all([
    apiClient.getApplication(applicationId),
    apiClient.getDocumentChecklist(applicationId),
  ]);
  
  if (checklistRes.success && checklistRes.data) {
    // Parse checklistData if string
    const checklistData = checklistRes.data;
    if (checklistData.checklistData && typeof checklistData.checklistData === 'string') {
      const parsed = JSON.parse(checklistData.checklistData);
      setChecklist({
        ...checklistData,
        items: parsed.checklist || parsed.items || [],
      });
    } else {
      setChecklist(checklistData);
    }
  }
}, [applicationId]);
```

---

### React Native Screen

**File:** `frontend_new/src/screens/visa/ApplicationDetailScreen.tsx` (line 65)

**Flow:**
```typescript
const loadApplicationData = useCallback(async (force = false) => {
  const [appResponse, checklistResponse] = await Promise.all([
    apiClient.getApplication(applicationId),
    apiClient.getDocumentChecklist(applicationId),
  ]);
  
  if (checklistResponse.success && checklistResponse.data) {
    if (checklistResponse.data.status === 'processing') {
      setIsProcessing(true);
      setChecklistItems([]);
      // Retry after 3 seconds
      setTimeout(() => {
        loadApplicationData(true);
      }, 3000);
    } else if (checklistResponse.data.items && Array.isArray(checklistResponse.data.items)) {
      setChecklistItems(checklistResponse.data.items);
      // Calculate summary
      const summary = calculateSummary(checklistResponse.data.items);
      setSummary(summary);
    }
  }
}, [applicationId]);
```

---

## Risk List

### 1. Fallback to LEGACY Mode

**Risks:**

1. **VisaType Name Mismatch** ✅ FIXED
   - **Issue:** `VisaType.name` = "Tourist Visa" but query uses "tourist visa"
   - **Fix Applied:** `normalizeVisaType()` strips "visa" suffix
   - **Remaining Risk:** Edge cases like "F-1 Student Visa" → "f-1 student" (may not match ruleset)

2. **CountryCode Case Mismatch**
   - **Risk:** `Country.code` stored as "au" instead of "AU"
   - **Mitigation:** Code uses `.toUpperCase()`, but DB data must be correct

3. **Ruleset Not Approved**
   - **Risk:** Ruleset exists but `isApproved = false`
   - **Mitigation:** Admin must approve ruleset before use

4. **Ruleset Query Returns Null**
   - **Risk:** No ruleset exists for country/visaType combination
   - **Mitigation:** Falls back to LEGACY mode (expected behavior)

5. **Database Connection Issues**
   - **Risk:** Prisma query fails, throws error
   - **Mitigation:** Try-catch in `getActiveRuleSet()` logs error, returns null

---

### 2. Mismatch Between Visa Types

**Risks:**

1. **VisaType.name Variations**
   - **Examples:**
     - "Tourist Visa" vs "Tourist" vs "Visitor Visa"
     - "Student Visa" vs "F-1 Student Visa" vs "Study Visa"
   - **Impact:** Normalization may not match ruleset.visaType
   - **Mitigation:** `normalizeVisaType()` handles common cases, but complex names may fail

2. **Ruleset.visaType Format**
   - **Risk:** Ruleset stored as "tourist_visa" or "student-visa" instead of "tourist"
   - **Impact:** Query will not match
   - **Mitigation:** Ensure ruleset creation normalizes visaType

3. **Multiple VisaTypes for Same Country**
   - **Risk:** "Tourist Visa" and "Visitor Visa" both exist, but ruleset only for "tourist"
   - **Impact:** One visaType uses ruleset, other falls back to LEGACY

---

### 3. Mismatch Between Country Codes

**Risks:**

1. **Country.code Format**
   - **Risk:** Stored as "AUS" instead of "AU" (ISO 3166-1 alpha-3 vs alpha-2)
   - **Impact:** Query will not match ruleset.countryCode
   - **Mitigation:** Ensure seed data uses ISO 3166-1 alpha-2

2. **Case Sensitivity**
   - **Risk:** Database stores "au" instead of "AU"
   - **Mitigation:** Code uses `.toUpperCase()`, but DB must be correct

3. **Country Name vs Code**
   - **Risk:** Using country name instead of code in queries
   - **Mitigation:** Code correctly uses `country.code`

---

### 4. Outdated Cached Checklists

**Risks:**

1. **Cache Not Invalidated on Ruleset Approval** ✅ PARTIALLY FIXED
   - **Issue:** Checklist cached before ruleset approval, never regenerates
   - **Fix Applied:** Code checks for approved ruleset before returning cache
   - **Remaining Risk:** If ruleset approved AFTER cache created, cache is invalidated on next request (good)

2. **Cache Not Invalidated on Ruleset Update**
   - **Risk:** New ruleset version approved, but cache still uses old version
   - **Mitigation:** Current fix invalidates cache when approved ruleset exists (any version)

3. **Cache TTL Not Implemented**
   - **Risk:** Checklist cached indefinitely, never refreshes
   - **Mitigation:** Manual regeneration endpoint exists

4. **Race Condition: Cache Created During Ruleset Approval**
   - **Risk:** Checklist generated in LEGACY mode, then ruleset approved immediately after
   - **Impact:** Cache contains LEGACY checklist, not ruleset-based
   - **Mitigation:** Next request will invalidate and regenerate

---

### 5. Frontend and Backend Schema Mismatch

**Risks:**

1. **checklistData Format**
   - **Backend:** Stores as JSON string in `DocumentChecklist.checklistData`
   - **Frontend:** Expects `items` array directly
   - **Mitigation:** Route handler parses and formats response

2. **Response Structure**
   - **Backend Returns:**
     ```json
     {
       "success": true,
       "data": {
         "items": [...],
         "summary": {...},
         "progress": 20
       }
     }
     ```
   - **Frontend Expects:** `response.data.items` array
   - **Status:** ✅ Compatible

3. **Processing Status**
   - **Backend Returns:** `{ status: 'processing', items: [] }`
   - **Frontend Handles:** Shows loading state, retries after 3 seconds
   - **Status:** ✅ Compatible

4. **TypeScript Interface Mismatch**
   - **Backend:** `DocumentChecklist` interface (line 50)
   - **Frontend:** `DocumentChecklist` interface in `useApplication.ts` (line 28)
   - **Risk:** Fields may differ
   - **Mitigation:** Both use similar structure, but should be shared type

---

## Concrete Recommended Code Changes

### 1. Fix VisaType Normalization Edge Cases

**File:** `apps/backend/src/services/document-checklist.service.ts`

**Current Code (line 69):**
```typescript
private static normalizeVisaType(visaTypeName: string): string {
  return visaTypeName.toLowerCase().trim().replace(/\s+visa\s*$/i, '').trim();
}
```

**Issue:** "F-1 Student Visa" → "f-1 student" (may not match ruleset)

**Recommended Fix:**
```typescript
private static normalizeVisaType(visaTypeName: string): string {
  let normalized = visaTypeName.toLowerCase().trim();
  
  // Remove "visa" suffix
  normalized = normalized.replace(/\s+visa\s*$/i, '').trim();
  
  // Handle common variations
  const variations: Record<string, string> = {
    'f-1 student': 'student',
    'f1 student': 'student',
    'm-1 student': 'student',
    'j-1 student': 'student',
    'visitor': 'tourist',
    'visitor visa': 'tourist',
    'business': 'tourist',  // May need country-specific handling
    'work': 'work',
    'skilled worker': 'work',
  };
  
  // Check for exact match first
  if (variations[normalized]) {
    return variations[normalized];
  }
  
  // Check for partial match (e.g., "student visa" contains "student")
  for (const [key, value] of Object.entries(variations)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }
  
  return normalized;
}
```

---

### 2. Add Cache Version Tracking

**File:** `apps/backend/prisma/schema.prisma`

**Add Field:**
```prisma
model DocumentChecklist {
  // ... existing fields ...
  rulesetVersion Int?  // Version of VisaRuleSet used to generate this checklist
  rulesetId      String?  // ID of VisaRuleSet used
}
```

**File:** `apps/backend/src/services/document-checklist.service.ts`

**Update Cache Check:**
```typescript
// In generateChecklist() method, after getting approvedRuleSet
if (storedChecklist?.status === 'ready') {
  const approvedRuleSet = await VisaRulesService.getActiveRuleSet(countryCode, visaType);
  
  if (!approvedRuleSet) {
    return cachedChecklist;  // No ruleset, use cache
  }
  
  // Get ruleset record to check version
  const rulesetRecord = await prisma.visaRuleSet.findFirst({
    where: {
      countryCode: countryCode.toUpperCase(),
      visaType: visaType.toLowerCase(),
      isApproved: true,
    },
    orderBy: { version: 'desc' },
  });
  
  // Invalidate if ruleset version changed
  if (storedChecklist.rulesetVersion !== rulesetRecord?.version) {
    logInfo('[Checklist][Cache] Invalidating - ruleset version changed', {
      oldVersion: storedChecklist.rulesetVersion,
      newVersion: rulesetRecord?.version,
    });
    // Continue to regeneration
  } else {
    return cachedChecklist;  // Same version, use cache
  }
}
```

---

### 3. Add Validation for CountryCode Format

**File:** `apps/backend/src/services/visa-rules.service.ts`

**Add Validation:**
```typescript
static async getActiveRuleSet(
  countryCode: string,
  visaType: string
): Promise<VisaRuleSetData | null> {
  // Validate countryCode is ISO 3166-1 alpha-2 (2 uppercase letters)
  const normalizedCountryCode = countryCode.toUpperCase().trim();
  if (!/^[A-Z]{2}$/.test(normalizedCountryCode)) {
    logWarn('[VisaRules] Invalid countryCode format', {
      countryCode,
      normalizedCountryCode,
    });
    return null;
  }
  
  // Validate visaType is not empty
  const normalizedVisaType = visaType.toLowerCase().trim();
  if (!normalizedVisaType) {
    logWarn('[VisaRules] Empty visaType', { visaType });
    return null;
  }
  
  try {
    const ruleSet = await prisma.visaRuleSet.findFirst({
      where: {
        countryCode: normalizedCountryCode,
        visaType: normalizedVisaType,
        isApproved: true,
      },
      orderBy: { version: 'desc' },
    });
    // ... rest of method
  }
}
```

---

### 4. Add Shared TypeScript Types

**File:** `apps/backend/src/types/checklist.ts` (NEW)

```typescript
export interface ChecklistItem {
  id: string;
  documentType: string;
  name: string;
  nameUz: string;
  nameRu: string;
  description: string;
  descriptionUz: string;
  descriptionRu: string;
  category?: 'required' | 'highly_recommended' | 'optional';
  required: boolean;
  priority: string;
  status: 'missing' | 'pending' | 'verified' | 'rejected';
  userDocumentId?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  uploadedAt?: string;
  verificationNotes?: string;
  aiVerified?: boolean;
  aiConfidence?: number;
  whereToObtain?: string;
  whereToObtainUz?: string;
  whereToObtainRu?: string;
}

export interface DocumentChecklist {
  applicationId: string;
  countryId: string;
  visaTypeId: string;
  items: ChecklistItem[];
  totalRequired: number;
  completed: number;
  progress: number;
  generatedAt: string;
  aiGenerated: boolean;
  aiFallbackUsed?: boolean;
  aiErrorOccurred?: boolean;
}

export interface ChecklistSummary {
  total: number;
  uploaded: number;
  verified: number;
  missing: number;
  rejected: number;
}
```

**Update:** Import in both backend and frontend

---

### 5. Add Logging for Mode Selection

**File:** `apps/backend/src/services/document-checklist.service.ts`

**Already Added, but enhance:**
```typescript
// After getActiveRuleSet() call
if (approvedRuleSet) {
  logInfo('[Checklist][Mode] Using RULES mode', {
    applicationId,
    countryCode,
    visaType,
    rulesetDocumentsCount: approvedRuleSet.requiredDocuments?.length || 0,
    rulesetVersion: 'latest',  // TODO: Get actual version
  });
} else {
  logWarn('[Checklist][Mode] Falling back to LEGACY mode', {
    applicationId,
    countryCode,
    visaType,
    reason: 'no_approved_ruleset',
    // Log what was queried
    queriedCountryCode: countryCode,
    queriedVisaType: visaType,
  });
}
```

---

### 6. Add Database Migration for Cache Version Tracking

**File:** `apps/backend/prisma/migrations/XXXX_add_checklist_ruleset_version/migration.sql`

```sql
ALTER TABLE "DocumentChecklist" 
ADD COLUMN "rulesetVersion" INTEGER,
ADD COLUMN "rulesetId" TEXT;

CREATE INDEX "DocumentChecklist_rulesetId_idx" ON "DocumentChecklist"("rulesetId");
```

---

### 7. Add Admin Endpoint to Invalidate All Caches

**File:** `apps/backend/src/routes/admin.ts`

```typescript
/**
 * POST /api/admin/checklist/invalidate-all
 * Invalidate all cached checklists (use when ruleset approved)
 */
router.post('/checklist/invalidate-all', async (req, res, next) => {
  try {
    // Set all 'ready' checklists to 'pending' to force regeneration
    const result = await prisma.documentChecklist.updateMany({
      where: { status: 'ready' },
      data: { status: 'pending' },
    });
    
    return res.json({
      success: true,
      message: `Invalidated ${result.count} cached checklists`,
    });
  } catch (error) {
    next(error);
  }
});
```

---

### 8. Add Monitoring/Alerting

**File:** `apps/backend/src/services/document-checklist.service.ts`

**Add Metrics:**
```typescript
// Track mode usage
if (mode === 'RULES') {
  // Increment metric: checklist.rules_mode.count
  logInfo('[Checklist][Metrics] RULES mode used', {
    countryCode,
    visaType,
  });
} else {
  // Increment metric: checklist.legacy_mode.count
  logWarn('[Checklist][Metrics] LEGACY mode used', {
    countryCode,
    visaType,
    reason: 'no_approved_ruleset',
  });
}
```

---

## Summary

### Current State
- ✅ VisaType normalization fixed (strips "visa" suffix)
- ✅ Cache invalidation when approved ruleset exists
- ✅ Logging for mode selection
- ⚠️ Edge cases in visaType normalization (F-1, etc.)
- ⚠️ No cache version tracking
- ⚠️ No shared TypeScript types

### Recommended Priority
1. **High:** Add cache version tracking (prevents stale checklists)
2. **High:** Enhance visaType normalization (handles F-1, visitor, etc.)
3. **Medium:** Add shared TypeScript types (prevents schema drift)
4. **Medium:** Add validation for countryCode format
5. **Low:** Add admin endpoint to invalidate all caches
6. **Low:** Add monitoring/alerting

---

**Document End**

