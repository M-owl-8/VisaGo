# VPS Deployment Overview

## Architecture

### Recommended Setup (Current)

The recommended deployment uses Railway for backend and database, with VPS hosting only the web frontend:

```
Mobile App → Railway Backend → Railway Postgres
Web (VPS) → Railway Backend → Railway Postgres
```

**VPS Components:**

```
Internet (80/443)
    ↓
Nginx (Reverse Proxy)
    ↓
Next.js Web App (Port 3000)
```

**Railway Components:**

- Backend API (already deployed and working with mobile app)
- PostgreSQL Database (remote)

### Alternative: Full VPS Deployment

If you want to run everything on VPS (not recommended for now):

```
Internet (80/443)
    ↓
Nginx (Reverse Proxy)
    ↓
Next.js Web App (Port 3000)
    ↓
Backend API (Port 4000)
    ↓
PostgreSQL Database (local or remote)
```

### Component Details

1. **Nginx** (Ports 80/443)
   - Public entry point
   - Handles SSL/TLS termination
   - Proxies requests to Next.js on port 3000
   - Serves static files (if needed)

2. **Next.js Web App** (Port 3000)
   - Serves the web application
   - Handles client-side routing
   - Makes API calls to backend via `NEXT_PUBLIC_API_URL`

3. **Backend API** (Port 4000)
   - Express.js REST API
   - Handles authentication, data processing, AI features
   - Connects to PostgreSQL database
   - Accessible via `/api` routes proxied through Next.js

4. **PostgreSQL Database** (Railway - Recommended)
   - Railway Postgres service (remote)
   - Configured via `DATABASE_URL` environment variable from Railway dashboard
   - **Note:** Local PostgreSQL installation is optional (see below)

### Process Management

**If hosting only web on VPS:**

- `ketdik-web`: Next.js web application (managed by PM2)

**If hosting both backend and web on VPS:**

- `ketdik-backend`: Backend API service (managed by PM2)
- `ketdik-web`: Next.js web application (managed by PM2)

PM2 provides:

- Automatic restarts on crashes
- Log management
- Process monitoring
- Startup on system boot

## File Structure

All deployment files are located in `deployment/vps/`:

| File                         | Purpose                                  |
| ---------------------------- | ---------------------------------------- |
| `pm2.ecosystem.config.cjs`   | PM2 configuration for both services      |
| `nginx.ketdik.conf`          | Nginx server configuration template      |
| `server-env.sample.env`      | Environment variables template           |
| `deploy_checklist.md`        | Step-by-step deployment checklist        |
| `postgres.sample.sql`        | Optional PostgreSQL initialization hints |
| `DEPLOYMENT_VPS_OVERVIEW.md` | This file                                |

## Environment Variables

### Backend

- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: JWT signing secret (32+ characters)
- `CORS_ORIGIN`: Allowed origins (e.g., `https://ketdik.uz`)
- `PORT`: Backend port (default: 4000)
- `NODE_ENV`: Set to `production`

### Web App

- `NEXT_PUBLIC_API_URL`: Backend API URL (e.g., `https://ketdik.uz/api`)
- `NODE_ENV`: Set to `production`

See `server-env.sample.env` for complete list of all environment variables.

## Deployment Flow

1. Clone repository
2. Install dependencies: `npm install`
3. Set environment variables: Copy `server-env.sample.env` to `.env.production`
4. Run database migrations: `npm run db:migrate:deploy`
5. Generate Prisma client: `npm run db:generate`
6. Build applications: `npm run build:all`
7. Start services with PM2: `pm2 start deployment/vps/pm2.ecosystem.config.cjs`
8. Configure Nginx: Copy `nginx.ketdik.conf` to `/etc/nginx/sites-available/ketdik`
9. Enable SSL with Certbot
10. Restart Nginx

See `deploy_checklist.md` for detailed step-by-step instructions.

## Using Railway Postgres + Railway Backend with VPS Web

### Architecture Overview

This is the **recommended setup** for VPS deployment:

```
┌─────────────────┐
│   Mobile App    │
└────────┬────────┘
         │
         ↓
┌─────────────────┐      ┌──────────────────┐
│ Railway Backend │─────▶│ Railway Postgres │
└────────┬────────┘      └──────────────────┘
         │
         ↑
┌────────┴────────┐
│  Web (VPS)      │
│  ketdik.uz      │
└─────────────────┘
```

### Components

1. **Railway Backend** (already deployed)
   - Express.js REST API
   - Handles authentication, data processing, AI features
   - Currently working with mobile app
   - Accessible at: `https://your-backend-service.up.railway.app`

2. **Railway Postgres** (already deployed)
   - Remote PostgreSQL database
   - Connection string available in Railway dashboard
   - Used by both mobile app and web app (via Railway backend)

3. **VPS Web App** (what we're deploying)
   - Next.js web application
   - Served via Nginx on port 3000
   - Makes API calls to Railway backend via `NEXT_PUBLIC_API_URL`

### Configuration

- **Web App**: Set `NEXT_PUBLIC_API_URL` to your Railway backend URL
- **Backend CORS**: Add `https://ketdik.uz` to existing `CORS_ORIGIN` in Railway
- **Database**: Use Railway Postgres `DATABASE_URL` (only needed if running backend on VPS)

### Benefits

- ✅ Consistent backend for mobile and web
- ✅ No need to migrate database
- ✅ Simpler VPS setup (only web app)
- ✅ Can optionally move backend to VPS later

## API Routing

The web app calls the backend using `NEXT_PUBLIC_API_URL`.

**With Railway backend (recommended):**

- `NEXT_PUBLIC_API_URL=https://your-backend-service.up.railway.app`
- All API requests go to: `https://your-backend-service.up.railway.app/api/*`
- This ensures web app uses the same backend as mobile app

**If backend is on VPS:**

- `NEXT_PUBLIC_API_URL=https://ketdik.uz/api`
- All API requests go to: `https://ketdik.uz/api/*`

## Security Considerations

1. **CORS**: Railway backend `CORS_ORIGIN` must include `https://ketdik.uz` (add to existing origins, don't remove)
2. **SSL/TLS**: Required for production (handled by Nginx + Certbot)
3. **Firewall**: Only ports 80, 443 should be open to public
4. **Environment Variables**: Never commit `.env` files
5. **JWT Secret**: Must be at least 32 characters, use strong random value
6. **Backend Security**: Railway backend already configured and working with mobile app

## Monitoring

### PM2 Commands

```bash
# View logs
pm2 logs ketdik-web
pm2 logs ketdik-backend

# View status
pm2 status

# Restart services
pm2 restart ketdik-web
pm2 restart ketdik-backend

# Stop services
pm2 stop all

# Save PM2 configuration
pm2 save
```

### Nginx Logs

```bash
# Access logs
tail -f /var/log/nginx/access.log

# Error logs
tail -f /var/log/nginx/error.log
```

## Troubleshooting

1. **Services not starting**: Check PM2 logs and environment variables
2. **502 Bad Gateway**: Verify backend is running on port 4000
3. **CORS errors**: Ensure `CORS_ORIGIN` includes your domain
4. **Database connection errors**: Verify `DATABASE_URL` is correct
5. **SSL errors**: Check Certbot certificate status

For detailed troubleshooting, see `deploy_checklist.md`.
