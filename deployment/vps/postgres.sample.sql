-- PostgreSQL Database Initialization for Ketdik
-- 
-- ⚠️ OPTIONAL: This file is only needed if you want to set up a LOCAL PostgreSQL database.
-- 
-- RECOMMENDED: Use Railway Postgres (remote database) instead.
-- - Get your DATABASE_URL from Railway dashboard
-- - No local PostgreSQL installation needed
-- - Database is already working with your Railway backend
--
-- Only use this file if:
-- - You want to move the database off Railway in the future
-- - You're deploying the full stack (backend + web) on VPS with local DB
--
-- Run these commands as the postgres superuser (or a user with CREATEDB privilege)
--
-- Note: Prisma migrations will create all tables automatically.
-- This file is only for initial database and user setup.

-- 1. Create database
CREATE DATABASE ketdik;

-- 2. Create user (optional, if you want a dedicated user)
CREATE USER ketdik_user WITH PASSWORD 'CHANGE_ME_STRONG_PASSWORD';

-- 3. Grant privileges
GRANT ALL PRIVILEGES ON DATABASE ketdik TO ketdik_user;

-- 4. Connect to the database and grant schema privileges
-- (Run these commands while connected to the ketdik database)
\c ketdik
GRANT ALL ON SCHEMA public TO ketdik_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ketdik_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ketdik_user;

-- 5. Update DATABASE_URL in .env.production:
-- DATABASE_URL=postgresql://ketdik_user:CHANGE_ME_STRONG_PASSWORD@localhost:5432/ketdik?schema=public

-- After running Prisma migrations, all tables will be created automatically.
-- Run: npm run db:migrate:deploy

