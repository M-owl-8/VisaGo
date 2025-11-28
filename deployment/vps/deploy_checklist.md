# Ketdik VPS Deployment Checklist

This checklist provides step-by-step instructions for deploying Ketdik on a fresh Ubuntu VPS.

## Prerequisites

- Ubuntu 20.04+ or Debian 11+ VPS
- Root or sudo access
- Domain name pointed to VPS IP (for SSL)
- Basic knowledge of Linux commands

---

## Step 1: Initial Server Setup

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git build-essential
```

---

## Step 2: Install Node.js 20+

```bash
# Install Node.js 20.x using NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should be v20.x or higher
npm --version
```

---

## Step 3: Install PostgreSQL (OPTIONAL - Only if moving DB off Railway)

**⚠️ IMPORTANT:** This step is **OPTIONAL**. The recommended setup uses **Railway Postgres** (remote database).

**Skip this step if:**

- You're using Railway Postgres (recommended)
- You're only deploying the web app to VPS
- Your backend stays on Railway

**Only install local PostgreSQL if:**

- You want to move the database off Railway in the future
- You're deploying the full stack (backend + web) on VPS

```bash
# Install PostgreSQL (ONLY if not using Railway Postgres)
sudo apt install -y postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user (optional)
sudo -u postgres psql << EOF
CREATE DATABASE ketdik;
CREATE USER ketdik_user WITH PASSWORD 'YOUR_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE ketdik TO ketdik_user;
\q
EOF

# Note: Update DATABASE_URL in .env.production with the password you set
```

---

## Step 4: Install Nginx

```bash
# Install Nginx
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Check status
sudo systemctl status nginx
```

---

## Step 5: Install PM2

```bash
# Install PM2 globally
sudo npm install -g pm2

# Verify installation
pm2 --version
```

---

## Step 6: Install Certbot (for SSL)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Verify installation
certbot --version
```

---

## Step 7: Clone Repository

```bash
# Navigate to your preferred directory (e.g., /var/www)
cd /var/www

# Clone the repository
sudo git clone https://github.com/YOUR_USERNAME/VisaGo.git ketdik
# OR if using SSH:
# sudo git clone git@github.com:YOUR_USERNAME/VisaGo.git ketdik

# Change ownership to your user (replace 'youruser' with your username)
sudo chown -R $USER:$USER /var/www/ketdik

# Navigate to project directory
cd ketdik
```

---

## Step 8: Install Dependencies

```bash
# Install all dependencies
npm install
```

---

## Step 9: Configure Environment Variables

```bash
# Copy the sample environment file
cp deployment/vps/server-env.sample.env .env.production

# Edit the file with your actual values
nano .env.production
# OR use vim: vim .env.production

# Required changes:
# - DATABASE_URL: Use your Railway Postgres connection string (from Railway dashboard)
#   Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require
# - JWT_SECRET: Generate with: openssl rand -base64 32 (only if running backend on VPS)
# - NEXT_PUBLIC_API_URL: Set to your Railway backend URL
#   Example: https://your-backend-service.up.railway.app
#   This ensures web uses same backend as mobile app
# - CORS_ORIGIN: Add https://ketdik.uz to existing Railway backend CORS settings
#   (Update in Railway dashboard, not in this file)
# - PORT: Set to 4000 for backend (only if running backend on VPS)
```

---

## Step 10: Run Database Migrations

**Note:** If using Railway Postgres, migrations should be run against the Railway database.

```bash
# Generate Prisma client
npm run db:generate

# Run migrations against Railway Postgres
# This will use DATABASE_URL from .env.production (Railway Postgres URL)
npm run db:migrate:deploy
```

**Important:** Ensure `DATABASE_URL` in `.env.production` points to your Railway Postgres before running migrations.

---

## Step 11: Build Applications

```bash
# Build both backend and web app
npm run build:all
```

---

## Step 12: Create Logs Directory

```bash
# Create logs directory for PM2
mkdir -p logs
```

---

## Step 13: Start Services with PM2

**Note:** If you're only deploying the web app (recommended), PM2 will start only the web service.
If you're deploying both backend and web, both will start.

```bash
# Start services (web only, or both if backend is on VPS)
pm2 start deployment/vps/pm2.ecosystem.config.cjs

# Check status
pm2 status

# View logs
pm2 logs

# If only web is running, you'll see only ketdik-web
# If both are running, you'll see ketdik-backend and ketdik-web

# Save PM2 configuration (auto-start on reboot)
pm2 save

# Setup PM2 to start on system boot
pm2 startup
# Follow the instructions shown by the command
```

---

## Step 14: Configure Nginx

```bash
# Copy Nginx configuration
sudo cp deployment/vps/nginx.ketdik.conf /etc/nginx/sites-available/ketdik

# Edit the file to replace 'ketdik.uz' with your domain
sudo nano /etc/nginx/sites-available/ketdik
# Replace all instances of 'ketdik.uz' with your actual domain

# Create symlink to enable the site
sudo ln -s /etc/nginx/sites-available/ketdik /etc/nginx/sites-enabled/

# Remove default Nginx site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# If test passes, reload Nginx
sudo systemctl reload nginx
```

---

## Step 15: Setup SSL with Certbot

```bash
# Obtain SSL certificate (replace ketdik.uz with your domain)
sudo certbot --nginx -d ketdik.uz -d www.ketdik.uz

# Follow the prompts:
# - Enter your email address
# - Agree to terms of service
# - Choose whether to redirect HTTP to HTTPS (recommended: Yes)

# Certbot will automatically update your Nginx configuration

# Test automatic renewal
sudo certbot renew --dry-run
```

---

## Step 16: Verify Deployment

```bash
# Check PM2 services
pm2 status

# Check Nginx status
sudo systemctl status nginx

# Check backend logs
pm2 logs ketdik-backend --lines 50

# Check web app logs
pm2 logs ketdik-web --lines 50

# Test web app (should return HTML)
curl http://localhost:3000

# If backend is on VPS, test backend health (should return JSON)
# curl http://localhost:4000/api/health

# If backend is on Railway, test via Railway URL
# curl https://your-backend-service.up.railway.app/api/health
```

---

## Step 17: Firewall Configuration

```bash
# Install UFW if not already installed
sudo apt install -y ufw

# Allow SSH (important - do this first!)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

---

## Post-Deployment

### Monitoring

```bash
# View real-time logs
pm2 logs

# View specific service logs
pm2 logs ketdik-backend
pm2 logs ketdik-web

# View Nginx logs
sudo tail -f /var/log/nginx/ketdik-access.log
sudo tail -f /var/log/nginx/ketdik-error.log
```

### Common Commands

```bash
# Restart services
pm2 restart ketdik-backend
pm2 restart ketdik-web
pm2 restart all

# Stop services
pm2 stop all

# Reload Nginx
sudo systemctl reload nginx

# Check service status
pm2 status
sudo systemctl status nginx
```

### Troubleshooting

1. **502 Bad Gateway**: Check if backend is running (`pm2 logs ketdik-backend`)
2. **CORS errors**: Verify `CORS_ORIGIN` in `.env.production` includes your domain
3. **Database connection errors**: Check `DATABASE_URL` in `.env.production`
4. **SSL errors**: Verify Certbot certificate (`sudo certbot certificates`)

---

## Next Steps

1. Test the application in a browser: `https://your-domain.uz`
2. Create an admin user (if needed)
3. Configure monitoring and backups
4. Set up automated backups for database
5. Configure log rotation

---

## Notes

- Replace `ketdik.uz` with your actual domain throughout
- Keep `.env.production` secure - never commit it to git
- Regularly update system packages: `sudo apt update && sudo apt upgrade`
- Monitor PM2 logs regularly for errors
- Set up automated database backups
