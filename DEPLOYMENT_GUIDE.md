# VisaBuddy - Deployment Guide

**Version**: 1.0.0  
**Last Updated**: January 2025

---

## 🚀 Deployment Options

### 1. Docker Compose (Recommended for Development/Staging)

#### Prerequisites
- Docker >= 20.10
- Docker Compose >= 2.0

#### Steps

```bash
# 1. Clone repository
git clone <repository-url>
cd VisaBuddy

# 2. Create .env file
cp .env.example .env
# Edit .env with your values

# 3. Start services
docker-compose up -d

# 4. Run migrations
docker-compose exec backend npm run db:migrate

# 5. Check status
docker-compose ps
docker-compose logs -f backend
```

#### Access Services
- Backend API: http://localhost:3000
- AI Service: http://localhost:8001
- PostgreSQL: localhost:5432
- Redis: localhost:6379

---

### 2. Railway (Recommended for Production)

#### Steps

1. **Install Railway CLI**
   ```bash
   npm i -g @railway/cli
   railway login
   ```

2. **Create Project**
   ```bash
   railway init
   ```

3. **Add Services**
   - Add PostgreSQL database
   - Add Redis (optional)
   - Deploy backend service
   - Deploy AI service

4. **Set Environment Variables**
   ```bash
   railway variables set JWT_SECRET=your-secret
   railway variables set DATABASE_URL=${{Postgres.DATABASE_URL}}
   railway variables set REDIS_URL=${{Redis.REDIS_URL}}
   # ... add all other variables
   ```

5. **Deploy**
   ```bash
   railway up
   ```

---

### 3. Vercel/Netlify (Frontend Only)

#### Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd apps/frontend
vercel
```

#### Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
cd apps/frontend
netlify deploy --prod
```

---

### 4. AWS/GCP/Azure (Full Stack)

#### AWS (ECS/EKS)

1. **Build Docker Images**
   ```bash
   docker build -t visabuddy-backend ./apps/backend
   docker build -t visabuddy-ai ./apps/ai-service
   ```

2. **Push to ECR**
   ```bash
   aws ecr create-repository --repository-name visabuddy-backend
   docker tag visabuddy-backend:latest <account>.dkr.ecr.<region>.amazonaws.com/visabuddy-backend:latest
   docker push <account>.dkr.ecr.<region>.amazonaws.com/visabuddy-backend:latest
   ```

3. **Create ECS Task Definition**
   - Use provided task definition template
   - Set environment variables
   - Configure health checks

4. **Deploy**
   - Create ECS service
   - Configure load balancer
   - Set up auto-scaling

---

## 📋 Pre-Deployment Checklist

### Environment Variables
- [ ] All required environment variables set
- [ ] No secrets in code
- [ ] Production values configured
- [ ] CORS origins set correctly

### Database
- [ ] Database created and accessible
- [ ] Migrations run successfully
- [ ] Database backups configured
- [ ] Connection pooling configured

### Security
- [ ] JWT_SECRET is strong (32+ characters)
- [ ] CORS configured for production
- [ ] Rate limiting enabled
- [ ] HTTPS enabled
- [ ] Security headers configured

### Services
- [ ] External services configured (Firebase, OpenAI, etc.)
- [ ] API keys valid and have proper permissions
- [ ] Webhook URLs configured
- [ ] Email service configured

### Monitoring
- [ ] Health check endpoints working
- [ ] Logging configured
- [ ] Error tracking set up (Sentry, etc.)
- [ ] Performance monitoring enabled

### Testing
- [ ] All tests passing
- [ ] Load testing completed
- [ ] Security testing completed
- [ ] End-to-end testing completed

---

## 🔧 Production Configuration

### Environment Variables Template

```env
# Server
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Security
JWT_SECRET=<generate-strong-secret-32-chars>
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com

# Services
OPENAI_API_KEY=sk-...
FIREBASE_PROJECT_ID=...
STRIPE_SECRET_KEY=sk_live_...
# ... other service keys
```

### Nginx Configuration (if using reverse proxy)

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 📊 Monitoring & Health Checks

### Health Check Endpoints

```bash
# Basic health
curl https://api.yourdomain.com/api/health

# Detailed health
curl https://api.yourdomain.com/api/health/detailed

# Readiness (for Kubernetes)
curl https://api.yourdomain.com/api/health/ready

# Liveness (for Kubernetes)
curl https://api.yourdomain.com/api/health/live
```

### Monitoring Setup

1. **Application Monitoring**
   - Set up Sentry for error tracking
   - Configure APM (New Relic, Datadog, etc.)
   - Set up log aggregation (Loggly, Papertrail, etc.)

2. **Infrastructure Monitoring**
   - Set up uptime monitoring (Pingdom, UptimeRobot)
   - Configure alerts for health check failures
   - Monitor database performance

---

## 🔄 CI/CD Pipeline

### GitHub Actions Example

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build
        run: npm run build
      
      - name: Deploy to Railway
        run: railway up
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

---

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check DATABASE_URL format
   - Verify database is accessible
   - Check firewall rules

2. **Service Unavailable**
   - Check health endpoints
   - Review logs: `docker-compose logs backend`
   - Verify environment variables

3. **CORS Errors**
   - Check CORS_ORIGIN in environment
   - Verify frontend URL is in allowed origins
   - Check browser console for specific error

4. **Rate Limiting Issues**
   - Check Redis connection
   - Verify rate limit configuration
   - Review rate limit logs

---

## 📝 Post-Deployment

1. **Verify Deployment**
   - Test all endpoints
   - Check health status
   - Verify external services

2. **Monitor**
   - Watch error logs
   - Monitor performance
   - Check database queries

3. **Optimize**
   - Review slow queries
   - Optimize caching
   - Adjust rate limits

---

**Last Updated**: January 2025









