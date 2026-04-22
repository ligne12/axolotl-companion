# Axolotl Companion — Development plan

## 1. Vision

A local-first chatbot companion featuring:
- **Private LLM** served via vLLM (model is user-configurable based on the GPU at hand)
- **Animated axolotl sprite** that reacts to internal states (thinking, searching, typing, idle, ...)
- **Tool calling** (web search, weather, date/time)
- **Multi-session chat** with persistent history
- **Responsive PWA** for mobile and desktop
- **100% local by default**, deployable to a VPS or Vercel (frontend) when needed

## 2. Stack

| Layer | Technology |
|---|---|
| LLM serving | vLLM (Docker, GPU) — configurable model |
| Backend | FastAPI + SQLModel + Alembic + uv |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Frontend | Next.js 15 (App Router, RSC) + TypeScript strict |
| Auth | **Auth.js v5** (credentials provider → JWT to FastAPI) |
| UI | Tailwind v4 + shadcn/ui + Framer Motion |
| State | Zustand (client) + TanStack Query (server) |
| Validation | Zod (front) + Pydantic v2 (back) |
| Observability | Prometheus + Grafana + Langfuse (LLM traces) |
| CI/CD | GitHub Actions (lint, test, build, e2e) |
| Quality | Ruff + mypy strict + ESLint + Vitest + Playwright |
| Orchestration | Docker Compose (profiles dev/prod/observability) |
| Proxy | Caddy (automatic TLS in dev via mkcert) |

## 3. Architecture

```
Client (browser / PWA)
      │
      ▼
  Caddy  ────────── chat.localhost (frontend)
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

**Auth flow:**
1. User signs up → Next.js `/api/auth/register` → FastAPI `/auth/register` → bcrypt hash stored in DB
2. User logs in → Auth.js credentials provider → FastAPI `/auth/login` → JWT returned
3. Auth.js stores the JWT in an encrypted session cookie (HttpOnly, SameSite=Lax)
4. Protected requests: Next.js reads the session, forwards the JWT to FastAPI as `Authorization: Bearer`
5. FastAPI validates the JWT (signature + expiration) → authorizes the user

**Streaming chat flow:**
1. User sends a message → POST `/api/v1/chat/{session_id}/messages`
2. Backend opens an SSE stream → emits events `message.delta`, `tool.call`, `tool.result`, `message.done`
3. Frontend consumes via `EventSource` → updates the Zustand store
4. Axolotl state machine listens to those events → changes the animation

## 4. Database schema (Postgres)

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

-- settings (per-user key-value)
user_id FK, key, value JSONB, PK (user_id, key)

-- refresh_tokens
id, user_id FK, token_hash, expires_at, revoked_at

-- Key indexes: sessions(user_id, updated_at DESC), messages(session_id, created_at)
```

## 5. API endpoints

### Auth
- `POST /auth/register`
- `POST /auth/login` → access JWT + refresh token
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

### Sessions
- `GET /v1/sessions` (paginated list)
- `POST /v1/sessions` (new conversation)
- `POST /v1/sessions/{id}/messages` → SSE stream
  - Events: `message.start`, `reasoning.delta`, `message.delta`, `tool.call`, `tool.result`, `message.done`, `error`
- `GET /v1/sessions/{id}` (detail + messages)
- `PATCH /v1/sessions/{id}` (rename, archive)
- `DELETE /v1/sessions/{id}`

### Personas
- `GET /v1/personas`
- `POST /v1/personas`
- `PATCH /v1/personas/{id}`
- `DELETE /v1/personas/{id}`

### Settings
- `GET /v1/settings`
- `PUT /v1/settings` (batch update)

### Export / backup
- `GET /v1/export/sessions/{id}` → downloadable JSON
- `POST /v1/import/sessions` → upload JSON

## 6. Development phases

### Phase 0 — Repo setup ✅ done
- Directory structure, base Compose, Dockerfiles, CI skeleton, README, license
- Dockerised vLLM (model configurable via env vars)

### Phase 1 — Backend MVP ✅ done
- FastAPI + Pydantic Settings config
- Postgres + Alembic + SQLModel (initial migration committed)
- Auth: JWT + bcrypt + rotating refresh tokens
- Sessions CRUD + authz
- Chat SSE endpoint wrapping vLLM with tool calling
- Extensible tool registry + per-user enable/disable via `/v1/tools`
- Unit + integration tests (pytest, NullPool for asyncio stability)

### Phase 2 — Frontend MVP ⬅️ current
- Next.js 15 + Tailwind v4 + shadcn/ui
- Auth.js v5 credentials provider
- Login / register pages
- Chat UI (messages, input, tool-call cards)
- `useChat` hook with SSE
- Types auto-generated from OpenAPI

### Phase 3 — Axolotl companion
- Sprite sheet (pixel art or animated SVG)
- State machine (XState or custom)
- Framer Motion animations
- Binding to chat events

### Phase 4 — Polish
- PWA (Serwist)
- Dark / light theming (toggle shipped; palette refinement pending)
- Settings UI:
  - **Personas** CRUD — name + system prompt + per-persona defaults
  - **Profile** — edit username, avatar, locality (locality feeds the
    terminal footer's `LOCAL` tag, e.g. `● LOCAL · MONTPELLIER`)
  - **Model** — per-session model picker + generation hyperparameters
    (temperature, top_p, top_k, min_p, presence_penalty, repetition_penalty,
    max_tokens) with a reset-to-defaults button
  - **Reasoning** — toggle `enable_thinking` off per-session so the model
    skips the `<think>` phase when the user wants a straight answer
  - **MCP servers** — CRUD on connected MCP servers (add, edit, remove,
    toggle). Each server exposes a set of tools that plug into the same
    registry as the built-in ones; per-user enable/disable lands on the
    existing Tools page alongside `web_search`.
- Export / import conversations
- i18n FR / EN

### Phase 5 — Observability + README polish
- Prometheus + Grafana dashboards
- Langfuse LLM traces
- Polished README (demo GIF, diagrams, badges)
- Deployment guides (local, VPS, Vercel)

## 7. Hosting

**Supported modes (documented in README):**

| Mode | Command | Notes |
|---|---|---|
| Local dev | `make dev` | Compose with HMR, local Postgres |
| Local prod | `make prod` | Optimised Compose, single machine |
| VPS | `docker compose -f compose.prod.yaml up -d` | Caddy TLS, secrets via `.env` |
| Vercel (frontend only) | `vercel deploy` | Backend hosted separately (VPS or Railway) |
| Railway | `railway up` | Full stack managed |

## 8. Conventions

- **Conventional Commits** (`feat:`, `fix:`, `docs:`, `chore:`, ...)
- **Branches**: `main` (prod), `dev` (integration), `feat/*`, `fix/*`
- **PRs**: template with CI checklist and UI screenshots
- **ADRs** live in `docs/architecture/adr-*.md`
- **SemVer** + generated `CHANGELOG.md`

## 9. Security checklist

- [ ] bcrypt (or argon2) for passwords
- [ ] Short-lived JWT (15 min) + rotating refresh tokens
- [ ] Restrictive CORS (origin whitelist)
- [ ] Rate limiting (slowapi + Redis)
- [ ] CSP headers in Next.js
- [ ] Secrets never committed (pre-commit hook)
- [ ] Third-party tokens (e.g. `HF_TOKEN`) encrypted at rest in DB (Fernet)
- [ ] Trivy / Grype image scans in CI
- [ ] Dependabot enabled
- [ ] HTTPS in prod (Caddy auto TLS)
