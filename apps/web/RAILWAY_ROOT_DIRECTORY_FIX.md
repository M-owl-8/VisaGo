# Railway Root Directory Fix

## Problem

Railway dropdown doesn't show `apps/web` in the suggested directories list.

## Solution

**Type the root directory manually** - don't rely on the dropdown!

## Exact Steps

### Step 1: Clear the Input Field

1. In Railway dashboard, find the **"Root Directory"** input field
2. **Clear any existing value** (click the 'x' icon or delete the text)
3. The field should be empty

### Step 2: Type the Path Manually

1. **Click in the "Root Directory" input field**
2. **Type exactly:** `apps/web`
   - No leading slash: `apps/web` ✅
   - NOT: `/apps/web` ❌
   - NOT: `apps\web` ❌ (Windows backslash)
   - NOT: `./apps/web` ❌
3. **Press Enter** or click outside the field

### Step 3: Verify

After typing `apps/web`, you should see:

- The input field shows: `apps/web`
- Railway will validate it (might show a checkmark or highlight)

### Step 4: Save

1. **Click "Save"** or "Update" button (if visible)
2. Or Railway might auto-save when you click outside the field

## Why the Dropdown Doesn't Show It

Railway's dropdown only shows directories that:

- Are detected during repository scan
- Have certain file patterns
- Are in common locations

Since `apps/web` is a Next.js app in a monorepo, Railway might not auto-detect it in the dropdown, but **it will work if you type it manually**.

## Verification

After setting the root directory:

1. **Go to "Deployments" tab**
2. **Trigger a new deployment** (or wait for auto-deploy)
3. **Check build logs:**
   - Should see: "Installing dependencies..."
   - Should see: "Building Next.js app..."
   - Should NOT see: "Cannot find package.json" error

## Alternative: Check Repository Structure

If Railway still can't find it, verify the directory exists:

1. **Go to your GitHub repository**
2. **Navigate to:** `apps/web/`
3. **Verify you see:**
   - `package.json`
   - `next.config.js`
   - `app/` folder
   - Other Next.js files

If these files exist, Railway will work with `apps/web` as the root directory.

## Troubleshooting

### Error: "Cannot find package.json"

**Solution:**

- Verify you typed: `apps/web` (not `/apps/web`)
- Check that `package.json` exists in `apps/web/` on GitHub
- Make sure you're in the correct service (web service, not backend)

### Error: "Root directory not found"

**Solution:**

- Check spelling: `apps/web` (lowercase, no spaces)
- Verify the directory exists in your repository
- Try refreshing the Railway page and re-entering

### Still Not Working?

1. **Check Railway is connected to correct repository:**
   - Settings → Source → Should show your repository
2. **Try disconnecting and reconnecting:**
   - Disconnect repository
   - Reconnect to same repository
   - Set root directory again

3. **Check repository branch:**
   - Make sure Railway is connected to the branch that has `apps/web`
   - Usually `main` or `master`

## Quick Reference

**Root Directory Value:** `apps/web`

**What to type:** Exactly `apps/web` (no slashes, no dots, lowercase)

**Where to type it:** Root Directory input field in Railway service settings

---

**Last Updated:** 2025-11-27
