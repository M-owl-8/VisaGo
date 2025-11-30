# 🔍 Production Issues Investigation Report

**Date**: December 2024  
**Issues Investigated**: 4 critical production bugs

---

## 1️⃣ RegisterScreen Crash: "Property 'useTranslation' doesn't exist"

### 🔴 **CRITICAL BUG**

**Error**: `Property 'useTranslation' doesn't exist`  
**Location**: `frontend_new/src/screens/auth/RegisterScreen.tsx:20`

### Root Cause

**Missing import statement**. The `useTranslation()` hook is called on line 20, but the import is missing from the top of the file.

**Current Code (Line 20)**:

```typescript
const { t } = useTranslation(); // ❌ useTranslation is not imported
```

**All other files correctly import it**:

```typescript
import { useTranslation } from 'react-i18next'; // ✅ Present in other files
```

### Why It Breaks

- In development, React Native's bundler might be more lenient or the error is caught differently
- In production builds (release APK/AAB), the bundler is stricter and throws immediately when an undefined function is called
- The error occurs at module initialization, crashing the entire Register screen

### Fix

**File**: `frontend_new/src/screens/auth/RegisterScreen.tsx`

**Add this import at the top** (after line 13):

```typescript
import { useTranslation } from 'react-i18next';
```

**Complete fix**:

```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTranslation } from 'react-i18next'; // ✅ ADD THIS LINE
import { useAuthStore } from '../../store/auth';
import { signInWithGoogle } from '../../services/google-oauth';
```

### Verification

After fix, verify:

1. Register screen opens without crash
2. Translation keys work (`t('common.error')`, `t('auth.fillAllFields')`)
3. No TypeScript errors: `npx tsc --noEmit` in `frontend_new/`

---

## 2️⃣ Forgot Password: Success Message But No Email Sent

### 🟡 **HIGH PRIORITY BUG**

**Symptom**: User sees "Password reset link has been sent" but no email arrives  
**Location**:

- Frontend: `frontend_new/src/screens/auth/ForgotPasswordScreen.tsx:32-39`
- Backend: `apps/backend/src/routes/auth.ts:335-358`
- Service: `apps/backend/src/services/auth.service.ts:520-545`
- Email: `apps/backend/src/services/email.service.ts:59-100`

### Root Cause Analysis

**Multiple issues**:

1. **Email service always returns `true`** (Line 95 in `email.service.ts`):

   ```typescript
   // Log if no service available
   console.log(`📧 [DEV MODE] Email would be sent to ${payload.to}:\n${payload.subject}`);
   return true; // ❌ Returns true even when email service is not configured!
   ```

2. **Backend route always returns success** (Line 350-353 in `auth.ts`):

   ```typescript
   await AuthService.requestPasswordReset(email);
   // Always return success to prevent user enumeration
   successResponse(res, {
     message: 'If an account exists with this email, a password reset link has been sent.',
   });
   ```

   This is intentional for security (prevent user enumeration), but it hides email failures.

3. **Email service errors are silently caught** (Line 536-544 in `auth.service.ts`):

   ```typescript
   try {
     await emailService.sendPasswordResetEmail(user.email, resetLink);
   } catch (error) {
     // Log reset token if email service fails (for development)
     console.log(`Password reset token for ${normalizedEmail}: ${resetToken}`);
     console.log(`Reset link: ${resetLink}`);
     console.warn('Email service not available, reset token logged to console');
     // ❌ Error is swallowed, no exception thrown
   }
   ```

4. **Email service not configured in production**:
   - Requires `SENDGRID_API_KEY` OR (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`)
   - If neither is set, email service logs to console but returns `true`

### Why It Breaks

- Email service is optional and returns `true` even when not configured
- Backend intentionally always returns success (security best practice)
- Frontend shows success message regardless of actual email delivery
- User never knows if email was actually sent

### Fix Strategy

**Option A: Log errors but still return success (current behavior, but improve logging)**

- Keep security behavior (don't reveal if email exists)
- But log email failures clearly in backend logs
- Add monitoring/alerting for email failures

**Option B: Show generic error if email service is not configured**

- Check if email service is available before processing
- Return a generic error: "Email service temporarily unavailable"
- Still don't reveal if email exists

**Recommended Fix (Option A + Better Logging)**:

**File**: `apps/backend/src/services/email.service.ts`

**Change line 94-95**:

```typescript
// BEFORE:
console.log(`📧 [DEV MODE] Email would be sent to ${payload.to}:\n${payload.subject}`);
return true;

// AFTER:
if (process.env.NODE_ENV === 'development') {
  console.log(`📧 [DEV MODE] Email would be sent to ${payload.to}:\n${payload.subject}`);
  return true;
}
// In production, return false if no email service is configured
logWarn('[EmailService] Email service not configured - cannot send email', {
  to: payload.to.substring(0, 3) + '***', // Sanitize email
  subject: payload.subject,
});
return false;
```

**File**: `apps/backend/src/services/auth.service.ts`

**Change line 535-544**:

```typescript
// BEFORE:
try {
  await emailService.sendPasswordResetEmail(user.email, resetLink);
} catch (error) {
  console.log(`Password reset token for ${normalizedEmail}: ${resetToken}`);
  console.log(`Reset link: ${resetLink}`);
  console.warn('Email service not available, reset token logged to console');
}

// AFTER:
try {
  const emailSent = await emailService.sendPasswordResetEmail(user.email, resetLink);
  if (!emailSent) {
    logWarn('[AUTH][PasswordReset] Email service failed to send', {
      email: normalizedEmail.substring(0, 3) + '***',
      hasSendGrid: !!process.env.SENDGRID_API_KEY,
      hasSMTP: !!(process.env.SMTP_HOST && process.env.SMTP_USER),
    });
    // In development, log the reset token
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV] Password reset token for ${normalizedEmail}: ${resetToken}`);
      console.log(`[DEV] Reset link: ${resetLink}`);
    }
  } else {
    logInfo('[AUTH][PasswordReset] Email sent successfully', {
      email: normalizedEmail.substring(0, 3) + '***',
    });
  }
} catch (error) {
  logError('[AUTH][PasswordReset] Email sending error', error as Error, {
    email: normalizedEmail.substring(0, 3) + '***',
  });
  // In development, log the reset token as fallback
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DEV] Password reset token for ${normalizedEmail}: ${resetToken}`);
    console.log(`[DEV] Reset link: ${resetLink}`);
  }
}
```

**File**: `apps/backend/src/services/email.service.ts`

**Add import at top**:

```typescript
import { logWarn } from '../middleware/logger';
```

### Required Environment Variables

For email to work in production, set **ONE** of these:

**Option 1: SendGrid** (Recommended)

```
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
SMTP_FROM_EMAIL=noreply@visabuddy.com
```

**Option 2: SMTP** (Gmail, Outlook, etc.)

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=noreply@visabuddy.com
```

### Verification

After fix:

1. Check Railway logs for email service initialization
2. Test forgot password with valid email
3. Verify email arrives (check spam folder)
4. Check logs for email sending status

---

## 3️⃣ AI Checklist: Only 3 Documents Visible Instead of 10-11

### 🟡 **HIGH PRIORITY BUG**

**Symptom**: Canada Study Permit checklist shows only 3 items (Passport, Visa Application Form, Financial Proof)  
**Expected**: 10-11 items (LOA from DLI, proof of funds, tuition payment, study plan, ties, medical, biometrics, etc.)  
**Location**:

- Frontend: `frontend_new/src/screens/visa/ApplicationDetailScreen.tsx:453-534`
- Backend: `apps/backend/src/services/document-checklist.service.ts:72-305`
- AI Service: `apps/backend/src/services/ai-openai.service.ts:431-657`

### Root Cause Analysis

**Investigation Results**:

1. **Frontend rendering**: ✅ **No limiting found**
   - Line 453: `checklistItems.map((item, index) => {` - Maps over ALL items
   - No `.slice(0, 3)` or `.take(3)` found
   - No conditional filtering that would hide items

2. **Backend service**: ✅ **No limiting found**
   - Line 298: `items: sanitizedItems` - Returns all items
   - No `.slice()` or `LIMIT` in Prisma queries
   - No filtering that would truncate the list

3. **AI Service fallback**: ⚠️ **FALLBACK RETURNS ONLY 3 ITEMS**
   - Lines 608-655: When AI generation fails, fallback returns exactly 3 items:
     - Passport
     - Visa Application Form
     - Financial Proof
   - This is the **root cause**!

4. **AI Generation**: The AI might be:
   - Failing silently and falling back to 3-item list
   - Returning only 3 items due to token limit (`max_completion_tokens: 1200`)
   - Hitting timeout and falling back

### Why It Breaks

**Most Likely Scenario**:

1. AI checklist generation fails (timeout, API error, or invalid response)
2. Code catches error and falls back to 3-item static checklist
3. Frontend displays the 3-item fallback list
4. User sees only 3 documents

**Evidence**:

- Backend logs should show `[Checklist][AI] Failed, falling back to static documentTypes`
- Or `[OpenAI][Checklist] Checklist generation failed`
- Check Railway logs for these messages

### Fix Strategy

**Immediate Fix**: Improve error handling and logging

**File**: `apps/backend/src/services/document-checklist.service.ts`

**Add better logging around AI generation** (around line 168-264):

```typescript
// BEFORE:
try {
  const aiChecklist = await AIOpenAIService.generateChecklist(...);
  // ...
} catch (aiError: any) {
  logError('[Checklist][AI] Failed, falling back to static documentTypes', ...);
  items = await this.generateChecklistItems(...);
}

// AFTER:
try {
  const aiChecklist = await AIOpenAIService.generateChecklist(...);
  // ...
  if (items.length < 5) {
    logWarn('[Checklist][AI] AI returned suspiciously short checklist', {
      applicationId,
      itemCount: items.length,
      country: application.country.name,
      visaType: application.visaType.name,
    });
  }
} catch (aiError: any) {
  logError(
    '[Checklist][AI] Failed, falling back to static documentTypes',
    aiError instanceof Error ? aiError : new Error(String(aiError)),
    {
      applicationId,
      country: application.country.name,
      visaType: application.visaType.name,
      errorType: aiError?.type || 'unknown',
      errorMessage: aiError?.message || String(aiError),
      // Log if this is a timeout, API error, or parsing error
      isTimeout: aiError?.message?.includes('timeout') || false,
      isAPIError: aiError?.status || false,
    }
  );
  items = await this.generateChecklistItems(...);
  logInfo('[Checklist][Fallback] Using fallback checklist', {
    applicationId,
    itemCount: items.length,
  });
}
```

**Long-term Fix**: Improve fallback checklist to be more comprehensive

**File**: `apps/backend/src/services/ai-openai.service.ts`

**Improve fallback checklist** (lines 608-655) to include more items for Study Permits:

```typescript
// Add country/visa-specific fallback checklists
if (country.toLowerCase().includes('canada') && visaType.toLowerCase().includes('study')) {
  return {
    type: visaType,
    checklist: [
      // ... existing 3 items ...
      {
        document: 'letter_of_acceptance',
        name: 'Letter of Acceptance (LOA) from Designated Learning Institution (DLI)',
        nameUz: "Tayinlangan o'qish muassasasidan (DLI) qabul xati (LOA)",
        nameRu: 'Письмо о зачислении (LOA) от назначенного учебного заведения (DLI)',
        required: true,
        description: 'Official LOA from a DLI-listed institution in Canada',
        // ... multilingual fields ...
      },
      {
        document: 'proof_of_funds',
        name: 'Proof of Financial Support',
        // ... more items ...
      },
      // Add 8-10 more items for comprehensive checklist
    ],
  };
}
```

### Verification

After fix:

1. Check Railway logs for AI generation success/failure
2. Test Canada Study Permit application creation
3. Verify checklist shows 10+ items
4. If still 3 items, check logs for AI errors

---

## 4️⃣ Improve GPT-4 Checklist Quality (Prompt Engineering)

### 🟢 **MEDIUM PRIORITY ENHANCEMENT**

**Goal**: Ensure GPT-4 always generates complete, high-quality checklists with country-specific terminology

**Current Prompt Issues**:

1. Token limit (`max_completion_tokens: 1200`) might truncate long checklists
2. System prompt doesn't enforce minimum document count
3. No explicit requirement for country-specific terms (LOA vs I-20)
4. Fallback is too minimal (only 3 items)

### Current Prompt Analysis

**File**: `apps/backend/src/services/ai-openai.service.ts:464-492`

**Current System Prompt**:

```typescript
const systemPrompt = `You are Ketdik's visa document assistant. Reply ONLY with valid JSON...
Rules:
- Use country-specific terminology...
- Canada study permits MUST use "Letter of Acceptance (LOA) from a Designated Learning Institution (DLI)"...
- Provide a complete list of required and strong optional documents...
`;
```

**Issues**:

- No minimum document count requirement
- No explicit structure for comprehensive lists
- Token limit might cut off items

### Improved Prompt Design

**New System Prompt**:

```typescript
const systemPrompt = `You are Ketdik's visa document assistant. Generate a COMPLETE document checklist for visa applications.

CRITICAL REQUIREMENTS:
1. MINIMUM DOCUMENT COUNT: Generate at least 8-15 documents per checklist. Never return fewer than 8 items.
2. COUNTRY-SPECIFIC TERMINOLOGY (MANDATORY):
   - Canada Study Permits: MUST use "Letter of Acceptance (LOA) from a Designated Learning Institution (DLI)". NEVER mention "I-20" or "SEVIS".
   - United States Student Visas: MUST use "Form I-20" and "SEVIS" terminology. NEVER mention "LOA" or "DLI".
   - Tourist Visas: Use country-specific terms (e.g., "Schengen Visa Application" for EU countries).
3. STRUCTURE: Every checklist MUST include:
   - Core Documents: Passport, Visa Application Form, Financial Proof
   - Country-Specific Required: Based on visa type (LOA/I-20, accommodation proof, travel insurance, etc.)
   - Supporting Documents: Proof of ties, employment letter, study plan, medical exam (if required), biometrics appointment
   - Optional but Recommended: Travel itinerary, hotel bookings, sponsor documents (if applicable)
4. MULTILINGUAL: All name/description fields must have UZ and RU translations. If translation unavailable, reuse English.

Reply ONLY with valid JSON matching this exact schema:
{
  "type": "${visaType}",
  "checklist": [
    {
      "document": "internal_key_snake_case",
      "name": "English Display Name",
      "nameUz": "O'zbekcha nomi",
      "nameRu": "Русское название",
      "description": "English description (2-3 sentences)",
      "descriptionUz": "O'zbekcha tavsif",
      "descriptionRu": "Русское описание",
      "required": true,
      "priority": "high"|"medium"|"low",
      "whereToObtain": "English instructions",
      "whereToObtainUz": "O'zbekcha ko'rsatma",
      "whereToObtainRu": "Русская инструкция"
    }
  ]
}

VALIDATION RULES:
- checklist array MUST have 8-15 items
- All required fields (document, name, description, required) must be present
- Multilingual fields can reuse English if translation unavailable
- Priority: "high" for required documents, "medium" for recommended, "low" for optional
- Use the provided visaKnowledgeBase and documentGuides to ensure accuracy`;
```

**New User Prompt Template**:

```typescript
const userPrompt = `Generate a COMPLETE document checklist for a ${visaType} visa application to ${country}.

APPLICANT CONTEXT:
${JSON.stringify(userContext, null, 2)}

VISA KNOWLEDGE BASE:
${visaKb || 'No specific knowledge base available for this country/visa type.'}

DOCUMENT GUIDES (Uzbekistan-specific):
${documentGuidesText || 'No Uzbekistan-specific document guides matched this request.'}

REQUIREMENTS:
1. Generate 8-15 documents (minimum 8, aim for 10-12 for comprehensive coverage)
2. Use country-specific terminology from the knowledge base
3. Include ALL required documents for this visa type
4. Include recommended supporting documents
5. Provide multilingual names and descriptions (UZ, RU, EN)
6. Mark priority: "high" for mandatory, "medium" for recommended, "low" for optional

Return ONLY the JSON object, no markdown, no commentary.`;
```

**Increase Token Limit**:

```typescript
// BEFORE:
max_completion_tokens: 1200,

// AFTER:
max_completion_tokens: 2000, // Allow for 10-15 items with full multilingual descriptions
```

### Updated Knowledge Base

**File**: `apps/backend/src/data/visaKnowledgeBase.ts` (if exists, or create)

**Add comprehensive Canada Study Permit guide**:

```typescript
export function getVisaKnowledgeBase(country: string, visaType: string): string {
  if (country.toLowerCase().includes('canada') && visaType.toLowerCase().includes('study')) {
    return `
CANADA STUDY PERMIT - REQUIRED DOCUMENTS:

1. Letter of Acceptance (LOA) from Designated Learning Institution (DLI)
   - Must be from a DLI-listed institution
   - Must include program details, duration, start date
   - NEVER use "I-20" (that's US terminology)

2. Proof of Financial Support
   - Bank statements (last 4 months)
   - Proof of tuition payment
   - Proof of living expenses (CAD 10,000+ per year)

3. Passport
   - Valid for at least 6 months beyond intended stay

4. Completed Study Permit Application Form (IMM 1294)

5. Proof of Ties to Home Country
   - Employment letter
   - Property ownership
   - Family ties

6. Study Plan
   - Explanation of why studying in Canada
   - Career goals
   - How program relates to future plans

7. Medical Exam (if required)
   - Panel physician exam
   - Valid for 12 months

8. Biometrics
   - Fingerprints and photo at VAC

9. Police Certificate (if required)
   - Criminal background check

10. English/French Language Test Results (if required)
    - IELTS, TOEFL, CELPIP, TEF

OPTIONAL BUT RECOMMENDED:
- Travel itinerary
- Accommodation proof
- Sponsor documents (if applicable)
- Previous education transcripts
`;
  }
  // ... other countries ...
}
```

### Implementation Steps

1. **Update system prompt** in `ai-openai.service.ts:464-492`
2. **Update user prompt template** in `ai-openai.service.ts:504-508`
3. **Increase token limit** to 2000
4. **Enhance fallback checklist** with country-specific items
5. **Add validation** to ensure minimum 8 items
6. **Test** with Canada Study Permit, US Student Visa, Tourist visas

### Verification

After implementation:

1. Test Canada Study Permit → Should show 10+ items with "LOA from DLI"
2. Test US Student Visa → Should show "Form I-20" and SEVIS
3. Test Tourist Visa → Should show comprehensive travel documents
4. Check logs for AI generation success rates
5. Verify no fallback to 3-item list unless AI completely fails

---

## 📋 Summary & Priority

| Issue                     | Severity    | Fix Complexity                  | Estimated Time |
| ------------------------- | ----------- | ------------------------------- | -------------- |
| 1. RegisterScreen crash   | 🔴 CRITICAL | ⚡ Trivial (1 line)             | 2 minutes      |
| 2. Forgot password email  | 🟡 HIGH     | ⚙️ Medium (3 files)             | 30 minutes     |
| 3. Checklist 3 items only | 🟡 HIGH     | ⚙️ Medium (logging + fallback)  | 1 hour         |
| 4. GPT-4 prompt quality   | 🟢 MEDIUM   | 🔧 Complex (prompt engineering) | 2-3 hours      |

**Total Estimated Fix Time**: 4-5 hours

---

## ✅ Next Steps

1. **Immediate**: Fix RegisterScreen import (2 min)
2. **Today**: Fix forgot password email logging (30 min)
3. **Today**: Add checklist logging to diagnose 3-item issue (1 hour)
4. **This Week**: Improve GPT-4 prompts and fallback checklists (2-3 hours)

---

**Report Generated**: December 2024  
**Status**: Ready for implementation




