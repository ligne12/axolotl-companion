# Axolotl Companion — Plan de développement

## 1. Vision

Companion chatbot local avec :
- **LLM privé** servi via vLLM (modèle configurable selon le GPU disponible)
- **Sprite axolotl animé** qui réagit aux états (thinking, searching, typing, idle...)
- **Tool calling** (web search, météo, date/heure)
- **Multi-session** avec historique persisté
- **PWA responsive** mobile + desktop
- **100% local par défaut**, déployable sur VPS ou Vercel (frontend)

## 2. Stack

| Layer | Technologie |
|---|---|
| LLM serving | vLLM (Docker, GPU) — modèle configurable |
| Backend | FastAPI + SQLModel + Alembic + uv |
| DB | PostgreSQL 16 |
| Cache | Redis 7 |
| Frontend | Next.js 15 (App Router, RSC) + TypeScript strict |
| Auth | **Auth.js v5** (credentials provider → JWT vers FastAPI) |
| UI | Tailwind v4 + shadcn/ui + Framer Motion |
| State | Zustand (client) + TanStack Query (server) |
| Validation | Zod (front) + Pydantic v2 (back) |
| Observabilité | Prometheus + Grafana + Langfuse (LLM traces) |
| CI/CD | GitHub Actions (lint, test, build, e2e) |
| Qualité | Ruff + mypy strict + ESLint + Vitest + Playwright |
| Orchestration | Docker Compose (profiles dev/prod/observability) |
| Proxy | Caddy (auto TLS en dev via mkcert) |

## 3. Architecture

```
Client (browser / PWA)
      │
      ▼
  Caddy  ────────── next.localhost (frontend)
   (reverse         api.localhost (backend)
    proxy)
      │
   ┌──┴────────┬────────────┬──────────┐
   ▼           ▼            ▼          ▼
 Next.js   FastAPI      Postgres    Redis
  :3000    :8001         :5432      :6379
              │
              ▼
           vLLM :8000 (GPU)
```

**Flux auth :**
1. User s'inscrit → Next.js `/api/auth/register` → FastAPI `/auth/register` → hash bcrypt en DB
2. User se connecte → Auth.js credentials provider → FastAPI `/auth/login` → retour JWT
3. Auth.js stocke le JWT dans une session cookie chiffrée (HttpOnly, SameSite=Lax)
4. Requêtes protégées : Next.js lit la session, forward le JWT à FastAPI en `Authorization: Bearer`
5. FastAPI valide le JWT (signature + expiration) → access user

**Flux chat streaming :**
1. User envoie un message → POST `/api/v1/chat/{session_id}/messages`
2. Backend ouvre SSE → stream des events `message.delta`, `tool.call`, `tool.result`, `message.done`
3. Frontend consomme via `EventSource` → met à jour le store Zustand
4. Axolotl state machine écoute les events → change l'animation

## 4. Schéma DB (Postgres)

```sql
-- users
id BIGSERIAL PK, username UNIQUE, email UNIQUE, password_hash,
avatar_url, created_at, updated_at

-- sessions
id BIGSERIAL PK, user_id FK, title, persona_id FK, model,
created_at, updated_at, archived BOOL

-- messages
id BIGSERIAL PK, session_id FK, role (user/assistant/tool/system),
content, reasoning, tool_calls JSONB, tool_call_id, metadata JSONB,
created_at, token_count

-- personas
id BIGSERIAL PK, user_id FK, name, system_prompt, params JSONB,
is_builtin BOOL

-- settings (key-value par user)
user_id FK, key, value JSONB, PK (user_id, key)

-- refresh_tokens
id, user_id FK, token_hash, expires_at, revoked_at

-- Index clés : sessions(user_id, updated_at DESC), messages(session_id, created_at)
```

## 5. API endpoints

### Auth
- `POST /auth/register`
- `POST /auth/login` → JWT + refresh
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

### Sessions
- `GET /v1/sessions` (liste paginée)
- `POST /v1/sessions` (nouvelle conv)
- `GET /v1/sessions/{id}` (détail + messages)
- `PATCH /v1/sessions/{id}` (rename, archive)
- `DELETE /v1/sessions/{id}`

### Chat
- `POST /v1/sessions/{id}/messages` → SSE stream
  - Events : `message.start`, `reasoning.delta`, `message.delta`, `tool.call`, `tool.result`, `message.done`, `error`

### Personas
- `GET /v1/personas`
- `POST /v1/personas`
- `PATCH /v1/personas/{id}`
- `DELETE /v1/personas/{id}`

### Settings
- `GET /v1/settings`
- `PUT /v1/settings` (batch)

### Export/Backup
- `GET /v1/export/sessions/{id}` → JSON téléchargeable
- `POST /v1/import/sessions` → upload JSON

## 6. Phases de dev

### Phase 0 — Setup repo (1 session) ⬅️ en cours
- Structure dirs, compose base, Dockerfiles, CI skeleton, README, licence
- vLLM dockerisé (migration de la commande actuelle)

### Phase 1 — Backend MVP (2-3 sessions)
- FastAPI + config Pydantic Settings
- Postgres + Alembic + SQLModel
- Auth JWT + bcrypt + refresh tokens
- Endpoints sessions, messages (SSE)
- Wrap du script actuel (web_search, streaming)
- Tests unit + intégration (pytest)

### Phase 2 — Frontend MVP (2-3 sessions)
- Next.js 15 + Tailwind v4 + shadcn/ui
- Auth.js v5 credentials
- Pages login/register
- Chat UI (messages, input, tool call cards)
- Hook useChat avec SSE
- Types générés depuis OpenAPI

### Phase 3 — Axolotl companion (2 sessions)
- Sprite sheet (pixel art ou SVG animé)
- State machine (XState ou custom)
- Animations Framer Motion
- Binding aux events chat

### Phase 4 — Polish (2 sessions)
- PWA (Serwist)
- Dark/light + theming
- Settings UI (persona, params, location)
- Export/import conversations
- i18n FR/EN

### Phase 5 — Observabilité + README (1-2 sessions)
- Prometheus + Grafana
- Langfuse LLM traces
- README léché (GIF demo, diagrams, badges)
- Deploy guides (local, VPS, Vercel)

**Total estimé** : 12-15 sessions

## 7. Hébergement

**Modes supportés (documentés dans README) :**

| Mode | Commande | Notes |
|---|---|---|
| Local dev | `make dev` | Compose avec HMR, Postgres local |
| Local prod | `make prod` | Compose optimisé, 1 machine |
| VPS | `docker compose -f compose.prod.yaml up -d` | Caddy TLS, secrets .env |
| Vercel (front only) | `vercel deploy` | Backend séparé (VPS ou Railway) |
| Railway | `railway up` | Full stack managed |

## 8. Conventions

- **Conventional Commits** (`feat:`, `fix:`, `docs:`, `chore:`, etc.)
- **Branches** : `main` (prod), `dev` (intégration), `feature/*`, `fix/*`
- **PR** : template avec checklist CI, screenshots UI
- **ADRs** dans `docs/architecture/adr-*.md`
- **Semver** + `CHANGELOG.md` généré

## 9. Sécurité checklist

- [ ] bcrypt (ou argon2) pour passwords
- [ ] JWT courte durée (15 min) + refresh rotatif
- [ ] CORS restrictif (origin whitelist)
- [ ] Rate limiting (slowapi + Redis)
- [ ] CSP headers Next.js
- [ ] Secrets jamais commit (pre-commit hook)
- [ ] Tokens tiers (HF_TOKEN) chiffrés en DB (Fernet)
- [ ] Trivy/Grype scan images Docker dans CI
- [ ] Dependabot activé
- [ ] HTTPS en prod (Caddy auto TLS)
