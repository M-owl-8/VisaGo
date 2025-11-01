# 🚀 Backend Quick Start Guide

## Prerequisites

- **Node.js** 20+ installed
- **PostgreSQL** installed and running
- **npm** or **yarn** package manager

---

## 📦 Installation

```bash
# Install backend dependencies
cd apps/backend
npm install

# Generate Prisma client
npm run db:generate
```

---

## 🗄️ Database Setup

### 1. Create PostgreSQL Database

```sql
CREATE DATABASE visabuddy_dev;
```

### 2. Configure Environment

```bash
# Copy example env
cp .env.example .env

# Edit .env and update DATABASE_URL
# Example:
# DATABASE_URL=postgresql://postgres:password@localhost:5432/visabuddy_dev
```

### 3. Run Migrations

```bash
npm run db:migrate
# Follow prompts to create migration if needed
```

### 4. Seed Initial Data

```bash
npm run db:seed
# This populates countries and visa types
```

---

## ▶️ Running the Backend

### Development Mode (with auto-reload)

```bash
npm run dev
```

Server will start on `http://localhost:3000`

### Production Mode

```bash
npm run build
npm start
```

---

## 🧪 Testing API Endpoints

### Authentication Routes

**Register**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

**Login**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

**Get Profile** (requires token)
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Countries Routes

**Get All Countries**
```bash
curl http://localhost:3000/api/countries
```

**Search Countries**
```bash
curl http://localhost:3000/api/countries?search=United
```

**Get Popular Countries**
```bash
curl http://localhost:3000/api/countries/popular
```

**Get Country by Code**
```bash
curl http://localhost:3000/api/countries/code/US
```

### Visa Applications Routes (requires auth)

**Create Application**
```bash
curl -X POST http://localhost:3000/api/applications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "countryId": "COUNTRY_ID",
    "visaTypeId": "VISA_TYPE_ID",
    "notes": "Applying for tourism"
  }'
```

**Get All Applications**
```bash
curl -X GET http://localhost:3000/api/applications \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Update Checkpoint Status**
```bash
curl -X PUT http://localhost:3000/api/applications/APP_ID/checkpoints/CHECKPOINT_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"status": "completed"}'
```

---

## 🗺️ API Endpoints Overview

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/google` - Google OAuth login
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/me` - Update user profile

### Countries & Visas
- `GET /api/countries` - List all countries
- `GET /api/countries/popular` - Get top 10 countries
- `GET /api/countries/:id` - Get country details
- `GET /api/countries/code/:code` - Get by ISO code
- `GET /api/countries/:countryId/visa-types` - Get visa types

### Visa Applications
- `GET /api/applications` - Get user's applications
- `GET /api/applications/:id` - Get single application
- `POST /api/applications` - Create new application
- `PUT /api/applications/:id/status` - Update status
- `PUT /api/applications/:id/checkpoints/:checkpointId` - Update checkpoint
- `DELETE /api/applications/:id` - Delete application

---

## 🛠️ Useful Commands

```bash
# Development
npm run dev              # Start with auto-reload
npm run typecheck        # Check TypeScript errors
npm run lint             # Run linter
npm run format           # Format code with Prettier

# Database
npm run db:generate      # Generate Prisma client
npm run db:migrate       # Create/run migrations
npm run db:studio        # Open Prisma Studio GUI
npm run db:seed          # Seed initial data
npm run db:reset         # Reset database (WARNING: deletes all data)

# Build & Deploy
npm run build            # Build for production
npm start                # Run built app
```

---

## 🔐 Environment Variables (Important)

**Required for development:**
```
DATABASE_URL=postgresql://user:password@localhost:5432/visabuddy_dev
JWT_SECRET=your-development-secret-key-here
NODE_ENV=development
PORT=3000
```

**Recommended for testing:**
```
CORS_ORIGIN=http://localhost:3000,http://localhost:8081
```

---

## 📚 Prisma Database Tools

### Open Prisma Studio
```bash
npm run db:studio
```
Graphical database explorer at `http://localhost:5555`

### View Migration Status
```bash
npx prisma migrate status
```

### Create New Migration
```bash
npm run db:migrate
# Follow prompts to create a named migration
```

---

## 🐛 Troubleshooting

### Issue: "Database connection failed"
- Ensure PostgreSQL is running
- Check DATABASE_URL in .env
- Run: `psql postgresql://user:password@localhost:5432/visabuddy_dev`

### Issue: "Port 3000 already in use"
```bash
# Kill process on port 3000 (Windows)
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or use different port
PORT=3001 npm run dev
```

### Issue: "TypeScript errors"
```bash
npm run typecheck      # See detailed errors
npm install            # Reinstall dependencies
```

### Issue: "Prisma client not generated"
```bash
npm run db:generate
npm run db:migrate
```

---

## 📖 Phase 1 Implementation Status

- ✅ Authentication (Register, Login, Google OAuth)
- ✅ User Profile Management
- ✅ Countries & Visa Types browsing
- ✅ Visa Applications creation & tracking
- ✅ Checkpoint progress tracking
- ⏳ Document management (Phase 1.5)
- ⏳ Payment integration (Phase 2)
- ⏳ AI Chat service (Phase 2)

---

## 📞 Common Tasks

### Create a new API route
1. Create service in `src/services/`
2. Create routes in `src/routes/`
3. Import in `src/index.ts`
4. Test with curl or Postman

### Add new database model
1. Edit `prisma/schema.prisma`
2. Run `npm run db:migrate`
3. Name migration meaningfully
4. Regenerate client: `npm run db:generate`

### Reset database (remove all data)
```bash
npm run db:reset
# Runs all migrations from scratch
# Then seeds initial data
```

---

**Ready to code!** Start by implementing Phase 2 features or optimize Phase 1. 🎉