# Deployment Guide for Linux .uz Server

This guide walks you through deploying the Ketdik/VisaBuddy web app to a Linux server with a .uz domain.

## Prerequisites

- Linux server (Ubuntu 20.04+ or similar) with SSH access
- Root or sudo access
- Domain name configured (e.g., `yourdomain.uz`)
- DNS records pointing to your server IP

## Step 1: Server Preparation

### 1.1 Install Node.js 20+

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should be v20.x or higher
npm --version
```

### 1.2 Install PostgreSQL (if not using external DB)

```bash
sudo apt install -y postgresql postgresql-contrib

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql
```

In PostgreSQL shell:

```sql
CREATE DATABASE visabuddy;
CREATE USER visabuddy_user WITH PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE visabuddy TO visabuddy_user;
\q
```

### 1.3 Install PM2 (Process Manager)

```bash
sudo npm install -g pm2
```

### 1.4 Install Nginx (Reverse Proxy)

```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

---

## Step 2: Clone and Setup Repository

### 2.1 Clone Repository

```bash
cd /var/www  # or your preferred directory
git clone <your-repo-url> visabuddy
cd visabuddy
```

### 2.2 Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd apps/backend
npm install

# Install web app dependencies
cd ../web
npm install
```

---

## Step 3: Configure Environment Variables

### 3.1 Backend Environment

Create `apps/backend/.env.production`:

```bash
cd apps/backend
nano .env.production
```

Add:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://visabuddy_user:your-secure-password@localhost:5432/visabuddy
JWT_SECRET=<generate-with-openssl-rand-base64-32>
CORS_ORIGIN=https://yourdomain.uz,https://www.yourdomain.uz
FRONTEND_URL=https://yourdomain.uz
OPENAI_API_KEY=sk-...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
SENDGRID_API_KEY=SG....
LOG_LEVEL=INFO
```

**Generate JWT_SECRET:**

```bash
openssl rand -base64 32
```

### 3.2 Web App Environment

Create `apps/web/.env.production`:

```bash
cd ../web
nano .env.production
```

Add:

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.uz
NEXT_PUBLIC_AI_SERVICE_URL=https://ai.yourdomain.uz
```

**Note:** If backend and web are on the same server, you can use:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

---

## Step 4: Database Migration

### 4.1 Run Prisma Migration

```bash
cd apps/backend

# Generate Prisma Client
npm run db:generate

# Apply migrations to production database
npm run db:migrate:deploy
```

**Expected output:**

```
✅ Applied migration: add_document_checklist
✅ Prisma Client generated
```

### 4.2 Verify Database

```bash
# Check if DocumentChecklist table exists
npx prisma studio
# Open http://localhost:5555 in browser
# You should see DocumentChecklist table
```

---

## Step 5: Build Web App

```bash
cd apps/web

# Build for production
npm run build
```

**Expected output:**

```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages
✓ Finalizing page optimization
```

---

## Step 6: Start Services

### 6.1 Start Backend with PM2

```bash
cd apps/backend

# Build backend
npm run build

# Start with PM2
pm2 start npm --name "visabuddy-backend" -- run start:prod

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the command it outputs
```

### 6.2 Start Web App with PM2

```bash
cd apps/web

# Start with PM2
pm2 start npm --name "visabuddy-web" -- start

# Save PM2 configuration
pm2 save
```

### 6.3 Verify Services

```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs visabuddy-backend
pm2 logs visabuddy-web

# Test backend health
curl http://localhost:3000/api/health

# Test web app
curl http://localhost:3001
```

---

## Step 7: Configure Nginx Reverse Proxy

### 7.1 Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/visabuddy
```

Add:

```nginx
# Web App (Frontend)
server {
    listen 80;
    server_name yourdomain.uz www.yourdomain.uz;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Backend API (Optional - if exposing on subdomain)
server {
    listen 80;
    server_name api.yourdomain.uz;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 7.2 Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/visabuddy /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl reload nginx
```

---

## Step 8: SSL Certificate (Let's Encrypt)

### 8.1 Install Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 8.2 Obtain SSL Certificate

```bash
sudo certbot --nginx -d yourdomain.uz -d www.yourdomain.uz
```

If you have API subdomain:

```bash
sudo certbot --nginx -d api.yourdomain.uz
```

### 8.3 Auto-Renewal

Certbot sets up auto-renewal automatically. Test it:

```bash
sudo certbot renew --dry-run
```

---

## Step 9: Firewall Configuration

```bash
# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow SSH (if not already)
sudo ufw allow 22/tcp

# Enable firewall
sudo ufw enable
```

---

## Step 10: Verify Deployment

### 10.1 Health Checks

```bash
# Backend health
curl https://api.yourdomain.uz/api/health

# Web app
curl https://yourdomain.uz
```

### 10.2 Test Application

1. Open `https://yourdomain.uz` in browser
2. Try registering a new account
3. Complete questionnaire
4. Verify checklist generation
5. Test document upload

---

## Maintenance Commands

### View Logs

```bash
# PM2 logs
pm2 logs visabuddy-backend
pm2 logs visabuddy-web

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Restart Services

```bash
# Restart backend
pm2 restart visabuddy-backend

# Restart web app
pm2 restart visabuddy-web

# Restart all
pm2 restart all
```

### Update Application

```bash
cd /var/www/visabuddy

# Pull latest changes
git pull

# Update dependencies
npm install
cd apps/backend && npm install
cd ../web && npm install

# Run migrations (if any)
cd ../backend
npm run db:migrate:deploy
npm run db:generate

# Rebuild
cd ../backend && npm run build
cd ../web && npm run build

# Restart services
pm2 restart all
```

---

## Troubleshooting

### Backend Not Starting

```bash
# Check logs
pm2 logs visabuddy-backend --lines 50

# Common issues:
# - DATABASE_URL incorrect
# - JWT_SECRET missing or too short
# - Port 3000 already in use
```

### Web App Not Starting

```bash
# Check logs
pm2 logs visabuddy-web --lines 50

# Common issues:
# - NEXT_PUBLIC_API_URL not set
# - Port 3001 already in use
# - Build failed (check npm run build output)
```

### Database Connection Issues

```bash
# Test PostgreSQL connection
psql -U visabuddy_user -d visabuddy -h localhost

# Check PostgreSQL is running
sudo systemctl status postgresql
```

### Nginx 502 Bad Gateway

```bash
# Check if services are running
pm2 status

# Check Nginx error log
sudo tail -f /var/log/nginx/error.log

# Verify proxy_pass URLs match PM2 ports
```

---

## Security Checklist

- [ ] JWT_SECRET is 32+ characters and randomly generated
- [ ] Database password is strong
- [ ] CORS_ORIGIN is restricted to your domain
- [ ] SSL certificate is installed and auto-renewing
- [ ] Firewall is configured (only 22, 80, 443 open)
- [ ] Environment files are not committed to git
- [ ] PM2 is running services (not as root)
- [ ] Nginx is updated and secure

---

## Quick Reference

| Service    | Port   | PM2 Name          | URL                   |
| ---------- | ------ | ----------------- | --------------------- |
| Backend    | 3000   | visabuddy-backend | http://localhost:3000 |
| Web App    | 3001   | visabuddy-web     | http://localhost:3001 |
| PostgreSQL | 5432   | -                 | localhost:5432        |
| Nginx      | 80/443 | -                 | https://yourdomain.uz |

---

**Last Updated:** November 27, 2025
