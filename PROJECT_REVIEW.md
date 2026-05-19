# 🔍 KARAOKE Web App — Project Review & Improvement Plan

> **Review Date:** 2026-05-19  
> **Reviewer:** Senior Full-Stack Architect  
> **Scope:** Backend (NestJS), Frontend (Next.js), Database (Prisma), DevOps, Security, UX

---

## 📊 Executive Summary

The project has a **solid foundation** with functional authentication, YouTube search, queue management, voting, chat, and real-time WebSocket updates. However, there are **critical structural, security, and architectural gaps** that must be addressed before the app is production-ready.

| Category | Status | Priority |
|----------|--------|----------|
| Core Features | 🟡 Functional but basic | Medium |
| Code Quality | 🟡 Inconsistent types, some `any` | Medium |
| Security | 🔴 Multiple vulnerabilities | **Critical** |
| Database | 🔴 SQLite/PostgreSQL mismatch | **Critical** |
| Project Structure | 🔴 Duplicates, orphaned files | **Critical** |
| Real-time | 🟡 Working but incomplete | Medium |
| Testing | 🔴 Zero meaningful tests | High |
| DevOps/Deploy | 🔴 No Docker, no CI/CD | High |
| UX/Polish | 🟡 Dark mode only, missing animations | Low |

---

## 🔴 Critical Issues (Fix Immediately)

### 1. Database Provider Mismatch — CRITICAL
**Problem:** `docker-compose.yml` provisions **PostgreSQL**, `.env.example` points to `postgresql://`, but `backend/prisma/schema.prisma` is configured for **SQLite**.

```prisma
// backend/prisma/schema.prisma
datasource db {
  provider = "sqlite"   // ❌ WRONG
  url      = env("DATABASE_URL")
}
```

**Impact:** App will fail to connect to the Docker database. Migrations will target SQLite, not PostgreSQL.

**Fix:** Change provider to `postgresql` and update `DATABASE_URL` logic.

---

### 2. Duplicate/Conflicting Directory Structure — CRITICAL
**Problem:** There are **two** backend directories and **two** Prisma schemas:
- `backend/prisma/schema.prisma` (SQLite, used by app)
- `backend/backend/prisma/schema.prisma` (orphaned duplicate)
- Root-level `src/` and `components/` folders (orphaned, not part of any workspace)

**Impact:** Confusion, stale code, potential deployment of wrong files.

**Fix:** Clean up orphaned folders. Decide on monorepo strategy (npm workspaces, Nx, or Turborepo).

---

### 3. WebSocket Authentication Not Implemented — CRITICAL
**Problem:** The WebSocket gateway accepts `token` in `auth` handshake but **never verifies it**.

```typescript
// frontend
const newSocket = io("...", { auth: { token: token } });

// backend gateway — NO auth verification!
handleConnection(client: Socket) {
  // Anyone can connect. No token check.
}
```

**Impact:** Anonymous users can connect to WebSocket, receive queue data, and trigger broadcasts. Complete bypass of JWT protection.

**Fix:** Implement a `WsJwtGuard` or manual token verification in `handleConnection`.

---

### 4. No Global Validation Pipe — CRITICAL
**Problem:** `main.ts` does not configure `ValidationPipe`. DTOs with `@IsString()`, `@IsNotEmpty()` are **never enforced**.

```typescript
// Missing from main.ts:
// app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
```

**Impact:** Invalid request bodies pass through silently. Malformed data can corrupt the database.

**Fix:** Add `ValidationPipe` globally.

---

### 5. Firebase Fallback Is Insecure — CRITICAL
**Problem:** If `FIREBASE_SERVICE_ACCOUNT` is missing, the app falls back to `admin.initializeApp()` without credentials.

```typescript
try {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}')),
  });
} catch (error) {
  admin.initializeApp(); // ❌ No credential = broken/unverified auth
}
```

**Impact:** In production, this could initialize Firebase with default credentials (or fail), making token verification unreliable.

**Fix:** Halt startup if Firebase credentials are missing in production. Only allow fallback in dev.

---

### 6. Redis Connection Per Service — HIGH
**Problem:** `YoutubeService` instantiates its own `new Redis()`. If multiple services use Redis, each creates a separate connection pool.

**Fix:** Create a `RedisModule` that provides a shared Redis client via DI.

---

## 🟡 High-Priority Issues

### 7. Zero Security Headers / No Helmet
**Problem:** No `helmet()`, no rate limiting, no CORS restrictions on methods/headers.

**Fix:** Add `helmet()`, `express-rate-limit`, and tighten CORS.

---

### 8. Missing WebSocket Chat Gateway Events
**Problem:** Frontend expects `chat_initialized` and `message_added` events, but `QueueGateway` only handles queue events. There is **no chat gateway**.

**Fix:** Create a `ChatGateway` that broadcasts new messages and sends initial history on connection.

---

### 9. Queue Does Not Sort by Votes
**Problem:** The queue is sorted by `position: 'asc'`, not by vote count. The spec says "top 5 songs automatically moved up."

```typescript
// queue.service.ts
orderBy: { position: 'asc' }  // ❌ Ignores votes
```

**Fix:** Implement vote-based sorting. Update positions when votes change.

---

### 10. No Environment Validation
**Problem:** App starts even if `DATABASE_URL`, `JWT_SECRET`, or `YOUTUBE_API_KEY` are missing. Failures happen at runtime.

**Fix:** Use `joi` or `zod` to validate `process.env` at bootstrap. Fail fast.

---

### 11. `any` Types Everywhere
**Problem:** `req: any`, `data: any`, `socket: any`, `@MessageBody() data: any`.

**Fix:** Replace with proper types (`RequestWithUser`, DTOs, `Socket` types).

---

### 12. No Error Boundaries / No Toast System (Frontend)
**Problem:** API errors are only `console.error`. Users see no feedback. Broken thumbnails crash nothing but look ugly.

**Fix:** Add a toast/notification system (Sonner or React-Toastify). Add `onError` image handlers.

---

### 13. No Request Logging / No Observability
**Problem:** No request logging, no performance metrics, no health check endpoint.

**Fix:** Add NestJS `LoggerMiddleware`, a `/health` endpoint, and consider Pino/Winston for structured logging.

---

### 14. Chat Message Ordering Is Wrong
**Problem:** `ChatDisplay` prepends new messages (`[message, ...prev]`), so newest appears at top. Chat UIs should show oldest at top (or auto-scroll to bottom).

**Fix:** Append messages, auto-scroll to bottom.

---

### 15. No Input Sanitization (XSS Risk)
**Problem:** Chat messages and comments are stored raw. No HTML escaping or sanitization.

**Fix:** Sanitize input with `dompurify` or similar before rendering.

---

## 🟢 Medium / Low Priority

### 16. Missing UI Dependencies
- No `framer-motion` (spec requires animations)
- No `lucide-react` or icon library (using emojis)
- No `tailwind-merge` / `clsx` for class composition
- No skeleton loading states

### 17. No Admin Panel / Analytics
- Spec requires admin dashboard, user management, analytics.
- No role-based UI guards (only backend has `RolesGuard` but it's unused).

### 18. No Video Playback / Lyrics
- Core karaoke feature missing: no player page, no lyrics sync.

### 19. No Tests
- NestJS default `.spec.ts` files exist but likely fail or are boilerplate.
- Zero frontend tests (no React Testing Library, no Cypress/Playwright).

### 20. No CI/CD / No Dockerfiles
- No `Dockerfile` for backend or frontend.
- No GitHub Actions for lint/test/build/deploy.

---

## 🗂️ Recommended File Structure (Cleaned)

```
WebApp_KARAOKE/
├── apps/
│   ├── backend/              # NestJS
│   │   ├── src/
│   │   ├── prisma/
│   │   ├── Dockerfile
│   │   └── package.json
│   └── frontend/             # Next.js
│       ├── src/
│       ├── public/
│       ├── Dockerfile
│       └── package.json
├── packages/
│   └── shared/               # Shared types, DTOs, utilities
├── docker-compose.yml
├── docker-compose.prod.yml
├── .github/
│   └── workflows/
│       └── ci.yml
├── package.json              # Root workspace config (npm workspaces)
└── README.md
```

---

## ✅ Improvement Plan (Phased)

### Phase 1: Critical Fixes (Week 1)
- [ ] Fix Prisma provider → `postgresql`
- [ ] Add `ValidationPipe` to `main.ts`
- [ ] Implement WebSocket JWT authentication
- [ ] Fix Firebase bootstrap (fail fast in prod)
- [ ] Create shared `RedisModule`
- [ ] Clean up orphaned/duplicate directories
- [ ] Add environment validation (`joi` / `zod`)

### Phase 2: Security & Stability (Week 2)
- [ ] Add `helmet`, rate limiting, CORS hardening
- [ ] Add request logging middleware
- [ ] Add `/health` endpoint
- [ ] Sanitize chat/comment inputs (XSS prevention)
- [ ] Fix `any` types across backend
- [ ] Add proper error handling to WebSocket gateway

### Phase 3: Features & Real-time (Week 3)
- [ ] Create `ChatGateway` for real-time chat events
- [ ] Implement vote-based queue sorting
- [ ] Auto-update queue positions on vote
- [ ] Add WebSocket reconnection logic on frontend
- [ ] Fix chat message ordering + auto-scroll

### Phase 4: Frontend Polish (Week 4)
- [ ] Add toast notification system (Sonner)
- [ ] Add loading skeletons / error boundaries
- [ ] Add `framer-motion` for transitions
- [ ] Add `lucide-react` icons
- [ ] Add image fallback for broken thumbnails
- [ ] Improve mobile responsiveness

### Phase 5: Testing & DevOps (Week 5)
- [ ] Write backend unit tests (Jest) — target 70%+
- [ ] Add frontend component tests (RTL)
- [ ] Add E2E tests (Playwright or Cypress)
- [ ] Create Dockerfiles for both services
- [ ] Set up GitHub Actions CI/CD pipeline
- [ ] Add production docker-compose

### Phase 6: Advanced Features (Week 6+)
- [ ] Admin dashboard with analytics
- [ ] Video playback page with YouTube embed
- [ ] Lyrics integration (Lyrics.ovh or similar)
- [ ] User profiles & favorites
- [ ] Song history / playlist creation
- [ ] Multi-room support

---

## ✅ Phase 1 Completed (2026-05-19)

The following critical fixes have been implemented:

- [x] **Prisma provider → postgresql** — `backend/prisma/schema.prisma`
- [x] **ValidationPipe** — Added globally in `main.ts` with `whitelist`, `transform`, `forbidNonWhitelisted`
- [x] **WebSocket JWT guard** — Created `WsJwtGuard` at `backend/src/auth/guards/ws-jwt.guard.ts`
- [x] **Queue gateway auth** — `QueueGateway.handleConnection` now authenticates via `WsJwtGuard`
- [x] **Chat gateway** — Created `ChatGateway` at `backend/src/chat/chat.gateway.ts` with `/chat` namespace
- [x] **Shared Redis module** — Created `RedisModule` at `backend/src/redis/redis.module.ts` (global singleton)
- [x] **YoutubeService refactored** — Now uses shared Redis via DI instead of `new Redis()`
- [x] **Firebase bootstrap fixed** — Fails fast in production if credentials missing
- [x] **Environment validation** — Added `validateEnv()` in `backend/src/config/env.validation.ts`
- [x] **Orphaned directories removed** — `backend/backend/`, root `src/`, root `components/` deleted
- [x] **Queue vote sorting** — `getQueueState()` now sorts by `voteCount desc, position asc`
- [x] **Vote recalculation** — `addVote()` calls `recalculateVoteCount()` after each vote
- [x] **Chat message ordering fixed** — Frontend appends new messages at bottom with auto-scroll
- [x] **Chat WebSocket** — Frontend connects to `/chat` namespace, sends via `send_message` event
- [x] **CORS hardened** — Explicit `methods` and `allowedHeaders` in `main.ts`

## 🎯 Next Quick Wins (Phase 2)
- [ ] Add `helmet`, rate limiting
- [ ] Add request logging middleware
- [ ] Add `/health` endpoint
- [ ] Sanitize chat/comment inputs (XSS prevention)
- [ ] Fix `any` types across backend
- [ ] Add toast notification system (Sonner)
- [ ] Add loading skeletons / error boundaries

---

## 📈 Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Type Safety (`any` count) | ~15+ | 0 |
| Test Coverage | ~0% | 70%+ |
| Security Headers | None | All (Helmet) |
| WS Auth | None | JWT verified |
| Env Validation | None | Strict |
| Production Deploy | None | Docker + CI/CD |

---

> **Bottom Line:** The app works as a prototype but needs significant hardening before production. Focus on **Phase 1 (Critical Fixes)** and **Phase 2 (Security)** first — these are non-negotiable. Features can wait; security and stability cannot.
