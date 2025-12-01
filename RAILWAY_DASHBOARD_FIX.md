# URGENT: Fix Railway Dashboard Settings

## 🔴 **CRITICAL: Railway Dashboard Settings Override railway.json**

Railway is using **cached nixpacks settings** from the dashboard, which override the `railway.json` file.

## ✅ **IMMEDIATE FIX - Do This Now:**

### Step 1: Go to Railway Dashboard

1. Go to https://railway.app
2. Log in
3. Select your **VisaBuddy Backend** service

### Step 2: Open Service Settings

1. Click on your **backend service**
2. Click **Settings** tab (gear icon)
3. Scroll to **Build & Deploy** section

### Step 3: Configure Build Settings

**IMPORTANT - Set these EXACT values:**

1. **Root Directory:**
   - Set to: **`.`** (just a dot) OR leave **EMPTY**
   - NOT `apps/backend`

2. **Dockerfile Path:**
   - Set to: **`apps/backend/Dockerfile`**

3. **Build Command:**
   - **DELETE/REMOVE** any value
   - Leave it **EMPTY**

4. **Start Command:**
   - **DELETE/REMOVE** any value
   - Leave it **EMPTY**

5. **Nixpacks Build Command:**
   - **DELETE/REMOVE** any value
   - Leave it **EMPTY**

6. **Nixpacks Start Command:**
   - **DELETE/REMOVE** any value
   - Leave it **EMPTY**

### Step 4: Save and Redeploy

1. Click **Save** or **Update**
2. Go to **Deployments** tab
3. Click **Redeploy** or wait for auto-deploy

## 🎯 **What This Does:**

- Forces Railway to use **Dockerfile** instead of nixpacks
- Uses the Dockerfile at `apps/backend/Dockerfile`
- Builds from repo root (`.`)
- No workspace errors because Dockerfile doesn't use workspaces

## ✅ **Expected Result:**

After saving, Railway will:

1. Use Dockerfile for build
2. Build successfully
3. Start the backend
4. Backend will be online

## 🚨 **If Still Failing:**

1. **Delete the service and recreate it:**
   - Delete the backend service
   - Create new service
   - Connect to same GitHub repo
   - Set Root Directory: `.`
   - Set Dockerfile Path: `apps/backend/Dockerfile`

2. **Or contact Railway support:**
   - They can clear cached build settings

## 📸 **Visual Guide:**

```
Railway Dashboard → Your Service → Settings → Build & Deploy

Root Directory:        .                    ← Just a dot
Dockerfile Path:       apps/backend/Dockerfile
Build Command:         (empty)              ← DELETE everything
Start Command:         (empty)              ← DELETE everything
Nixpacks Build:        (empty)              ← DELETE everything
Nixpacks Start:        (empty)              ← DELETE everything
```

**SAVE and REDEPLOY!**
