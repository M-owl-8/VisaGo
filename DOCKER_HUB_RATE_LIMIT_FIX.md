# Docker Hub Rate Limit Fix for AI Service

## Problem

Railway deployment is failing with Docker Hub rate limit error:

```
429 Too Many Requests: You have reached your unauthenticated pull rate limit
```

## Solution: Use Nixpacks Instead of Dockerfile

Railway's Nixpacks builds Python from source and doesn't rely on Docker Hub images, avoiding rate limits.

### Step 1: Configure Railway Dashboard

1. Go to Railway Dashboard: https://railway.app
2. Navigate to your **AI Service** (VisaBuddy AI Service)
3. Click **Settings** tab
4. In **Build & Deploy** section:
   - **Build Method**: Change to **"Nixpacks"** (or let Railway auto-detect)
   - **Root Directory**: Set to `apps/ai-service` or leave empty
   - **Dockerfile Path**: Leave empty (we're using Nixpacks)
5. Click **Save**

### Step 2: Verify nixpacks.toml Exists

The file `apps/ai-service/nixpacks.toml` should exist with:

```toml
[phases.setup]
nixPkgs = ["python311"]

[phases.install]
cmds = [
  "pip install --upgrade pip",
  "pip install -r requirements.txt"
]

[start]
cmd = "uvicorn main:app --host 0.0.0.0 --port $PORT"
```

### Step 3: Redeploy

1. Go to **Deployments** tab
2. Click **Redeploy** or wait for auto-deploy
3. Railway will use Nixpacks instead of Dockerfile

## Alternative: Docker Hub Authentication

If you prefer to keep using Dockerfile:

1. Create a Docker Hub account (free)
2. In Railway Dashboard → Project Settings → Variables
3. Add these environment variables:
   - `DOCKER_USERNAME` = your Docker Hub username
   - `DOCKER_PASSWORD` = your Docker Hub password/token
4. Railway will authenticate automatically

## Expected Result

After switching to Nixpacks:

- ✅ No Docker Hub rate limit errors
- ✅ Python 3.11 built from source via Nix
- ✅ Dependencies installed via pip
- ✅ Service starts successfully




