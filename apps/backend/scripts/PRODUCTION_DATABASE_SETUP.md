# Running Scripts Against Production Database

## Important: Database Selection

The scripts (`make-super-admin`, `list-users`) will use:

- **Local SQLite database** if `DATABASE_URL` points to a file (default)
- **Production PostgreSQL database** if `DATABASE_URL` points to PostgreSQL/Railway

## Option 1: Use Production DATABASE_URL

### Get Production DATABASE_URL from Railway

1. Go to your Railway project dashboard
2. Navigate to your backend service
3. Go to the "Variables" tab
4. Find `DATABASE_URL` variable
5. Copy the value

### Run Script with Production Database

**Windows PowerShell:**

```powershell
cd apps/backend
$env:DATABASE_URL="postgresql://user:password@host:port/database"
npm run make-super-admin
```

**Or create a temporary .env.production file:**

```bash
cd apps/backend
# Create .env.production with production DATABASE_URL
echo "DATABASE_URL=postgresql://user:password@host:port/database" > .env.production
# Load it and run script
$env:DATABASE_URL = Get-Content .env.production | Select-String "DATABASE_URL" | ForEach-Object { $_.ToString().Split('=')[1] }
npm run make-super-admin
```

## Option 2: Run Script on Railway (Recommended)

### Using Railway CLI

1. Install Railway CLI: `npm i -g @railway/cli`
2. Login: `railway login`
3. Link project: `railway link`
4. Run script:
   ```bash
   cd apps/backend
   railway run npm run make-super-admin
   ```

This automatically uses the production database from Railway environment.

## Option 3: SSH into Railway Container

1. Go to Railway dashboard
2. Open your backend service
3. Use Railway's shell/terminal feature
4. Run:
   ```bash
   cd apps/backend
   npm run make-super-admin
   ```

## Verify Which Database You're Using

The script will show:

```
📊 Database Configuration:
   Type: PostgreSQL (Production)  <-- Should say this for production
   URL: postgresql://...
```

If it says "SQLite (Local)", you're using the local database.

## Security Note

⚠️ **Never commit production DATABASE_URL to git!**

- Use environment variables
- Use Railway's environment variables
- Use `.env` files that are in `.gitignore`
