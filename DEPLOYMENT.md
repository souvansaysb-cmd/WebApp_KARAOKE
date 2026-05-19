# 🚀 KARAOKE Web App — Deployment Guide

## 📋 Overview

This guide covers deploying the KARAOKE Web App using **Docker Compose** on a VPS (DigitalOcean, Linode, AWS EC2) or using **Vercel + Fly.io** for a serverless approach.

---

## 🐳 Option 1: Docker Compose (VPS — Recommended)

### Prerequisites

- A Linux VPS (Ubuntu 22.04+ recommended) with Docker & Docker Compose v2
- A domain name (e.g., `karaoke.yourdomain.com`)
- YouTube Data API key ([get one here](https://console.cloud.google.com))
- Firebase project with Auth enabled ([setup guide](https://firebase.google.com/docs/auth))

### Step 1: Clone & Prepare

```bash
ssh root@your-server
git clone https://github.com/YOUR_USERNAME/WebApp_KARAOKE.git /opt/karaoke
cd /opt/karaoke

# Create production .env file
cp .env.example .env.prod
nano .env.prod
```

### Step 2: Configure Environment Variables

Fill in `.env.prod` with your production values:

```bash
# PostgreSQL
POSTGRES_USER=karaoke
POSTGRES_PASSWORD=<generate-a-strong-password>
POSTGRES_DB=karaoke_db

# Backend
JWT_SECRET=<generate-a-long-random-string>
YOUTUBE_API_KEY=your_youtube_api_key_here

# Firebase (the full service account JSON as a single line)
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"your-project",...}'

# URLs
FRONTEND_URL=https://karaoke.yourdomain.com
NEXT_PUBLIC_API_URL=https://karaoke.yourdomain.com/api

# Firebase Frontend Config
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

### Step 3: Set Up SSL with Let's Encrypt

```bash
# Install certbot
apt install certbot

# Get certificate
certbot certonly --standalone -d karaoke.yourdomain.com

# Copy certs to the ssl directory
mkdir -p ssl
cp /etc/letsencrypt/live/karaoke.yourdomain.com/fullchain.pem ssl/cert.pem
cp /etc/letsencrypt/live/karaoke.yourdomain.com/privkey.pem ssl/key.pem

# Auto-renew (certbot sets up a timer automatically)
# After renewal, copy certs again:
certbot renew --post-hook "cp /etc/letsencrypt/live/karaoke.yourdomain.com/fullchain.pem /opt/karaoke/ssl/cert.pem && cp /etc/letsencrypt/live/karaoke.yourdomain.com/privkey.pem /opt/karaoke/ssl/key.pem && cd /opt/karaoke && docker-compose -f docker-compose.prod.yml restart nginx"
```

### Step 4: Deploy with Docker Compose

```bash
cd /opt/karaoke

# Set environment variables
set -a
source .env.prod
set +a

# Pull images and start
docker compose -f docker-compose.prod.yml up -d --build

# Check logs
docker compose -f docker-compose.prod.yml logs -f

# Verify all services are healthy
docker compose -f docker-compose.prod.yml ps
```

### Step 5: Verify Deployment

```bash
# Test backend API
curl https://karaoke.yourdomain.com/api/

# Test frontend
curl https://karaoke.yourdomain.com/

# Check WebSocket connectivity
curl -i -N -H "Upgrade: websocket" -H "Connection: Upgrade" https://karaoke.yourdomain.com/socket.io/
```

### Updating

```bash
cd /opt/karaoke
git pull

# Rebuild and restart
docker compose -f docker-compose.prod.yml up -d --build
```

---

## ⚡ Option 2: Vercel (Frontend) + Fly.io (Backend)

### Backend → Fly.io

```bash
# Install flyctl
curl -fsSL https://fly.io/install.sh | sh

# Login
fly auth login

# Create app
cd backend
fly launch --name karaoke-backend --region sin

# Set secrets
fly secrets set JWT_SECRET=<your-secret>
fly secrets set DATABASE_URL=postgresql://...
fly secrets set REDIS_URL=redis://...
fly secrets set YOUTUBE_API_KEY=<your-key>
fly secrets set FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'
fly secrets set FRONTEND_URL=https://karaoke.vercel.app
fly secrets set NODE_ENV=production

# Deploy
fly deploy

# Provision PostgreSQL and Redis
fly postgres create --name karaoke-db
fly redis create --name karaoke-redis

# Attach to app
fly postgres attach karaoke-db
fly redis attach karaoke-redis
```

### Frontend → Vercel

```bash
# Install Vercel CLI
npm i -g vercel

cd frontend
vercel login
vercel --prod

# Set environment variables in Vercel Dashboard:
# - NEXT_PUBLIC_API_URL: https://karaoke-backend.fly.dev
# - Firebase config variables
```

### Database Migration (Run Once)

```bash
fly ssh console -a karaoke-backend
npx prisma migrate deploy
exit
```

---

## 📋 Prisma Database Setup (Production)

The Prisma schema must use **PostgreSQL** in production:

```prisma
// backend/prisma/schema.prisma — Uncomment for production:
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Run migrations on first deploy:

```bash
# Docker: auto-runs via docker-compose.prod.yml command
# Manual:
npx prisma migrate deploy

# If starting fresh:
npx prisma migrate dev --name init
```

---

## 🛡️ Security Checklist

| Item | Status |
|------|--------|
| ✅ HTTPS enabled | Auto via nginx + Let's Encrypt |
| ✅ JWT_SECRET is a strong random string | Must set |
| ✅ Firebase Service Account secured | Must set |
| ✅ Database password changed from default | Must set |
| ✅ Redis has authentication (optional) | Add `REDIS_PASSWORD` |
| ✅ Rate limiting on API | Configured in nginx (30 req/s) |
| ✅ Security headers | CSP, XSS, X-Frame in nginx |
| ✅ CORS restricted | Backend allows only `FRONTEND_URL` |
| ✅ Secrets not committed to git | All in `.env.prod` / Fly secrets |
| ✅ Non-root user in Docker containers | `appuser` used |

---

## 📊 Monitoring & Maintenance

### Logs
```bash
# Docker
docker compose -f docker-compose.prod.yml logs -f --tail=100

# Fly.io
fly logs -a karaoke-backend
```

### Backups (PostgreSQL)
```bash
# Daily backup script (cron)
0 3 * * * docker exec karaoke-db pg_dump -U karaoke karaoke_db > /backups/karaoke_$(date +\%Y\%m\%d).sql

# Restore
cat backup.sql | docker exec -i karaoke-db psql -U karaoke karaoke_db
```

### Health Check
```bash
curl https://karaoke.yourdomain.com/api/version
# Expected: {"version":"0.0.1","status":"ok"}
```

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| Backend won't start | Check `docker compose logs backend` — likely missing env vars |
| Database connection failed | Ensure PostgreSQL is healthy: `docker compose ps` |
| WebSocket not connecting | Check nginx WebSocket proxy config; ensure `Upgrade` headers pass through |
| Firebase auth fails | Verify `FIREBASE_SERVICE_ACCOUNT` JSON is valid |
| YouTube search fails | Check `YOUTUBE_API_KEY` quota in Google Cloud Console |
| Frontend can't reach API | Check `NEXT_PUBLIC_API_URL` matches deployed backend URL |
| CORS errors | Verify `FRONTEND_URL` env var matches actual frontend domain |

---

## 📈 Scaling

- **Database**: Use managed PostgreSQL (Supabase, Neon, AWS RDS) instead of Docker
- **Redis**: Use managed Redis (Upstash, Redis Labs)
- **Backend**: Increase `docker compose scale backend=3`
- **Frontend**: Already serverless via Vercel; no scaling needed
- **CDN**: Put Cloudflare in front of nginx for DDoS protection + caching