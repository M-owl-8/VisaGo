/**
 * PM2 Ecosystem Configuration for Ketdik VPS Deployment
 * 
 * This file configures PM2 to run the web app service (and optionally the backend).
 * 
 * Recommended Setup (Railway Backend + VPS Web):
 *   - Only ketdik-web will be used (backend stays on Railway)
 *   - Backend service in this config can be ignored or removed
 * 
 * Alternative Setup (Full VPS):
 *   - Both ketdik-backend and ketdik-web will run
 *   - Backend connects to Railway Postgres (remote database)
 * 
 * Usage:
 *   pm2 start deployment/vps/pm2.ecosystem.config.cjs
 *   pm2 save  # Save configuration for auto-start on reboot
 * 
 * Note: Run this command from the repository root directory.
 * The relative paths (./apps/backend, ./apps/web) are relative to the repo root.
 * 
 * If backend is on Railway, PM2 will attempt to start ketdik-backend but it will fail
 * gracefully if backend dependencies aren't needed. You can remove the backend app
 * from this config if you're only deploying the web app.
 */

module.exports = {
  apps: [
    {
      // Backend API Service
      name: 'ketdik-backend',
      cwd: './apps/backend',
      script: 'npm',
      args: 'run start:prod',
      interpreter: 'none',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
      error_file: '../logs/backend-error.log',
      out_file: '../logs/backend-out.log',
      log_file: '../logs/backend-combined.log',
      time: true,
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '1G',
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'dist'],
    },
    {
      // Next.js Web App Service
      name: 'ketdik-web',
      cwd: './apps/web',
      script: 'npm',
      args: 'run start:prod',
      interpreter: 'none',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '../logs/web-error.log',
      out_file: '../logs/web-out.log',
      log_file: '../logs/web-combined.log',
      time: true,
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '1G',
      watch: false,
      ignore_watch: ['node_modules', '.next', 'logs'],
    },
  ],
};

