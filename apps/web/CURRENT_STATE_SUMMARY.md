# Current State Summary (apps/web)

## Step 0 - Context Check Results

### Current Questionnaire Implementation

**File:** `app/questionnaire/page.tsx`

**Current Structure:**

- 5-step form with simplified legacy fields
- Uses flat state object: `{ purpose, country, duration, traveledBefore, currentStatus, hasInvitation, financialSituation, maritalStatus, hasChildren, englishLevel }`
- Country is **text input** (not dropdown) - allows invalid values
- Most labels are **hardcoded English** (not using i18n)
- Error handling uses **`alert()`** (poor UX)

**API Payload Sent:**

```typescript
{
  questionnaireData: {
    purpose: string,
    country: string,  // Text input - problematic
    duration: string,
    traveledBefore: boolean,
    currentStatus: string,
    hasInvitation: boolean,
    financialSituation: string,
    maritalStatus: string,
    hasChildren: string,
    englishLevel: string
  }
}
```

**Missing v2 Fields:**

- No `version: '2.0'`
- No `targetCountry` (2-letter code)
- No `visaType` (derived from purpose)
- No `personal.ageRange`, `personal.nationality`, `personal.passportStatus`
- No `travel.plannedWhen`, `travel.isExactDatesKnown`
- No `status.highestEducation`, `status.isMinor`
- No `finance.payer`, `finance.approxMonthlyIncomeRange`, `finance.hasBankStatement`, `finance.hasStableIncome`
- No `invitation.studentInvitationType`, `invitation.touristInvitationType`
- No `stay`, `history`, `ties`, `documents`, `special` sections

### Mobile App v2 Structure

**File:** `frontend_new/src/types/questionnaire-v2.ts`

**Structure:**

- Full nested v2 object with `version: '2.0'`
- Organized into: `personal`, `travel`, `status`, `finance`, `invitation`, `stay`, `history`, `ties`, `documents`, `special`
- ~30-32 questions total
- All fields are dropdowns/selects (no free text)
- Country uses 2-letter codes: US, GB, ES, DE, JP, AE, CA, AU

### API Client

**File:** `lib/api/client.ts`

**Current Method:**

```typescript
async generateApplicationWithAI(questionnaireData: {
  purpose: string;
  country?: string;
  duration: string;
  traveledBefore: boolean;
  currentStatus: string;
  hasInvitation: boolean;
  financialSituation: string;
  maritalStatus: string;
  hasChildren: string;
  englishLevel: string;
}): Promise<ApiResponse>
```

**Needs Update:** To accept full v2 structure

### Error Handling

**Current Issues:**

- Questionnaire uses `alert()` (lines 88, 91)
- Forgot password uses raw `err.message` (not translated)
- Application detail logs to console only (no UI error)
- Documents page has hardcoded English messages
- Register page has hardcoded validation messages

**Good Examples:**

- Login/Register use `getErrorMessage()` utility
- Chat displays error banner

### i18n Coverage

**Current State:**

- Login: ✅ Fully translated
- Register: ✅ Fully translated (except validation messages)
- Applications: ✅ Mostly translated
- Chat: ✅ Fully translated
- Profile: ✅ Fully translated
- Support: ✅ Fully translated
- Questionnaire: ❌ Mostly hardcoded English
- Forgot Password: ⚠️ Partially translated
- Documents: ⚠️ Partially translated
- Application Detail: ⚠️ Partially translated

### Known Bugs

1. **WEB_BUG_01:** Chat optimistic message removal bug
2. **WEB_BUG_02:** useEffect dependency warning
3. **WEB_BUG_03:** Questionnaire uses alert()
4. **WEB_BUG_04:** Register validation messages hardcoded
5. **WEB_BUG_05:** Forgot password error not translated
6. **WEB_BUG_06:** Application detail no error display
7. **WEB_BUG_07:** Documents messages hardcoded
8. **WEB_BUG_08:** Country text input (should be dropdown)
9. **WEB_BUG_09:** Chat no retry button
10. **WEB_BUG_10:** Profile no edit functionality
11. **WEB_BUG_11:** Language not saved to backend
12. **WEB_BUG_12:** TypeScript version warning

---

## Implementation Plan

Starting with Step 1: Implement Questionnaire v2 structure matching mobile app.
