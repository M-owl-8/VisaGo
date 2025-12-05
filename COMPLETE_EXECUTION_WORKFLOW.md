# Complete Execution Workflow - Phase 1 Scripts

**Date:** 2025-12-04  
**Purpose:** Step-by-step guide to execute all Phase 1 scripts with Railway Postgres + Redis

---

## ⚠️ Prerequisites: Database Connectivity

**Current Issue:** Database at `gondola.proxy.rlwy.net:31433` is not reachable from local machine.

**Solutions:**

1. **Verify Database is Running** - Check Railway dashboard
2. **Try SSL Connection** - Add `?sslmode=require` to DATABASE_URL
3. **Check Firewall** - Ensure port 31433 is not blocked
4. **Use Railway CLI** - Run from Railway environment (bypasses network issues)

---

## 📋 Complete Workflow (When DB is Accessible)

### Step 1: Set Environment Variables

```powershell
cd C:\work\VisaBuddy

# Database (Public URL from Railway)
$env:DATABASE_URL="postgresql://postgres:ozolgfntMPMGTFZgWTIiqmoaqIKQetVx@gondola.proxy.rlwy.net:31433/railway"

# Redis (Public URL from Railway)
$env:REDIS_URL="redis://default:cSzxbqwnZUiPjWQCsMaZGWLXJpLvLXXH@turntable.proxy.rlwy.net:12571"

# Verify they're set
Write-Output "DATABASE_URL: $env:DATABASE_URL"
Write-Output "REDIS_URL: $env:REDIS_URL"
```

### Step 2: Check Current Status

```powershell
cd apps/backend
npm run check:launch-readiness
```

**Expected Output:**

- Table showing 20 combinations
- 2 PASS (AU tourist, AU student)
- 18 WARN (need rulesets)

### Step 3: Generate Coverage Report

```powershell
npm run coverage:report
```

**Expected Output:**

- Generates `VISA_RULES_COVERAGE.md`
- Shows detailed status for all 20 combinations

### Step 4: Sync Embassy Sources (All 18 Missing)

**Option A: Sync All at Once**

```powershell
npm run embassy:sync
```

**Option B: Sync One at a Time (Recommended for Debugging)**

```powershell
# US
npm run embassy:sync -- US tourist
npm run embassy:sync -- US student

# CA
npm run embassy:sync -- CA tourist
npm run embassy:sync -- CA student

# GB
npm run embassy:sync -- GB tourist
npm run embassy:sync -- GB student

# DE
npm run embassy:sync -- DE tourist
npm run embassy:sync -- DE student

# FR
npm run embassy:sync -- FR tourist
npm run embassy:sync -- FR student

# ES
npm run embassy:sync -- ES tourist
npm run embassy:sync -- ES student

# IT
npm run embassy:sync -- IT tourist
npm run embassy:sync -- IT student

# JP
npm run embassy:sync -- JP tourist
npm run embassy:sync -- JP student

# AE
npm run embassy:sync -- AE tourist
npm run embassy:sync -- AE student
```

**Expected Output:**

- "✅ Enqueued sync job for [country] [visaType]"
- Queue statistics
- Jobs will process in background via Bull queue

**Note:** Jobs run asynchronously. Check Railway logs or wait a few minutes for processing.

### Step 5: Review Extracted Rulesets

After sync jobs complete, review each ruleset:

```powershell
# Preview (no changes made)
npm run approve:visarules -- US tourist
npm run approve:visarules -- US student
npm run approve:visarules -- CA tourist
npm run approve:visarules -- CA student
# ... repeat for all 18 combinations
```

**Expected Output:**

- Ruleset summary (country, visa type, version, ID)
- Required documents list with descriptions
- Financial requirements (if present)
- "⚠️ DRY RUN - No changes made"

### Step 6: Approve Rulesets

If rulesets look good, approve them:

```powershell
# Approve (actually sets isApproved = true)
npm run approve:visarules -- US tourist --approve
npm run approve:visarules -- US student --approve
npm run approve:visarules -- CA tourist --approve
npm run approve:visarules -- CA student --approve
npm run approve:visarules -- GB tourist --approve
npm run approve:visarules -- GB student --approve
npm run approve:visarules -- DE tourist --approve
npm run approve:visarules -- DE student --approve
npm run approve:visarules -- FR tourist --approve
npm run approve:visarules -- FR student --approve
npm run approve:visarules -- ES tourist --approve
npm run approve:visarules -- ES student --approve
npm run approve:visarules -- IT tourist --approve
npm run approve:visarules -- IT student --approve
npm run approve:visarules -- JP tourist --approve
npm run approve:visarules -- JP student --approve
npm run approve:visarules -- AE tourist --approve
npm run approve:visarules -- AE student --approve
```

**Expected Output:**

- "⚠️ APPROVING RULESET..."
- "✅ Ruleset approved successfully!"
- "Version X is now active for [country] [visaType]"

### Step 7: Final Verification

```powershell
npm run check:launch-readiness
```

**Target Output:**

- All 20 combinations show ✅ PASS
- Final verdict: "✅ LAUNCH READY: All combinations are fully configured!"

---

## 🔧 Troubleshooting Database Connection

### Try SSL Mode

```powershell
$env:DATABASE_URL="postgresql://postgres:ozolgfntMPMGTFZgWTIiqmoaqIKQetVx@gondola.proxy.rlwy.net:31433/railway?sslmode=require"
```

### Verify Database is Running

1. Go to Railway dashboard
2. Check Postgres service status
3. Verify the public URL hasn't changed
4. Check if database is paused/stopped

### Use Railway CLI (Bypasses Network Issues)

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and link
railway login
railway link

# Run scripts (uses Railway's network)
railway run npm run check:launch-readiness
railway run npm run embassy:sync
```

---

## 📊 Expected Timeline

- **Sync Jobs:** 2-5 minutes per combination (20 combinations = ~40-100 minutes total)
- **Review:** 1-2 minutes per ruleset (18 rulesets = ~20-40 minutes)
- **Approval:** 30 seconds per ruleset (18 rulesets = ~10 minutes)

**Total Time:** ~1.5-2.5 hours for complete workflow

---

## ✅ Success Criteria

1. ✅ All 20 combinations have approved VisaRuleSet
2. ✅ `check:launch-readiness` shows all ✅ PASS
3. ✅ `coverage:report` shows 20/20 approved
4. ✅ Application checklists use RULES mode (not LEGACY)

---

**Status:** Workflow ready. Database connectivity must be resolved first.

**Date:** 2025-12-04  
**Purpose:** Step-by-step guide to execute all Phase 1 scripts with Railway Postgres + Redis

---

## ⚠️ Prerequisites: Database Connectivity

**Current Issue:** Database at `gondola.proxy.rlwy.net:31433` is not reachable from local machine.

**Solutions:**

1. **Verify Database is Running** - Check Railway dashboard
2. **Try SSL Connection** - Add `?sslmode=require` to DATABASE_URL
3. **Check Firewall** - Ensure port 31433 is not blocked
4. **Use Railway CLI** - Run from Railway environment (bypasses network issues)

---

## 📋 Complete Workflow (When DB is Accessible)

### Step 1: Set Environment Variables

```powershell
cd C:\work\VisaBuddy

# Database (Public URL from Railway)
$env:DATABASE_URL="postgresql://postgres:ozolgfntMPMGTFZgWTIiqmoaqIKQetVx@gondola.proxy.rlwy.net:31433/railway"

# Redis (Public URL from Railway)
$env:REDIS_URL="redis://default:cSzxbqwnZUiPjWQCsMaZGWLXJpLvLXXH@turntable.proxy.rlwy.net:12571"

# Verify they're set
Write-Output "DATABASE_URL: $env:DATABASE_URL"
Write-Output "REDIS_URL: $env:REDIS_URL"
```

### Step 2: Check Current Status

```powershell
cd apps/backend
npm run check:launch-readiness
```

**Expected Output:**

- Table showing 20 combinations
- 2 PASS (AU tourist, AU student)
- 18 WARN (need rulesets)

### Step 3: Generate Coverage Report

```powershell
npm run coverage:report
```

**Expected Output:**

- Generates `VISA_RULES_COVERAGE.md`
- Shows detailed status for all 20 combinations

### Step 4: Sync Embassy Sources (All 18 Missing)

**Option A: Sync All at Once**

```powershell
npm run embassy:sync
```

**Option B: Sync One at a Time (Recommended for Debugging)**

```powershell
# US
npm run embassy:sync -- US tourist
npm run embassy:sync -- US student

# CA
npm run embassy:sync -- CA tourist
npm run embassy:sync -- CA student

# GB
npm run embassy:sync -- GB tourist
npm run embassy:sync -- GB student

# DE
npm run embassy:sync -- DE tourist
npm run embassy:sync -- DE student

# FR
npm run embassy:sync -- FR tourist
npm run embassy:sync -- FR student

# ES
npm run embassy:sync -- ES tourist
npm run embassy:sync -- ES student

# IT
npm run embassy:sync -- IT tourist
npm run embassy:sync -- IT student

# JP
npm run embassy:sync -- JP tourist
npm run embassy:sync -- JP student

# AE
npm run embassy:sync -- AE tourist
npm run embassy:sync -- AE student
```

**Expected Output:**

- "✅ Enqueued sync job for [country] [visaType]"
- Queue statistics
- Jobs will process in background via Bull queue

**Note:** Jobs run asynchronously. Check Railway logs or wait a few minutes for processing.

### Step 5: Review Extracted Rulesets

After sync jobs complete, review each ruleset:

```powershell
# Preview (no changes made)
npm run approve:visarules -- US tourist
npm run approve:visarules -- US student
npm run approve:visarules -- CA tourist
npm run approve:visarules -- CA student
# ... repeat for all 18 combinations
```

**Expected Output:**

- Ruleset summary (country, visa type, version, ID)
- Required documents list with descriptions
- Financial requirements (if present)
- "⚠️ DRY RUN - No changes made"

### Step 6: Approve Rulesets

If rulesets look good, approve them:

```powershell
# Approve (actually sets isApproved = true)
npm run approve:visarules -- US tourist --approve
npm run approve:visarules -- US student --approve
npm run approve:visarules -- CA tourist --approve
npm run approve:visarules -- CA student --approve
npm run approve:visarules -- GB tourist --approve
npm run approve:visarules -- GB student --approve
npm run approve:visarules -- DE tourist --approve
npm run approve:visarules -- DE student --approve
npm run approve:visarules -- FR tourist --approve
npm run approve:visarules -- FR student --approve
npm run approve:visarules -- ES tourist --approve
npm run approve:visarules -- ES student --approve
npm run approve:visarules -- IT tourist --approve
npm run approve:visarules -- IT student --approve
npm run approve:visarules -- JP tourist --approve
npm run approve:visarules -- JP student --approve
npm run approve:visarules -- AE tourist --approve
npm run approve:visarules -- AE student --approve
```

**Expected Output:**

- "⚠️ APPROVING RULESET..."
- "✅ Ruleset approved successfully!"
- "Version X is now active for [country] [visaType]"

### Step 7: Final Verification

```powershell
npm run check:launch-readiness
```

**Target Output:**

- All 20 combinations show ✅ PASS
- Final verdict: "✅ LAUNCH READY: All combinations are fully configured!"

---

## 🔧 Troubleshooting Database Connection

### Try SSL Mode

```powershell
$env:DATABASE_URL="postgresql://postgres:ozolgfntMPMGTFZgWTIiqmoaqIKQetVx@gondola.proxy.rlwy.net:31433/railway?sslmode=require"
```

### Verify Database is Running

1. Go to Railway dashboard
2. Check Postgres service status
3. Verify the public URL hasn't changed
4. Check if database is paused/stopped

### Use Railway CLI (Bypasses Network Issues)

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and link
railway login
railway link

# Run scripts (uses Railway's network)
railway run npm run check:launch-readiness
railway run npm run embassy:sync
```

---

## 📊 Expected Timeline

- **Sync Jobs:** 2-5 minutes per combination (20 combinations = ~40-100 minutes total)
- **Review:** 1-2 minutes per ruleset (18 rulesets = ~20-40 minutes)
- **Approval:** 30 seconds per ruleset (18 rulesets = ~10 minutes)

**Total Time:** ~1.5-2.5 hours for complete workflow

---

## ✅ Success Criteria

1. ✅ All 20 combinations have approved VisaRuleSet
2. ✅ `check:launch-readiness` shows all ✅ PASS
3. ✅ `coverage:report` shows 20/20 approved
4. ✅ Application checklists use RULES mode (not LEGACY)

---

**Status:** Workflow ready. Database connectivity must be resolved first.

**Date:** 2025-12-04  
**Purpose:** Step-by-step guide to execute all Phase 1 scripts with Railway Postgres + Redis

---

## ⚠️ Prerequisites: Database Connectivity

**Current Issue:** Database at `gondola.proxy.rlwy.net:31433` is not reachable from local machine.

**Solutions:**

1. **Verify Database is Running** - Check Railway dashboard
2. **Try SSL Connection** - Add `?sslmode=require` to DATABASE_URL
3. **Check Firewall** - Ensure port 31433 is not blocked
4. **Use Railway CLI** - Run from Railway environment (bypasses network issues)

---

## 📋 Complete Workflow (When DB is Accessible)

### Step 1: Set Environment Variables

```powershell
cd C:\work\VisaBuddy

# Database (Public URL from Railway)
$env:DATABASE_URL="postgresql://postgres:ozolgfntMPMGTFZgWTIiqmoaqIKQetVx@gondola.proxy.rlwy.net:31433/railway"

# Redis (Public URL from Railway)
$env:REDIS_URL="redis://default:cSzxbqwnZUiPjWQCsMaZGWLXJpLvLXXH@turntable.proxy.rlwy.net:12571"

# Verify they're set
Write-Output "DATABASE_URL: $env:DATABASE_URL"
Write-Output "REDIS_URL: $env:REDIS_URL"
```

### Step 2: Check Current Status

```powershell
cd apps/backend
npm run check:launch-readiness
```

**Expected Output:**

- Table showing 20 combinations
- 2 PASS (AU tourist, AU student)
- 18 WARN (need rulesets)

### Step 3: Generate Coverage Report

```powershell
npm run coverage:report
```

**Expected Output:**

- Generates `VISA_RULES_COVERAGE.md`
- Shows detailed status for all 20 combinations

### Step 4: Sync Embassy Sources (All 18 Missing)

**Option A: Sync All at Once**

```powershell
npm run embassy:sync
```

**Option B: Sync One at a Time (Recommended for Debugging)**

```powershell
# US
npm run embassy:sync -- US tourist
npm run embassy:sync -- US student

# CA
npm run embassy:sync -- CA tourist
npm run embassy:sync -- CA student

# GB
npm run embassy:sync -- GB tourist
npm run embassy:sync -- GB student

# DE
npm run embassy:sync -- DE tourist
npm run embassy:sync -- DE student

# FR
npm run embassy:sync -- FR tourist
npm run embassy:sync -- FR student

# ES
npm run embassy:sync -- ES tourist
npm run embassy:sync -- ES student

# IT
npm run embassy:sync -- IT tourist
npm run embassy:sync -- IT student

# JP
npm run embassy:sync -- JP tourist
npm run embassy:sync -- JP student

# AE
npm run embassy:sync -- AE tourist
npm run embassy:sync -- AE student
```

**Expected Output:**

- "✅ Enqueued sync job for [country] [visaType]"
- Queue statistics
- Jobs will process in background via Bull queue

**Note:** Jobs run asynchronously. Check Railway logs or wait a few minutes for processing.

### Step 5: Review Extracted Rulesets

After sync jobs complete, review each ruleset:

```powershell
# Preview (no changes made)
npm run approve:visarules -- US tourist
npm run approve:visarules -- US student
npm run approve:visarules -- CA tourist
npm run approve:visarules -- CA student
# ... repeat for all 18 combinations
```

**Expected Output:**

- Ruleset summary (country, visa type, version, ID)
- Required documents list with descriptions
- Financial requirements (if present)
- "⚠️ DRY RUN - No changes made"

### Step 6: Approve Rulesets

If rulesets look good, approve them:

```powershell
# Approve (actually sets isApproved = true)
npm run approve:visarules -- US tourist --approve
npm run approve:visarules -- US student --approve
npm run approve:visarules -- CA tourist --approve
npm run approve:visarules -- CA student --approve
npm run approve:visarules -- GB tourist --approve
npm run approve:visarules -- GB student --approve
npm run approve:visarules -- DE tourist --approve
npm run approve:visarules -- DE student --approve
npm run approve:visarules -- FR tourist --approve
npm run approve:visarules -- FR student --approve
npm run approve:visarules -- ES tourist --approve
npm run approve:visarules -- ES student --approve
npm run approve:visarules -- IT tourist --approve
npm run approve:visarules -- IT student --approve
npm run approve:visarules -- JP tourist --approve
npm run approve:visarules -- JP student --approve
npm run approve:visarules -- AE tourist --approve
npm run approve:visarules -- AE student --approve
```

**Expected Output:**

- "⚠️ APPROVING RULESET..."
- "✅ Ruleset approved successfully!"
- "Version X is now active for [country] [visaType]"

### Step 7: Final Verification

```powershell
npm run check:launch-readiness
```

**Target Output:**

- All 20 combinations show ✅ PASS
- Final verdict: "✅ LAUNCH READY: All combinations are fully configured!"

---

## 🔧 Troubleshooting Database Connection

### Try SSL Mode

```powershell
$env:DATABASE_URL="postgresql://postgres:ozolgfntMPMGTFZgWTIiqmoaqIKQetVx@gondola.proxy.rlwy.net:31433/railway?sslmode=require"
```

### Verify Database is Running

1. Go to Railway dashboard
2. Check Postgres service status
3. Verify the public URL hasn't changed
4. Check if database is paused/stopped

### Use Railway CLI (Bypasses Network Issues)

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and link
railway login
railway link

# Run scripts (uses Railway's network)
railway run npm run check:launch-readiness
railway run npm run embassy:sync
```

---

## 📊 Expected Timeline

- **Sync Jobs:** 2-5 minutes per combination (20 combinations = ~40-100 minutes total)
- **Review:** 1-2 minutes per ruleset (18 rulesets = ~20-40 minutes)
- **Approval:** 30 seconds per ruleset (18 rulesets = ~10 minutes)

**Total Time:** ~1.5-2.5 hours for complete workflow

---

## ✅ Success Criteria

1. ✅ All 20 combinations have approved VisaRuleSet
2. ✅ `check:launch-readiness` shows all ✅ PASS
3. ✅ `coverage:report` shows 20/20 approved
4. ✅ Application checklists use RULES mode (not LEGACY)

---

**Status:** Workflow ready. Database connectivity must be resolved first.

**Date:** 2025-12-04  
**Purpose:** Step-by-step guide to execute all Phase 1 scripts with Railway Postgres + Redis

---

## ⚠️ Prerequisites: Database Connectivity

**Current Issue:** Database at `gondola.proxy.rlwy.net:31433` is not reachable from local machine.

**Solutions:**

1. **Verify Database is Running** - Check Railway dashboard
2. **Try SSL Connection** - Add `?sslmode=require` to DATABASE_URL
3. **Check Firewall** - Ensure port 31433 is not blocked
4. **Use Railway CLI** - Run from Railway environment (bypasses network issues)

---

## 📋 Complete Workflow (When DB is Accessible)

### Step 1: Set Environment Variables

```powershell
cd C:\work\VisaBuddy

# Database (Public URL from Railway)
$env:DATABASE_URL="postgresql://postgres:ozolgfntMPMGTFZgWTIiqmoaqIKQetVx@gondola.proxy.rlwy.net:31433/railway"

# Redis (Public URL from Railway)
$env:REDIS_URL="redis://default:cSzxbqwnZUiPjWQCsMaZGWLXJpLvLXXH@turntable.proxy.rlwy.net:12571"

# Verify they're set
Write-Output "DATABASE_URL: $env:DATABASE_URL"
Write-Output "REDIS_URL: $env:REDIS_URL"
```

### Step 2: Check Current Status

```powershell
cd apps/backend
npm run check:launch-readiness
```

**Expected Output:**

- Table showing 20 combinations
- 2 PASS (AU tourist, AU student)
- 18 WARN (need rulesets)

### Step 3: Generate Coverage Report

```powershell
npm run coverage:report
```

**Expected Output:**

- Generates `VISA_RULES_COVERAGE.md`
- Shows detailed status for all 20 combinations

### Step 4: Sync Embassy Sources (All 18 Missing)

**Option A: Sync All at Once**

```powershell
npm run embassy:sync
```

**Option B: Sync One at a Time (Recommended for Debugging)**

```powershell
# US
npm run embassy:sync -- US tourist
npm run embassy:sync -- US student

# CA
npm run embassy:sync -- CA tourist
npm run embassy:sync -- CA student

# GB
npm run embassy:sync -- GB tourist
npm run embassy:sync -- GB student

# DE
npm run embassy:sync -- DE tourist
npm run embassy:sync -- DE student

# FR
npm run embassy:sync -- FR tourist
npm run embassy:sync -- FR student

# ES
npm run embassy:sync -- ES tourist
npm run embassy:sync -- ES student

# IT
npm run embassy:sync -- IT tourist
npm run embassy:sync -- IT student

# JP
npm run embassy:sync -- JP tourist
npm run embassy:sync -- JP student

# AE
npm run embassy:sync -- AE tourist
npm run embassy:sync -- AE student
```

**Expected Output:**

- "✅ Enqueued sync job for [country] [visaType]"
- Queue statistics
- Jobs will process in background via Bull queue

**Note:** Jobs run asynchronously. Check Railway logs or wait a few minutes for processing.

### Step 5: Review Extracted Rulesets

After sync jobs complete, review each ruleset:

```powershell
# Preview (no changes made)
npm run approve:visarules -- US tourist
npm run approve:visarules -- US student
npm run approve:visarules -- CA tourist
npm run approve:visarules -- CA student
# ... repeat for all 18 combinations
```

**Expected Output:**

- Ruleset summary (country, visa type, version, ID)
- Required documents list with descriptions
- Financial requirements (if present)
- "⚠️ DRY RUN - No changes made"

### Step 6: Approve Rulesets

If rulesets look good, approve them:

```powershell
# Approve (actually sets isApproved = true)
npm run approve:visarules -- US tourist --approve
npm run approve:visarules -- US student --approve
npm run approve:visarules -- CA tourist --approve
npm run approve:visarules -- CA student --approve
npm run approve:visarules -- GB tourist --approve
npm run approve:visarules -- GB student --approve
npm run approve:visarules -- DE tourist --approve
npm run approve:visarules -- DE student --approve
npm run approve:visarules -- FR tourist --approve
npm run approve:visarules -- FR student --approve
npm run approve:visarules -- ES tourist --approve
npm run approve:visarules -- ES student --approve
npm run approve:visarules -- IT tourist --approve
npm run approve:visarules -- IT student --approve
npm run approve:visarules -- JP tourist --approve
npm run approve:visarules -- JP student --approve
npm run approve:visarules -- AE tourist --approve
npm run approve:visarules -- AE student --approve
```

**Expected Output:**

- "⚠️ APPROVING RULESET..."
- "✅ Ruleset approved successfully!"
- "Version X is now active for [country] [visaType]"

### Step 7: Final Verification

```powershell
npm run check:launch-readiness
```

**Target Output:**

- All 20 combinations show ✅ PASS
- Final verdict: "✅ LAUNCH READY: All combinations are fully configured!"

---

## 🔧 Troubleshooting Database Connection

### Try SSL Mode

```powershell
$env:DATABASE_URL="postgresql://postgres:ozolgfntMPMGTFZgWTIiqmoaqIKQetVx@gondola.proxy.rlwy.net:31433/railway?sslmode=require"
```

### Verify Database is Running

1. Go to Railway dashboard
2. Check Postgres service status
3. Verify the public URL hasn't changed
4. Check if database is paused/stopped

### Use Railway CLI (Bypasses Network Issues)

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and link
railway login
railway link

# Run scripts (uses Railway's network)
railway run npm run check:launch-readiness
railway run npm run embassy:sync
```

---

## 📊 Expected Timeline

- **Sync Jobs:** 2-5 minutes per combination (20 combinations = ~40-100 minutes total)
- **Review:** 1-2 minutes per ruleset (18 rulesets = ~20-40 minutes)
- **Approval:** 30 seconds per ruleset (18 rulesets = ~10 minutes)

**Total Time:** ~1.5-2.5 hours for complete workflow

---

## ✅ Success Criteria

1. ✅ All 20 combinations have approved VisaRuleSet
2. ✅ `check:launch-readiness` shows all ✅ PASS
3. ✅ `coverage:report` shows 20/20 approved
4. ✅ Application checklists use RULES mode (not LEGACY)

---

**Status:** Workflow ready. Database connectivity must be resolved first.
