# VisaBuddy Startup Scripts - Fix Summary

## Problems Fixed

Your PowerShell scripts had **3 critical syntax errors** that prevented them from running:

### 1. **Variable Interpolation in URLs** ❌→✅
**Problem:**
```powershell
API_BASE_URL=http://$HostIP:$BackendPort  # WRONG - PowerShell confused by colon
```

The colon `:` after `$HostIP` was being interpreted as part of the variable name, breaking the string.

**Solution:**
```powershell
$apiUrl = "http://${HostIP}:${BackendPort}"  # RIGHT - Use ${} syntax
Set-Content -Path ".env" -Value $envContent
```

### 2. **Complex String Interpolation in Write-Host** ❌→✅
**Problem:**
```powershell
Write-Host "Waiting for emulator ($([Math]::Min($elapsed+15, $maxWait))/$maxWait sec)..."
```

Complex expressions inside strings with nested parentheses caused parsing issues.

**Solution:**
```powershell
$remaining = [Math]::Min($elapsed + 15, $maxWait)
Write-Host "Waiting for emulator ($remaining/$maxWait sec)..."
```

### 3. **Unicode Character Encoding Issues** ❌→✅
**Problem:**
The scripts had emoji characters (🚀, ✅, ⏳, etc.) that were getting corrupted during file encoding/decoding, causing syntax errors.

**Solution:**
Replaced all emoji with plain text equivalents:
- 🚀 → "Starting"
- ✅ → "OK"
- ⏳ → "Waiting"
- ❌ → "ERROR"

---

## Files Updated

### 1. **START_VISABUDDY_PROPERLY.ps1** (Main Script)
- Fixed variable interpolation for `$HostIP:$BackendPort`
- Simplified complex string expressions
- Removed Unicode characters
- Changed `$ErrorActionPreference` from `"Stop"` to `"Continue"` to handle ADB startup messages gracefully

### 2. **RUN_NOW.ps1** (Quick Launcher)
- Removed emoji character
- Now calls the corrected main script

### 3. **START_EMULATOR_NOW.ps1** (Existing Script)
- Removed emoji characters

---

## How to Run Now

### Option 1: Quick Start (Recommended)
```powershell
c:\work\VisaBuddy\RUN_NOW.ps1
```

### Option 2: Full Script
```powershell
c:\work\VisaBuddy\START_VISABUDDY_PROPERLY.ps1
```

Both will:
1. Start Android Emulator
2. Wait for it to be ready (2-3 min)
3. Start Backend server
4. Start Frontend (Expo)
5. Build and deploy app to emulator

---

## Test Credentials

```
Email:    test@visabuddy.com
Password: Test123!
```

---

## Technical Details

### Why PowerShell is Tricky with URLs

PowerShell treats colons `:` specially in variable names. When you write:
```powershell
$HostIP:$BackendPort  # PowerShell tries to read "$HostIP:" as one variable
```

PowerShell gets confused and throws a parser error. The solution is to use `${}` syntax to explicitly delimit the variable name:
```powershell
${HostIP}:${BackendPort}  # Clear boundaries for variable names
```

### Why Character Encoding Matters

PowerShell scripts saved with UTF-8 containing emojis can get corrupted if the encoding isn't preserved or if the system locale doesn't support certain characters. Using plain ASCII text avoids these issues entirely.

### Error Action Preference

- `Stop` = Exit immediately on any error (too strict for ADB startup)
- `Continue` = Report errors but keep going (better for this use case)

---

## What to Expect When Running

```
========================================
VisaBuddy - Complete Startup
========================================

STEP 1: Cleaning Up Old Processes...
   OK: Cleaned old Node processes

CHECKING PREREQUISITES...
   OK: Node.js v22.20.0
   OK: npm 10.9.3
   OK: Android SDK at C:\Users\user\AppData\Local\Android\Sdk
   OK: ADB ready
   OK: Emulator ready

STEP 2: Starting Android Emulator...
   Starting emulator Pixel_6 (this takes 2-3 minutes)...
   Waiting 15 seconds for emulator to start...
   (... continues with backend, frontend setup ...)

STEP 5: Building and Running App on Emulator...
   (... compilation progress ...)

========================================
STARTUP COMPLETE!
========================================
```

---

## If You Still Get Errors

### Error: "ADB daemon not running"
This is **normal** - ADB automatically starts. The script handles this.

### Error: "Module not found"
Run `npm install` in the problematic directory first.

### Error: "Port 3000 already in use"
Kill existing processes:
```powershell
Get-Process node | Stop-Process -Force
```

### Error: "Emulator failed to start"
Try starting it manually from Android Studio first, then run the script again.

---

## Summary

✅ **All syntax errors fixed**  
✅ **Scripts are now production-ready**  
✅ **No more PowerShell parser errors**  
✅ **Ready to run VisaBuddy!**