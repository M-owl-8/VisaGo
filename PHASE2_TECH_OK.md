# Phase 2 Tech Verification - ✅ ALL SYSTEMS GO

**Date:** 2025-12-04  
**Status:** ✅ **VERIFIED & READY FOR PRODUCTION**

---

## Executive Summary

All Phase 1 scripts and services have been verified and are production-ready. All 4 scripts work correctly with Railway Postgres, handle the 10 countries × 2 visa types correctly, and are safe to run in production.

---

## ✅ Verification Results

### 1. Scripts Verified

#### ✅ `coverage:report` - **WORKING**

- **File:** `apps/backend/scripts/visa-coverage-report.ts`
- **Countries:** 10 countries (US, CA, GB, AU, DE, FR, ES, IT, JP, AE) - ✅ Correct
- **Visa Types:** tourist, student - ✅ Correct
- **Database:** Uses PrismaClient directly, auto-selects Postgres via schema-selector.js - ✅ Correct
- **Output:** Generates `VISA_RULES_COVERAGE.md` with detailed status - ✅ Working
- **No problematic imports** - ✅ Safe

#### ✅ `embassy:sync` - **WORKING** (Fixed TypeScript errors)

- **File:** `apps/backend/scripts/run-embassy-sync.ts`
- **Fixes Applied:**
  1. Removed logger imports, using console.log instead (prevents TypeScript errors in CLI)
  2. Added REDIS_URL check with clear error message
  3. Fixed logger.ts TypeScript types (added userId to Request interface)
- **Three Usage Modes:**
  1. `npm run embassy:sync` → Syncs all active sources - ✅ Working (requires REDIS_URL)
  2. `npm run embassy:sync -- US tourist` → Syncs specific country/visaType - ✅ Working
  3. `npm run embassy:sync -- --source-id <id>` → Syncs specific source by ID - ✅ Working
- **Database:** Uses PrismaClient, auto-selects Postgres - ✅ Correct
- **Queue:** Uses Bull queue with Redis (requires REDIS_URL) - ✅ Correct
- **Countries:** Handles all 10 countries correctly - ✅ Correct
- **Note:** Script will fail with clear error if REDIS_URL is not set (expected behavior)

#### ✅ `approve:visarules` - **WORKING**

- **File:** `apps/backend/scripts/approve-visarules.ts`
- **Preview Mode:** `npm run approve:visarules -- AU tourist` - ✅ Working
  - Shows ruleset summary, document list, financial requirements
  - Clear, human-readable output
  - Safe (no changes made)
- **Approve Mode:** `npm run approve:visarules -- AU tourist --approve` - ✅ Working
  - Unapproves all other versions for that country/visaType
  - Sets `isApproved = true` on latest version
  - Sets `approvedAt` and `approvedBy = 'system'`
- **Database:** Uses PrismaClient directly, no problematic imports - ✅ Correct
- **Output:** Clean, reviewable format - ✅ Good

#### ✅ `check:launch-readiness` - **WORKING**

- **File:** `apps/backend/scripts/check-launch-readiness.ts`
- **Countries:** 10 countries (US, CA, GB, AU, DE, FR, ES, IT, JP, AE) - ✅ Correct
- **Visa Types:** tourist, student (20 combinations) - ✅ Correct
- **Database:** Uses PrismaClient directly, auto-selects Postgres - ✅ Correct
- **Checks:**
  - VisaType existence - ✅
  - VisaRuleSet existence - ✅
  - Approval status - ✅
  - EmbassySource existence - ✅
- **Output:** PASS/WARN/FAIL table + summary + final verdict - ✅ Working
- **Current Status:** 2 PASS (AU tourist, AU student), 18 WARN (need rulesets)

### 2. Services Verified

#### ✅ `document-checklist.service.ts` - **VERIFIED**

- ✅ `normalizeVisaType()` helper exists and is used
- ✅ Cache invalidation: checks for approved ruleset even when cached checklist exists
- ✅ Mode logging: `[Checklist][Mode] Using RULES mode` / `[Checklist][Mode] Using LEGACY mode`
- ✅ Uses Postgres via PrismaClient
- ✅ Handles 10 countries × 2 visa types correctly

#### ✅ `document-validation.service.ts` - **VERIFIED** (Fixed)

- ✅ Loads VisaRuleSet via `VisaRulesService.getActiveRuleSet()`
- ✅ Loads ApplicantProfile from `User.bio` (questionnaire data)
- ✅ Passes both to validation prompt
- ✅ Uses Postgres via PrismaClient
- ✅ Fixed: No longer tries to access non-existent `questionnaireData` field

#### ✅ `checklist-rate-limit.ts` - **VERIFIED**

- ✅ User-based rate limiting (20 checklists/day, 50 validations/day)
- ✅ Uses Redis with fallback to in-memory
- ✅ No problematic imports for CLI usage

### 3. Package.json Scripts - **VERIFIED**

All 4 scripts are correctly defined:

```json
"coverage:report": "node prisma/schema-selector.js && prisma generate && ts-node --project scripts/tsconfig.json scripts/visa-coverage-report.ts"
"embassy:sync": "node prisma/schema-selector.js && prisma generate && ts-node --project scripts/tsconfig.json scripts/run-embassy-sync.ts"
"approve:visarules": "node prisma/schema-selector.js && prisma generate && ts-node --project scripts/tsconfig.json scripts/approve-visarules.ts"
"check:launch-readiness": "node prisma/schema-selector.js && prisma generate && ts-node --project scripts/tsconfig.json scripts/check-launch-readiness.ts"
```

✅ All scripts:

- Run `schema-selector.js` first (auto-selects Postgres when DATABASE_URL is postgresql://)
- Generate Prisma client
- Run with ts-node using scripts/tsconfig.json

---

## 🚀 Commands to Run (In Order)

### Prerequisites

- Ensure `DATABASE_URL` is set to Railway Postgres:

  ```powershell
  # Public URL (for local/remote access)
  $env:DATABASE_URL="postgresql://postgres:ozolgfntMPMGTFZgWTIiqmoaqIKQetVx@gondola.proxy.rlwy.net:31433/railway"

  # OR internal URL (if running from within Railway network)
  # $env:DATABASE_URL="postgresql://postgres:ozolgfntMPMGTFZgWTIiqmoaqIKQetVx@postgres.railway.internal:5432/railway"
  ```

  **Note:** If you get "Can't reach database server" errors, the database might not be accessible from your local network. See `RAILWAY_SCRIPT_EXECUTION_GUIDE.md` for solutions.

- Ensure `REDIS_URL` is set (for embassy sync queue - required for `embassy:sync`):

  ```powershell
  # Use public URL for local/remote access
  $env:REDIS_URL="redis://default:cSzxbqwnZUiPjWQCsMaZGWLXJpLvLXXH@turntable.proxy.rlwy.net:12571"

  # OR use internal URL if running from within Railway network
  # $env:REDIS_URL="redis://default:cSzxbqwnZUiPjWQCsMaZGWLXJpLvLXXH@redis.railway.internal:6379"
  ```

  **Note:** If REDIS_URL is not set, `embassy:sync` will fail with a clear error message. This is expected - the Bull queue requires Redis.

### Step 1: Check Current Status

```powershell
cd apps/backend
npm run check:launch-readiness
```

**Expected Output:**

- Table showing PASS/WARN/FAIL for each of 20 combinations
- Summary: 2 PASS (AU tourist, AU student), 18 WARN
- Final verdict: "⚠️ LAUNCH READY (with warnings)"

### Step 2: Generate Coverage Report

```powershell
npm run coverage:report
```

**Expected Output:**

- Generates `VISA_RULES_COVERAGE.md` with detailed status
- Shows which combinations have rulesets, which need approval, which are missing

### Step 3: Sync Embassy Sources (For Missing 18 Combinations)

**Option A: Sync all active sources**

```powershell
npm run embassy:sync
```

**Option B: Sync specific country/visaType (recommended - do one at a time)**

```powershell
npm run embassy:sync -- US tourist
npm run embassy:sync -- US student
npm run embassy:sync -- CA tourist
npm run embassy:sync -- CA student
# ... repeat for GB, DE, FR, ES, IT, JP, AE (both tourist and student)
```

**Option C: Sync by source ID (if you know the ID)**

```powershell
npm run embassy:sync -- --source-id <sourceId>
```

**Expected Output:**

- "✅ Enqueued sync job for [country] [visaType]: [source name]"
- Queue statistics (waiting, active, completed, failed)
- **Note:** Jobs run in background via Bull queue. Check Railway logs or queue dashboard to see progress.

### Step 4: Review Extracted Rulesets

After sync jobs complete (check Railway logs), review each extracted ruleset:

```powershell
npm run approve:visarules -- US tourist
npm run approve:visarules -- US student
# ... repeat for all combinations that now have rulesets
```

**Expected Output:**

- Ruleset summary (country, visa type, version, ID, approval status)
- Required documents list with descriptions
- Financial requirements (if present)
- "⚠️ DRY RUN - No changes made" message

### Step 5: Approve Rulesets (After Review)

If the ruleset looks good, approve it:

```powershell
npm run approve:visarules -- US tourist --approve
npm run approve:visarules -- US student --approve
# ... repeat for all combinations you want to approve
```

**Expected Output:**

- "⚠️ APPROVING RULESET..."
- "✅ Ruleset approved successfully!"
- "Version X is now active for [country] [visaType]"

### Step 6: Verify Launch Readiness (After Approvals)

```powershell
npm run check:launch-readiness
```

**Expected Output (Target):**

- All 20 combinations show ✅ PASS
- Final verdict: "✅ LAUNCH READY: All combinations are fully configured!"

---

## 📋 Complete Workflow Example

Here's the exact sequence to sync and approve all 18 missing combinations:

```powershell
# 1. Check current status
cd apps/backend
npm run check:launch-readiness

# 2. Sync all missing combinations (one at a time, or use a loop)
npm run embassy:sync -- US tourist
npm run embassy:sync -- US student
npm run embassy:sync -- CA tourist
npm run embassy:sync -- CA student
npm run embassy:sync -- GB tourist
npm run embassy:sync -- GB student
npm run embassy:sync -- DE tourist
npm run embassy:sync -- DE student
npm run embassy:sync -- FR tourist
npm run embassy:sync -- FR student
npm run embassy:sync -- ES tourist
npm run embassy:sync -- ES student
npm run embassy:sync -- IT tourist
npm run embassy:sync -- IT student
npm run embassy:sync -- JP tourist
npm run embassy:sync -- JP student
npm run embassy:sync -- AE tourist
npm run embassy:sync -- AE student

# 3. Wait for sync jobs to complete (check Railway logs/dashboard)
# Then review each ruleset:
npm run approve:visarules -- US tourist
npm run approve:visarules -- US student
# ... (review all 18)

# 4. If rulesets look good, approve them:
npm run approve:visarules -- US tourist --approve
npm run approve:visarules -- US student --approve
# ... (approve all 18)

# 5. Final verification:
npm run check:launch-readiness
```

---

## ✅ Safety Checks

### Database

- ✅ All scripts use `PrismaClient` which auto-selects Postgres when `DATABASE_URL` contains `postgresql://`
- ✅ `schema-selector.js` automatically copies `schema.postgresql.prisma` to `schema.prisma` when Postgres is detected
- ✅ No SQLite-specific code in any script

### Imports

- ✅ `run-embassy-sync.ts`: Fixed - removed logger imports, uses console.log
- ✅ `approve-visarules.ts`: Uses PrismaClient directly, no problematic imports
- ✅ `check-launch-readiness.ts`: Uses PrismaClient directly, no problematic imports
- ✅ `visa-coverage-report.ts`: Uses PrismaClient directly, no problematic imports

### Country List

- ✅ All scripts use exactly 10 countries: US, CA, GB, AU, DE, FR, ES, IT, JP, AE
- ✅ No NZ, KR, PL in any script
- ✅ 20 combinations total (10 × 2 visa types)

### Approval Safety

- ✅ Preview mode (without `--approve`) is safe - no changes made
- ✅ Approval mode unapproves other versions before approving new one
- ✅ Clear output shows what will happen before approval

---

## 🔧 Small Fixes Applied

1. **`run-embassy-sync.ts`**: Removed logger imports, replaced with console.log to prevent TypeScript errors in CLI context
2. **`document-validation.service.ts`**: Already fixed - uses `User.bio` instead of non-existent `questionnaireData` field
3. **`logger.ts`**: Added `userId` to Express Request interface to fix TypeScript errors
4. **`scripts/tsconfig.json`**: Added `skipLibCheck: true` for better CLI compatibility

---

## 📊 Current Production Status

- **VisaRuleSet Coverage:** 2/20 approved (AU tourist, AU student)
- **EmbassySource Coverage:** 20/20 (all combinations have sources)
- **VisaType Coverage:** 20/20 (all combinations have visa types)
- **Next Steps:** Sync + approve remaining 18 combinations

---

## ✅ Final Verification

All scripts are:

- ✅ **Production-ready** - Work with Railway Postgres
- ✅ **Safe to run** - Preview modes, clear output, no destructive operations without explicit flags
- ✅ **Correctly configured** - Handle 10 countries × 2 visa types
- ✅ **No breaking imports** - All scripts can run as CLI tools
- ✅ **Well-documented** - Clear usage instructions and output

---

**Status:** ✅ **PHASE 2 TECH VERIFICATION COMPLETE - READY FOR PRODUCTION USE**

**Date:** 2025-12-04  
**Status:** ✅ **VERIFIED & READY FOR PRODUCTION**

---

## Executive Summary

All Phase 1 scripts and services have been verified and are production-ready. All 4 scripts work correctly with Railway Postgres, handle the 10 countries × 2 visa types correctly, and are safe to run in production.

---

## ✅ Verification Results

### 1. Scripts Verified

#### ✅ `coverage:report` - **WORKING**

- **File:** `apps/backend/scripts/visa-coverage-report.ts`
- **Countries:** 10 countries (US, CA, GB, AU, DE, FR, ES, IT, JP, AE) - ✅ Correct
- **Visa Types:** tourist, student - ✅ Correct
- **Database:** Uses PrismaClient directly, auto-selects Postgres via schema-selector.js - ✅ Correct
- **Output:** Generates `VISA_RULES_COVERAGE.md` with detailed status - ✅ Working
- **No problematic imports** - ✅ Safe

#### ✅ `embassy:sync` - **WORKING** (Fixed TypeScript errors)

- **File:** `apps/backend/scripts/run-embassy-sync.ts`
- **Fixes Applied:**
  1. Removed logger imports, using console.log instead (prevents TypeScript errors in CLI)
  2. Added REDIS_URL check with clear error message
  3. Fixed logger.ts TypeScript types (added userId to Request interface)
- **Three Usage Modes:**
  1. `npm run embassy:sync` → Syncs all active sources - ✅ Working (requires REDIS_URL)
  2. `npm run embassy:sync -- US tourist` → Syncs specific country/visaType - ✅ Working
  3. `npm run embassy:sync -- --source-id <id>` → Syncs specific source by ID - ✅ Working
- **Database:** Uses PrismaClient, auto-selects Postgres - ✅ Correct
- **Queue:** Uses Bull queue with Redis (requires REDIS_URL) - ✅ Correct
- **Countries:** Handles all 10 countries correctly - ✅ Correct
- **Note:** Script will fail with clear error if REDIS_URL is not set (expected behavior)

#### ✅ `approve:visarules` - **WORKING**

- **File:** `apps/backend/scripts/approve-visarules.ts`
- **Preview Mode:** `npm run approve:visarules -- AU tourist` - ✅ Working
  - Shows ruleset summary, document list, financial requirements
  - Clear, human-readable output
  - Safe (no changes made)
- **Approve Mode:** `npm run approve:visarules -- AU tourist --approve` - ✅ Working
  - Unapproves all other versions for that country/visaType
  - Sets `isApproved = true` on latest version
  - Sets `approvedAt` and `approvedBy = 'system'`
- **Database:** Uses PrismaClient directly, no problematic imports - ✅ Correct
- **Output:** Clean, reviewable format - ✅ Good

#### ✅ `check:launch-readiness` - **WORKING**

- **File:** `apps/backend/scripts/check-launch-readiness.ts`
- **Countries:** 10 countries (US, CA, GB, AU, DE, FR, ES, IT, JP, AE) - ✅ Correct
- **Visa Types:** tourist, student (20 combinations) - ✅ Correct
- **Database:** Uses PrismaClient directly, auto-selects Postgres - ✅ Correct
- **Checks:**
  - VisaType existence - ✅
  - VisaRuleSet existence - ✅
  - Approval status - ✅
  - EmbassySource existence - ✅
- **Output:** PASS/WARN/FAIL table + summary + final verdict - ✅ Working
- **Current Status:** 2 PASS (AU tourist, AU student), 18 WARN (need rulesets)

### 2. Services Verified

#### ✅ `document-checklist.service.ts` - **VERIFIED**

- ✅ `normalizeVisaType()` helper exists and is used
- ✅ Cache invalidation: checks for approved ruleset even when cached checklist exists
- ✅ Mode logging: `[Checklist][Mode] Using RULES mode` / `[Checklist][Mode] Using LEGACY mode`
- ✅ Uses Postgres via PrismaClient
- ✅ Handles 10 countries × 2 visa types correctly

#### ✅ `document-validation.service.ts` - **VERIFIED** (Fixed)

- ✅ Loads VisaRuleSet via `VisaRulesService.getActiveRuleSet()`
- ✅ Loads ApplicantProfile from `User.bio` (questionnaire data)
- ✅ Passes both to validation prompt
- ✅ Uses Postgres via PrismaClient
- ✅ Fixed: No longer tries to access non-existent `questionnaireData` field

#### ✅ `checklist-rate-limit.ts` - **VERIFIED**

- ✅ User-based rate limiting (20 checklists/day, 50 validations/day)
- ✅ Uses Redis with fallback to in-memory
- ✅ No problematic imports for CLI usage

### 3. Package.json Scripts - **VERIFIED**

All 4 scripts are correctly defined:

```json
"coverage:report": "node prisma/schema-selector.js && prisma generate && ts-node --project scripts/tsconfig.json scripts/visa-coverage-report.ts"
"embassy:sync": "node prisma/schema-selector.js && prisma generate && ts-node --project scripts/tsconfig.json scripts/run-embassy-sync.ts"
"approve:visarules": "node prisma/schema-selector.js && prisma generate && ts-node --project scripts/tsconfig.json scripts/approve-visarules.ts"
"check:launch-readiness": "node prisma/schema-selector.js && prisma generate && ts-node --project scripts/tsconfig.json scripts/check-launch-readiness.ts"
```

✅ All scripts:

- Run `schema-selector.js` first (auto-selects Postgres when DATABASE_URL is postgresql://)
- Generate Prisma client
- Run with ts-node using scripts/tsconfig.json

---

## 🚀 Commands to Run (In Order)

### Prerequisites

- Ensure `DATABASE_URL` is set to Railway Postgres:

  ```powershell
  # Public URL (for local/remote access)
  $env:DATABASE_URL="postgresql://postgres:ozolgfntMPMGTFZgWTIiqmoaqIKQetVx@gondola.proxy.rlwy.net:31433/railway"

  # OR internal URL (if running from within Railway network)
  # $env:DATABASE_URL="postgresql://postgres:ozolgfntMPMGTFZgWTIiqmoaqIKQetVx@postgres.railway.internal:5432/railway"
  ```

  **Note:** If you get "Can't reach database server" errors, the database might not be accessible from your local network. See `RAILWAY_SCRIPT_EXECUTION_GUIDE.md` for solutions.

- Ensure `REDIS_URL` is set (for embassy sync queue - required for `embassy:sync`):

  ```powershell
  # Use public URL for local/remote access
  $env:REDIS_URL="redis://default:cSzxbqwnZUiPjWQCsMaZGWLXJpLvLXXH@turntable.proxy.rlwy.net:12571"

  # OR use internal URL if running from within Railway network
  # $env:REDIS_URL="redis://default:cSzxbqwnZUiPjWQCsMaZGWLXJpLvLXXH@redis.railway.internal:6379"
  ```

  **Note:** If REDIS_URL is not set, `embassy:sync` will fail with a clear error message. This is expected - the Bull queue requires Redis.

### Step 1: Check Current Status

```powershell
cd apps/backend
npm run check:launch-readiness
```

**Expected Output:**

- Table showing PASS/WARN/FAIL for each of 20 combinations
- Summary: 2 PASS (AU tourist, AU student), 18 WARN
- Final verdict: "⚠️ LAUNCH READY (with warnings)"

### Step 2: Generate Coverage Report

```powershell
npm run coverage:report
```

**Expected Output:**

- Generates `VISA_RULES_COVERAGE.md` with detailed status
- Shows which combinations have rulesets, which need approval, which are missing

### Step 3: Sync Embassy Sources (For Missing 18 Combinations)

**Option A: Sync all active sources**

```powershell
npm run embassy:sync
```

**Option B: Sync specific country/visaType (recommended - do one at a time)**

```powershell
npm run embassy:sync -- US tourist
npm run embassy:sync -- US student
npm run embassy:sync -- CA tourist
npm run embassy:sync -- CA student
# ... repeat for GB, DE, FR, ES, IT, JP, AE (both tourist and student)
```

**Option C: Sync by source ID (if you know the ID)**

```powershell
npm run embassy:sync -- --source-id <sourceId>
```

**Expected Output:**

- "✅ Enqueued sync job for [country] [visaType]: [source name]"
- Queue statistics (waiting, active, completed, failed)
- **Note:** Jobs run in background via Bull queue. Check Railway logs or queue dashboard to see progress.

### Step 4: Review Extracted Rulesets

After sync jobs complete (check Railway logs), review each extracted ruleset:

```powershell
npm run approve:visarules -- US tourist
npm run approve:visarules -- US student
# ... repeat for all combinations that now have rulesets
```

**Expected Output:**

- Ruleset summary (country, visa type, version, ID, approval status)
- Required documents list with descriptions
- Financial requirements (if present)
- "⚠️ DRY RUN - No changes made" message

### Step 5: Approve Rulesets (After Review)

If the ruleset looks good, approve it:

```powershell
npm run approve:visarules -- US tourist --approve
npm run approve:visarules -- US student --approve
# ... repeat for all combinations you want to approve
```

**Expected Output:**

- "⚠️ APPROVING RULESET..."
- "✅ Ruleset approved successfully!"
- "Version X is now active for [country] [visaType]"

### Step 6: Verify Launch Readiness (After Approvals)

```powershell
npm run check:launch-readiness
```

**Expected Output (Target):**

- All 20 combinations show ✅ PASS
- Final verdict: "✅ LAUNCH READY: All combinations are fully configured!"

---

## 📋 Complete Workflow Example

Here's the exact sequence to sync and approve all 18 missing combinations:

```powershell
# 1. Check current status
cd apps/backend
npm run check:launch-readiness

# 2. Sync all missing combinations (one at a time, or use a loop)
npm run embassy:sync -- US tourist
npm run embassy:sync -- US student
npm run embassy:sync -- CA tourist
npm run embassy:sync -- CA student
npm run embassy:sync -- GB tourist
npm run embassy:sync -- GB student
npm run embassy:sync -- DE tourist
npm run embassy:sync -- DE student
npm run embassy:sync -- FR tourist
npm run embassy:sync -- FR student
npm run embassy:sync -- ES tourist
npm run embassy:sync -- ES student
npm run embassy:sync -- IT tourist
npm run embassy:sync -- IT student
npm run embassy:sync -- JP tourist
npm run embassy:sync -- JP student
npm run embassy:sync -- AE tourist
npm run embassy:sync -- AE student

# 3. Wait for sync jobs to complete (check Railway logs/dashboard)
# Then review each ruleset:
npm run approve:visarules -- US tourist
npm run approve:visarules -- US student
# ... (review all 18)

# 4. If rulesets look good, approve them:
npm run approve:visarules -- US tourist --approve
npm run approve:visarules -- US student --approve
# ... (approve all 18)

# 5. Final verification:
npm run check:launch-readiness
```

---

## ✅ Safety Checks

### Database

- ✅ All scripts use `PrismaClient` which auto-selects Postgres when `DATABASE_URL` contains `postgresql://`
- ✅ `schema-selector.js` automatically copies `schema.postgresql.prisma` to `schema.prisma` when Postgres is detected
- ✅ No SQLite-specific code in any script

### Imports

- ✅ `run-embassy-sync.ts`: Fixed - removed logger imports, uses console.log
- ✅ `approve-visarules.ts`: Uses PrismaClient directly, no problematic imports
- ✅ `check-launch-readiness.ts`: Uses PrismaClient directly, no problematic imports
- ✅ `visa-coverage-report.ts`: Uses PrismaClient directly, no problematic imports

### Country List

- ✅ All scripts use exactly 10 countries: US, CA, GB, AU, DE, FR, ES, IT, JP, AE
- ✅ No NZ, KR, PL in any script
- ✅ 20 combinations total (10 × 2 visa types)

### Approval Safety

- ✅ Preview mode (without `--approve`) is safe - no changes made
- ✅ Approval mode unapproves other versions before approving new one
- ✅ Clear output shows what will happen before approval

---

## 🔧 Small Fixes Applied

1. **`run-embassy-sync.ts`**: Removed logger imports, replaced with console.log to prevent TypeScript errors in CLI context
2. **`document-validation.service.ts`**: Already fixed - uses `User.bio` instead of non-existent `questionnaireData` field
3. **`logger.ts`**: Added `userId` to Express Request interface to fix TypeScript errors
4. **`scripts/tsconfig.json`**: Added `skipLibCheck: true` for better CLI compatibility

---

## 📊 Current Production Status

- **VisaRuleSet Coverage:** 2/20 approved (AU tourist, AU student)
- **EmbassySource Coverage:** 20/20 (all combinations have sources)
- **VisaType Coverage:** 20/20 (all combinations have visa types)
- **Next Steps:** Sync + approve remaining 18 combinations

---

## ✅ Final Verification

All scripts are:

- ✅ **Production-ready** - Work with Railway Postgres
- ✅ **Safe to run** - Preview modes, clear output, no destructive operations without explicit flags
- ✅ **Correctly configured** - Handle 10 countries × 2 visa types
- ✅ **No breaking imports** - All scripts can run as CLI tools
- ✅ **Well-documented** - Clear usage instructions and output

---

**Status:** ✅ **PHASE 2 TECH VERIFICATION COMPLETE - READY FOR PRODUCTION USE**

**Date:** 2025-12-04  
**Status:** ✅ **VERIFIED & READY FOR PRODUCTION**

---

## Executive Summary

All Phase 1 scripts and services have been verified and are production-ready. All 4 scripts work correctly with Railway Postgres, handle the 10 countries × 2 visa types correctly, and are safe to run in production.

---

## ✅ Verification Results

### 1. Scripts Verified

#### ✅ `coverage:report` - **WORKING**

- **File:** `apps/backend/scripts/visa-coverage-report.ts`
- **Countries:** 10 countries (US, CA, GB, AU, DE, FR, ES, IT, JP, AE) - ✅ Correct
- **Visa Types:** tourist, student - ✅ Correct
- **Database:** Uses PrismaClient directly, auto-selects Postgres via schema-selector.js - ✅ Correct
- **Output:** Generates `VISA_RULES_COVERAGE.md` with detailed status - ✅ Working
- **No problematic imports** - ✅ Safe

#### ✅ `embassy:sync` - **WORKING** (Fixed TypeScript errors)

- **File:** `apps/backend/scripts/run-embassy-sync.ts`
- **Fixes Applied:**
  1. Removed logger imports, using console.log instead (prevents TypeScript errors in CLI)
  2. Added REDIS_URL check with clear error message
  3. Fixed logger.ts TypeScript types (added userId to Request interface)
- **Three Usage Modes:**
  1. `npm run embassy:sync` → Syncs all active sources - ✅ Working (requires REDIS_URL)
  2. `npm run embassy:sync -- US tourist` → Syncs specific country/visaType - ✅ Working
  3. `npm run embassy:sync -- --source-id <id>` → Syncs specific source by ID - ✅ Working
- **Database:** Uses PrismaClient, auto-selects Postgres - ✅ Correct
- **Queue:** Uses Bull queue with Redis (requires REDIS_URL) - ✅ Correct
- **Countries:** Handles all 10 countries correctly - ✅ Correct
- **Note:** Script will fail with clear error if REDIS_URL is not set (expected behavior)

#### ✅ `approve:visarules` - **WORKING**

- **File:** `apps/backend/scripts/approve-visarules.ts`
- **Preview Mode:** `npm run approve:visarules -- AU tourist` - ✅ Working
  - Shows ruleset summary, document list, financial requirements
  - Clear, human-readable output
  - Safe (no changes made)
- **Approve Mode:** `npm run approve:visarules -- AU tourist --approve` - ✅ Working
  - Unapproves all other versions for that country/visaType
  - Sets `isApproved = true` on latest version
  - Sets `approvedAt` and `approvedBy = 'system'`
- **Database:** Uses PrismaClient directly, no problematic imports - ✅ Correct
- **Output:** Clean, reviewable format - ✅ Good

#### ✅ `check:launch-readiness` - **WORKING**

- **File:** `apps/backend/scripts/check-launch-readiness.ts`
- **Countries:** 10 countries (US, CA, GB, AU, DE, FR, ES, IT, JP, AE) - ✅ Correct
- **Visa Types:** tourist, student (20 combinations) - ✅ Correct
- **Database:** Uses PrismaClient directly, auto-selects Postgres - ✅ Correct
- **Checks:**
  - VisaType existence - ✅
  - VisaRuleSet existence - ✅
  - Approval status - ✅
  - EmbassySource existence - ✅
- **Output:** PASS/WARN/FAIL table + summary + final verdict - ✅ Working
- **Current Status:** 2 PASS (AU tourist, AU student), 18 WARN (need rulesets)

### 2. Services Verified

#### ✅ `document-checklist.service.ts` - **VERIFIED**

- ✅ `normalizeVisaType()` helper exists and is used
- ✅ Cache invalidation: checks for approved ruleset even when cached checklist exists
- ✅ Mode logging: `[Checklist][Mode] Using RULES mode` / `[Checklist][Mode] Using LEGACY mode`
- ✅ Uses Postgres via PrismaClient
- ✅ Handles 10 countries × 2 visa types correctly

#### ✅ `document-validation.service.ts` - **VERIFIED** (Fixed)

- ✅ Loads VisaRuleSet via `VisaRulesService.getActiveRuleSet()`
- ✅ Loads ApplicantProfile from `User.bio` (questionnaire data)
- ✅ Passes both to validation prompt
- ✅ Uses Postgres via PrismaClient
- ✅ Fixed: No longer tries to access non-existent `questionnaireData` field

#### ✅ `checklist-rate-limit.ts` - **VERIFIED**

- ✅ User-based rate limiting (20 checklists/day, 50 validations/day)
- ✅ Uses Redis with fallback to in-memory
- ✅ No problematic imports for CLI usage

### 3. Package.json Scripts - **VERIFIED**

All 4 scripts are correctly defined:

```json
"coverage:report": "node prisma/schema-selector.js && prisma generate && ts-node --project scripts/tsconfig.json scripts/visa-coverage-report.ts"
"embassy:sync": "node prisma/schema-selector.js && prisma generate && ts-node --project scripts/tsconfig.json scripts/run-embassy-sync.ts"
"approve:visarules": "node prisma/schema-selector.js && prisma generate && ts-node --project scripts/tsconfig.json scripts/approve-visarules.ts"
"check:launch-readiness": "node prisma/schema-selector.js && prisma generate && ts-node --project scripts/tsconfig.json scripts/check-launch-readiness.ts"
```

✅ All scripts:

- Run `schema-selector.js` first (auto-selects Postgres when DATABASE_URL is postgresql://)
- Generate Prisma client
- Run with ts-node using scripts/tsconfig.json

---

## 🚀 Commands to Run (In Order)

### Prerequisites

- Ensure `DATABASE_URL` is set to Railway Postgres:

  ```powershell
  # Public URL (for local/remote access)
  $env:DATABASE_URL="postgresql://postgres:ozolgfntMPMGTFZgWTIiqmoaqIKQetVx@gondola.proxy.rlwy.net:31433/railway"

  # OR internal URL (if running from within Railway network)
  # $env:DATABASE_URL="postgresql://postgres:ozolgfntMPMGTFZgWTIiqmoaqIKQetVx@postgres.railway.internal:5432/railway"
  ```

  **Note:** If you get "Can't reach database server" errors, the database might not be accessible from your local network. See `RAILWAY_SCRIPT_EXECUTION_GUIDE.md` for solutions.

- Ensure `REDIS_URL` is set (for embassy sync queue - required for `embassy:sync`):

  ```powershell
  # Use public URL for local/remote access
  $env:REDIS_URL="redis://default:cSzxbqwnZUiPjWQCsMaZGWLXJpLvLXXH@turntable.proxy.rlwy.net:12571"

  # OR use internal URL if running from within Railway network
  # $env:REDIS_URL="redis://default:cSzxbqwnZUiPjWQCsMaZGWLXJpLvLXXH@redis.railway.internal:6379"
  ```

  **Note:** If REDIS_URL is not set, `embassy:sync` will fail with a clear error message. This is expected - the Bull queue requires Redis.

### Step 1: Check Current Status

```powershell
cd apps/backend
npm run check:launch-readiness
```

**Expected Output:**

- Table showing PASS/WARN/FAIL for each of 20 combinations
- Summary: 2 PASS (AU tourist, AU student), 18 WARN
- Final verdict: "⚠️ LAUNCH READY (with warnings)"

### Step 2: Generate Coverage Report

```powershell
npm run coverage:report
```

**Expected Output:**

- Generates `VISA_RULES_COVERAGE.md` with detailed status
- Shows which combinations have rulesets, which need approval, which are missing

### Step 3: Sync Embassy Sources (For Missing 18 Combinations)

**Option A: Sync all active sources**

```powershell
npm run embassy:sync
```

**Option B: Sync specific country/visaType (recommended - do one at a time)**

```powershell
npm run embassy:sync -- US tourist
npm run embassy:sync -- US student
npm run embassy:sync -- CA tourist
npm run embassy:sync -- CA student
# ... repeat for GB, DE, FR, ES, IT, JP, AE (both tourist and student)
```

**Option C: Sync by source ID (if you know the ID)**

```powershell
npm run embassy:sync -- --source-id <sourceId>
```

**Expected Output:**

- "✅ Enqueued sync job for [country] [visaType]: [source name]"
- Queue statistics (waiting, active, completed, failed)
- **Note:** Jobs run in background via Bull queue. Check Railway logs or queue dashboard to see progress.

### Step 4: Review Extracted Rulesets

After sync jobs complete (check Railway logs), review each extracted ruleset:

```powershell
npm run approve:visarules -- US tourist
npm run approve:visarules -- US student
# ... repeat for all combinations that now have rulesets
```

**Expected Output:**

- Ruleset summary (country, visa type, version, ID, approval status)
- Required documents list with descriptions
- Financial requirements (if present)
- "⚠️ DRY RUN - No changes made" message

### Step 5: Approve Rulesets (After Review)

If the ruleset looks good, approve it:

```powershell
npm run approve:visarules -- US tourist --approve
npm run approve:visarules -- US student --approve
# ... repeat for all combinations you want to approve
```

**Expected Output:**

- "⚠️ APPROVING RULESET..."
- "✅ Ruleset approved successfully!"
- "Version X is now active for [country] [visaType]"

### Step 6: Verify Launch Readiness (After Approvals)

```powershell
npm run check:launch-readiness
```

**Expected Output (Target):**

- All 20 combinations show ✅ PASS
- Final verdict: "✅ LAUNCH READY: All combinations are fully configured!"

---

## 📋 Complete Workflow Example

Here's the exact sequence to sync and approve all 18 missing combinations:

```powershell
# 1. Check current status
cd apps/backend
npm run check:launch-readiness

# 2. Sync all missing combinations (one at a time, or use a loop)
npm run embassy:sync -- US tourist
npm run embassy:sync -- US student
npm run embassy:sync -- CA tourist
npm run embassy:sync -- CA student
npm run embassy:sync -- GB tourist
npm run embassy:sync -- GB student
npm run embassy:sync -- DE tourist
npm run embassy:sync -- DE student
npm run embassy:sync -- FR tourist
npm run embassy:sync -- FR student
npm run embassy:sync -- ES tourist
npm run embassy:sync -- ES student
npm run embassy:sync -- IT tourist
npm run embassy:sync -- IT student
npm run embassy:sync -- JP tourist
npm run embassy:sync -- JP student
npm run embassy:sync -- AE tourist
npm run embassy:sync -- AE student

# 3. Wait for sync jobs to complete (check Railway logs/dashboard)
# Then review each ruleset:
npm run approve:visarules -- US tourist
npm run approve:visarules -- US student
# ... (review all 18)

# 4. If rulesets look good, approve them:
npm run approve:visarules -- US tourist --approve
npm run approve:visarules -- US student --approve
# ... (approve all 18)

# 5. Final verification:
npm run check:launch-readiness
```

---

## ✅ Safety Checks

### Database

- ✅ All scripts use `PrismaClient` which auto-selects Postgres when `DATABASE_URL` contains `postgresql://`
- ✅ `schema-selector.js` automatically copies `schema.postgresql.prisma` to `schema.prisma` when Postgres is detected
- ✅ No SQLite-specific code in any script

### Imports

- ✅ `run-embassy-sync.ts`: Fixed - removed logger imports, uses console.log
- ✅ `approve-visarules.ts`: Uses PrismaClient directly, no problematic imports
- ✅ `check-launch-readiness.ts`: Uses PrismaClient directly, no problematic imports
- ✅ `visa-coverage-report.ts`: Uses PrismaClient directly, no problematic imports

### Country List

- ✅ All scripts use exactly 10 countries: US, CA, GB, AU, DE, FR, ES, IT, JP, AE
- ✅ No NZ, KR, PL in any script
- ✅ 20 combinations total (10 × 2 visa types)

### Approval Safety

- ✅ Preview mode (without `--approve`) is safe - no changes made
- ✅ Approval mode unapproves other versions before approving new one
- ✅ Clear output shows what will happen before approval

---

## 🔧 Small Fixes Applied

1. **`run-embassy-sync.ts`**: Removed logger imports, replaced with console.log to prevent TypeScript errors in CLI context
2. **`document-validation.service.ts`**: Already fixed - uses `User.bio` instead of non-existent `questionnaireData` field
3. **`logger.ts`**: Added `userId` to Express Request interface to fix TypeScript errors
4. **`scripts/tsconfig.json`**: Added `skipLibCheck: true` for better CLI compatibility

---

## 📊 Current Production Status

- **VisaRuleSet Coverage:** 2/20 approved (AU tourist, AU student)
- **EmbassySource Coverage:** 20/20 (all combinations have sources)
- **VisaType Coverage:** 20/20 (all combinations have visa types)
- **Next Steps:** Sync + approve remaining 18 combinations

---

## ✅ Final Verification

All scripts are:

- ✅ **Production-ready** - Work with Railway Postgres
- ✅ **Safe to run** - Preview modes, clear output, no destructive operations without explicit flags
- ✅ **Correctly configured** - Handle 10 countries × 2 visa types
- ✅ **No breaking imports** - All scripts can run as CLI tools
- ✅ **Well-documented** - Clear usage instructions and output

---

**Status:** ✅ **PHASE 2 TECH VERIFICATION COMPLETE - READY FOR PRODUCTION USE**

**Date:** 2025-12-04  
**Status:** ✅ **VERIFIED & READY FOR PRODUCTION**

---

## Executive Summary

All Phase 1 scripts and services have been verified and are production-ready. All 4 scripts work correctly with Railway Postgres, handle the 10 countries × 2 visa types correctly, and are safe to run in production.

---

## ✅ Verification Results

### 1. Scripts Verified

#### ✅ `coverage:report` - **WORKING**

- **File:** `apps/backend/scripts/visa-coverage-report.ts`
- **Countries:** 10 countries (US, CA, GB, AU, DE, FR, ES, IT, JP, AE) - ✅ Correct
- **Visa Types:** tourist, student - ✅ Correct
- **Database:** Uses PrismaClient directly, auto-selects Postgres via schema-selector.js - ✅ Correct
- **Output:** Generates `VISA_RULES_COVERAGE.md` with detailed status - ✅ Working
- **No problematic imports** - ✅ Safe

#### ✅ `embassy:sync` - **WORKING** (Fixed TypeScript errors)

- **File:** `apps/backend/scripts/run-embassy-sync.ts`
- **Fixes Applied:**
  1. Removed logger imports, using console.log instead (prevents TypeScript errors in CLI)
  2. Added REDIS_URL check with clear error message
  3. Fixed logger.ts TypeScript types (added userId to Request interface)
- **Three Usage Modes:**
  1. `npm run embassy:sync` → Syncs all active sources - ✅ Working (requires REDIS_URL)
  2. `npm run embassy:sync -- US tourist` → Syncs specific country/visaType - ✅ Working
  3. `npm run embassy:sync -- --source-id <id>` → Syncs specific source by ID - ✅ Working
- **Database:** Uses PrismaClient, auto-selects Postgres - ✅ Correct
- **Queue:** Uses Bull queue with Redis (requires REDIS_URL) - ✅ Correct
- **Countries:** Handles all 10 countries correctly - ✅ Correct
- **Note:** Script will fail with clear error if REDIS_URL is not set (expected behavior)

#### ✅ `approve:visarules` - **WORKING**

- **File:** `apps/backend/scripts/approve-visarules.ts`
- **Preview Mode:** `npm run approve:visarules -- AU tourist` - ✅ Working
  - Shows ruleset summary, document list, financial requirements
  - Clear, human-readable output
  - Safe (no changes made)
- **Approve Mode:** `npm run approve:visarules -- AU tourist --approve` - ✅ Working
  - Unapproves all other versions for that country/visaType
  - Sets `isApproved = true` on latest version
  - Sets `approvedAt` and `approvedBy = 'system'`
- **Database:** Uses PrismaClient directly, no problematic imports - ✅ Correct
- **Output:** Clean, reviewable format - ✅ Good

#### ✅ `check:launch-readiness` - **WORKING**

- **File:** `apps/backend/scripts/check-launch-readiness.ts`
- **Countries:** 10 countries (US, CA, GB, AU, DE, FR, ES, IT, JP, AE) - ✅ Correct
- **Visa Types:** tourist, student (20 combinations) - ✅ Correct
- **Database:** Uses PrismaClient directly, auto-selects Postgres - ✅ Correct
- **Checks:**
  - VisaType existence - ✅
  - VisaRuleSet existence - ✅
  - Approval status - ✅
  - EmbassySource existence - ✅
- **Output:** PASS/WARN/FAIL table + summary + final verdict - ✅ Working
- **Current Status:** 2 PASS (AU tourist, AU student), 18 WARN (need rulesets)

### 2. Services Verified

#### ✅ `document-checklist.service.ts` - **VERIFIED**

- ✅ `normalizeVisaType()` helper exists and is used
- ✅ Cache invalidation: checks for approved ruleset even when cached checklist exists
- ✅ Mode logging: `[Checklist][Mode] Using RULES mode` / `[Checklist][Mode] Using LEGACY mode`
- ✅ Uses Postgres via PrismaClient
- ✅ Handles 10 countries × 2 visa types correctly

#### ✅ `document-validation.service.ts` - **VERIFIED** (Fixed)

- ✅ Loads VisaRuleSet via `VisaRulesService.getActiveRuleSet()`
- ✅ Loads ApplicantProfile from `User.bio` (questionnaire data)
- ✅ Passes both to validation prompt
- ✅ Uses Postgres via PrismaClient
- ✅ Fixed: No longer tries to access non-existent `questionnaireData` field

#### ✅ `checklist-rate-limit.ts` - **VERIFIED**

- ✅ User-based rate limiting (20 checklists/day, 50 validations/day)
- ✅ Uses Redis with fallback to in-memory
- ✅ No problematic imports for CLI usage

### 3. Package.json Scripts - **VERIFIED**

All 4 scripts are correctly defined:

```json
"coverage:report": "node prisma/schema-selector.js && prisma generate && ts-node --project scripts/tsconfig.json scripts/visa-coverage-report.ts"
"embassy:sync": "node prisma/schema-selector.js && prisma generate && ts-node --project scripts/tsconfig.json scripts/run-embassy-sync.ts"
"approve:visarules": "node prisma/schema-selector.js && prisma generate && ts-node --project scripts/tsconfig.json scripts/approve-visarules.ts"
"check:launch-readiness": "node prisma/schema-selector.js && prisma generate && ts-node --project scripts/tsconfig.json scripts/check-launch-readiness.ts"
```

✅ All scripts:

- Run `schema-selector.js` first (auto-selects Postgres when DATABASE_URL is postgresql://)
- Generate Prisma client
- Run with ts-node using scripts/tsconfig.json

---

## 🚀 Commands to Run (In Order)

### Prerequisites

- Ensure `DATABASE_URL` is set to Railway Postgres:

  ```powershell
  # Public URL (for local/remote access)
  $env:DATABASE_URL="postgresql://postgres:ozolgfntMPMGTFZgWTIiqmoaqIKQetVx@gondola.proxy.rlwy.net:31433/railway"

  # OR internal URL (if running from within Railway network)
  # $env:DATABASE_URL="postgresql://postgres:ozolgfntMPMGTFZgWTIiqmoaqIKQetVx@postgres.railway.internal:5432/railway"
  ```

  **Note:** If you get "Can't reach database server" errors, the database might not be accessible from your local network. See `RAILWAY_SCRIPT_EXECUTION_GUIDE.md` for solutions.

- Ensure `REDIS_URL` is set (for embassy sync queue - required for `embassy:sync`):

  ```powershell
  # Use public URL for local/remote access
  $env:REDIS_URL="redis://default:cSzxbqwnZUiPjWQCsMaZGWLXJpLvLXXH@turntable.proxy.rlwy.net:12571"

  # OR use internal URL if running from within Railway network
  # $env:REDIS_URL="redis://default:cSzxbqwnZUiPjWQCsMaZGWLXJpLvLXXH@redis.railway.internal:6379"
  ```

  **Note:** If REDIS_URL is not set, `embassy:sync` will fail with a clear error message. This is expected - the Bull queue requires Redis.

### Step 1: Check Current Status

```powershell
cd apps/backend
npm run check:launch-readiness
```

**Expected Output:**

- Table showing PASS/WARN/FAIL for each of 20 combinations
- Summary: 2 PASS (AU tourist, AU student), 18 WARN
- Final verdict: "⚠️ LAUNCH READY (with warnings)"

### Step 2: Generate Coverage Report

```powershell
npm run coverage:report
```

**Expected Output:**

- Generates `VISA_RULES_COVERAGE.md` with detailed status
- Shows which combinations have rulesets, which need approval, which are missing

### Step 3: Sync Embassy Sources (For Missing 18 Combinations)

**Option A: Sync all active sources**

```powershell
npm run embassy:sync
```

**Option B: Sync specific country/visaType (recommended - do one at a time)**

```powershell
npm run embassy:sync -- US tourist
npm run embassy:sync -- US student
npm run embassy:sync -- CA tourist
npm run embassy:sync -- CA student
# ... repeat for GB, DE, FR, ES, IT, JP, AE (both tourist and student)
```

**Option C: Sync by source ID (if you know the ID)**

```powershell
npm run embassy:sync -- --source-id <sourceId>
```

**Expected Output:**

- "✅ Enqueued sync job for [country] [visaType]: [source name]"
- Queue statistics (waiting, active, completed, failed)
- **Note:** Jobs run in background via Bull queue. Check Railway logs or queue dashboard to see progress.

### Step 4: Review Extracted Rulesets

After sync jobs complete (check Railway logs), review each extracted ruleset:

```powershell
npm run approve:visarules -- US tourist
npm run approve:visarules -- US student
# ... repeat for all combinations that now have rulesets
```

**Expected Output:**

- Ruleset summary (country, visa type, version, ID, approval status)
- Required documents list with descriptions
- Financial requirements (if present)
- "⚠️ DRY RUN - No changes made" message

### Step 5: Approve Rulesets (After Review)

If the ruleset looks good, approve it:

```powershell
npm run approve:visarules -- US tourist --approve
npm run approve:visarules -- US student --approve
# ... repeat for all combinations you want to approve
```

**Expected Output:**

- "⚠️ APPROVING RULESET..."
- "✅ Ruleset approved successfully!"
- "Version X is now active for [country] [visaType]"

### Step 6: Verify Launch Readiness (After Approvals)

```powershell
npm run check:launch-readiness
```

**Expected Output (Target):**

- All 20 combinations show ✅ PASS
- Final verdict: "✅ LAUNCH READY: All combinations are fully configured!"

---

## 📋 Complete Workflow Example

Here's the exact sequence to sync and approve all 18 missing combinations:

```powershell
# 1. Check current status
cd apps/backend
npm run check:launch-readiness

# 2. Sync all missing combinations (one at a time, or use a loop)
npm run embassy:sync -- US tourist
npm run embassy:sync -- US student
npm run embassy:sync -- CA tourist
npm run embassy:sync -- CA student
npm run embassy:sync -- GB tourist
npm run embassy:sync -- GB student
npm run embassy:sync -- DE tourist
npm run embassy:sync -- DE student
npm run embassy:sync -- FR tourist
npm run embassy:sync -- FR student
npm run embassy:sync -- ES tourist
npm run embassy:sync -- ES student
npm run embassy:sync -- IT tourist
npm run embassy:sync -- IT student
npm run embassy:sync -- JP tourist
npm run embassy:sync -- JP student
npm run embassy:sync -- AE tourist
npm run embassy:sync -- AE student

# 3. Wait for sync jobs to complete (check Railway logs/dashboard)
# Then review each ruleset:
npm run approve:visarules -- US tourist
npm run approve:visarules -- US student
# ... (review all 18)

# 4. If rulesets look good, approve them:
npm run approve:visarules -- US tourist --approve
npm run approve:visarules -- US student --approve
# ... (approve all 18)

# 5. Final verification:
npm run check:launch-readiness
```

---

## ✅ Safety Checks

### Database

- ✅ All scripts use `PrismaClient` which auto-selects Postgres when `DATABASE_URL` contains `postgresql://`
- ✅ `schema-selector.js` automatically copies `schema.postgresql.prisma` to `schema.prisma` when Postgres is detected
- ✅ No SQLite-specific code in any script

### Imports

- ✅ `run-embassy-sync.ts`: Fixed - removed logger imports, uses console.log
- ✅ `approve-visarules.ts`: Uses PrismaClient directly, no problematic imports
- ✅ `check-launch-readiness.ts`: Uses PrismaClient directly, no problematic imports
- ✅ `visa-coverage-report.ts`: Uses PrismaClient directly, no problematic imports

### Country List

- ✅ All scripts use exactly 10 countries: US, CA, GB, AU, DE, FR, ES, IT, JP, AE
- ✅ No NZ, KR, PL in any script
- ✅ 20 combinations total (10 × 2 visa types)

### Approval Safety

- ✅ Preview mode (without `--approve`) is safe - no changes made
- ✅ Approval mode unapproves other versions before approving new one
- ✅ Clear output shows what will happen before approval

---

## 🔧 Small Fixes Applied

1. **`run-embassy-sync.ts`**: Removed logger imports, replaced with console.log to prevent TypeScript errors in CLI context
2. **`document-validation.service.ts`**: Already fixed - uses `User.bio` instead of non-existent `questionnaireData` field
3. **`logger.ts`**: Added `userId` to Express Request interface to fix TypeScript errors
4. **`scripts/tsconfig.json`**: Added `skipLibCheck: true` for better CLI compatibility

---

## 📊 Current Production Status

- **VisaRuleSet Coverage:** 2/20 approved (AU tourist, AU student)
- **EmbassySource Coverage:** 20/20 (all combinations have sources)
- **VisaType Coverage:** 20/20 (all combinations have visa types)
- **Next Steps:** Sync + approve remaining 18 combinations

---

## ✅ Final Verification

All scripts are:

- ✅ **Production-ready** - Work with Railway Postgres
- ✅ **Safe to run** - Preview modes, clear output, no destructive operations without explicit flags
- ✅ **Correctly configured** - Handle 10 countries × 2 visa types
- ✅ **No breaking imports** - All scripts can run as CLI tools
- ✅ **Well-documented** - Clear usage instructions and output

---

**Status:** ✅ **PHASE 2 TECH VERIFICATION COMPLETE - READY FOR PRODUCTION USE**
