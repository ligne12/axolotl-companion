<div align="center">

# 🪷 Axolotl Companion

**Local-first AI companion** with a private LLM, a streaming chat UI, and an animated mascot.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Python 3.12+](https://img.shields.io/badge/python-3.12+-blue.svg)](https://www.python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)](https://www.typescriptlang.org/)
[![Caddy](https://img.shields.io/badge/proxy-Caddy%202-1f88c0.svg)](https://caddyserver.com/)
[![Let's Encrypt](https://img.shields.io/badge/TLS-Let's%20Encrypt-003a70.svg)](https://letsencrypt.org/)

</div>

---

## ✨ Features

- **Private LLM inference** — [vLLM](https://github.com/vllm-project/vllm) in Docker on your own GPU, model configurable via env vars (any vLLM-compatible repo). Developed against the **Qwen3.5 architecture** (hybrid reasoning toggle, `qwen3_coder` tool-call format); any Qwen3.5/3.6 model drops in via env, other families need a parser swap (see [`docs/models.md`](docs/models.md)).
- **Streaming chat** — SSE pipeline emits `reasoning.delta`, `message.delta`, `tool.call`, `tool.result` events; the UI renders reasoning blocks, web-search result cards and tool-call traces in real time.
- **Tool calling** — extensible built-in registry (`web_search` shipped, per-user toggle) **plus full MCP support**: per-user MCP servers with Fernet-encrypted bearer tokens, `initialize` + `Mcp-Session-Id` handshake, SSE / JSON-RPC parsing, manual sync, automatic tool-name namespacing, and dedicated chat cards for MCP results.
- **Personas** — named system prompts with full markdown bodies, default-per-user pin, per-session attach via the command palette.
- **Granular sampling controls** — global hyperparam defaults on the user (temperature, top_p, top_k, min_p, presence_penalty, repetition_penalty, max_tokens, `enable_thinking`), overridable per-session from a `Cmd+,` drawer with locale-aware slider labels.
- **Auth** — Auth.js v5 (credentials provider) → FastAPI JWT, bcrypt hashes, rotating refresh tokens, slowapi per-IP rate limiting on the auth endpoints (Redis-backed).
- **Custom design language** — pixel-neubru (warm cream paper, 2 px ink borders, electric-lime accent), dark/light theming, command palette (`Cmd+K`), keyboard-shortcut overlay, full-pass mobile polish.
- **3D animated mascot** — Blender-baked GLB with seven NLA clips (idle / listening / thinking / searching / typing / happy / confused), driven by Three.js with a 300 ms mood crossfade. The chibi reads its state through the body animation alone — no overlay glyphs cluttering the canvas.
- **Installable PWA** — Serwist service worker with NetworkOnly bypass on `/api/*` and on every navigation (post-rebuild redirect loops impossible by construction).
- **i18n FR / EN** — `next-intl` with cookie-based locale (no URL prefix, no SEO penalty), ICU plurals, locale-aware relative time, sidebar switcher pinned next to the theme toggle.
- **Real HTTPS, opt-in** — public hostname served with a Let's Encrypt cert via the **DNS-01** challenge (Cloudflare DNS plugin). Works behind NAT / CGNAT, no public IP, no port forwarding, no client-side CA install.
- **Observability** — Prometheus instrumentator on `/metrics` + custom signal (chat-stream outcomes & duration, tool calls by name, MCP sync). Grafana profile (`make obs`) ships a provisioned 10-panel overview board. Optional Langfuse traces wrap every chat round + tool call when credentials are set; no-op otherwise.
- **Security** — CSP headers with prod / dev splits, slim CORS allowlist, Fernet for third-party tokens at rest, Trivy image scans uploading SARIF to GitHub Code-scanning, Dependabot.
- **OpenAPI → TS types pipeline** — backend schema is the single source of truth; frontend types are regenerated, drift is enforced in CI.

## 🏗️ Stack

| Layer | Tech |
|---|---|
| LLM serving | **vLLM** (Docker, GPU), model configurable via `VLLM_MODEL` |
| Backend | **FastAPI** · Python 3.12 · **SQLModel** + Alembic · Pydantic v2 · structlog · uv |
| LLM client | OpenAI-compatible HTTP, SSE streaming, tool-calling rounds |
| Frontend | **Next.js 15** (App Router, RSC) · React 19 · TS strict · **Tailwind v4** · Radix UI · TanStack Query · Zod · Auth.js v5 |
| Data | **PostgreSQL 16** (citext, pgcrypto, pg_trgm) · **Redis 7** |
| Reverse proxy | **Caddy 2** (custom build with `caddy-dns/cloudflare` for DNS-01) |
| Orchestration | Docker Compose · `make`-driven workflows |
| Quality | Ruff · mypy strict · ESLint · `tsc --noEmit` · pytest · vitest · playwright |

## 🚀 Quick start

### Prerequisites

- NVIDIA GPU with enough VRAM for the model you plan to load
- Docker + NVIDIA Container Toolkit
- Linux or WSL2

### Launch

```bash
git clone <this-repo>
cd axolotl-companion
cp .env.example .env
# Edit .env: set HF_TOKEN, JWT_SECRET, FERNET_KEY, AUTH_SECRET, your model
make dev
```

Then open <https://chat.localhost> (Caddy serves a self-signed cert in dev — accept once).

### Configuring the model

Any vLLM-compatible model works. Edit `VLLM_MODEL` in `.env` (HuggingFace repo id or local path) plus the related knobs:

- Context window (`VLLM_MAX_MODEL_LEN`)
- KV cache dtype (`VLLM_KV_CACHE_DTYPE` — `fp8` / `auto`)
- Concurrent sequences (`VLLM_MAX_NUM_SEQS`)
- GPU memory utilisation (`VLLM_GPU_MEMORY_UTILIZATION`)
- Quantization passthrough (`VLLM_QUANTIZATION` — AWQ / GPTQ / NVFP4 / FP8)

See [`docs/models.md`](docs/models.md) for recommended profiles by GPU budget.

### Make targets

```bash
make dev              # Build + start the full stack with HMR
make prod             # Build + start with the prod overrides
make test             # Backend pytest + frontend vitest + e2e
make lint             # Lint + type-check both sides
make db-migrate       # Run pending Alembic migrations
make backup           # Snapshot the Postgres DB to ./backups/
make obs              # Add Prometheus + Grafana + Langfuse on top
make clean            # Stop + remove containers AND volumes (destructive)
```

## 🌐 Remote access (optional)

Out of the box, the stack only listens on `chat.localhost` from the host. To expose it to other devices on your Wi-Fi (or to your phone), point a public DNS A record at the host's LAN IP and let Caddy obtain a real Let's Encrypt cert via the **DNS-01** challenge — no NAT traversal, no port forwarding, no homemade CA install on the client.

Full walk-through in [`docs/deployment.md`](docs/deployment.md), including the optional Cloudflare Tunnel path for Internet-wide demo access.

TL;DR — set `APP_HOSTNAMES` and `CF_API_TOKEN` (Cloudflare DNS Zone:Edit) in `.env`, point an A record at your LAN IP in the Cloudflare dashboard (DNS-only, gray cloud), and `make dev` does the rest.

## 📚 Documentation

The repo ships with a structured docs tree under [`docs/`](docs/):

| File | Covers |
|---|---|
| [`docs/architecture.md`](docs/architecture.md) | Services, request routing, code layout |
| [`docs/auth.md`](docs/auth.md) | Auth.js v5 ↔ FastAPI JWT, refresh rotation, cookies |
| [`docs/database.md`](docs/database.md) | Postgres schema table-by-table, indexes, FK behaviour |
| [`docs/api.md`](docs/api.md) | REST + SSE reference with curl examples |
| [`docs/chat.md`](docs/chat.md) | Streaming chat pipeline, tool calling, reasoning |
| [`docs/features.md`](docs/features.md) | Personas, layered hyperparams, palette, drawer, tools |
| [`docs/deployment.md`](docs/deployment.md) | Local dev → public HTTPS → Cloudflare Tunnel |
| [`docs/models.md`](docs/models.md) | vLLM tuning per GPU tier |
| [`docs/adr/`](docs/adr/) | Architectural decision records |

## 📂 Repo layout

```
axolotl-companion/
├── backend/                 FastAPI + SQLModel + Alembic + uv
│   ├── src/axolotl/         FastAPI app: api/, db/, llm/, schemas/, services/
│   └── alembic/             Migrations
├── frontend/                Next.js 15 + Auth.js v5
│   └── src/
│       ├── app/             App Router routes (login, register, home, chat, settings)
│       ├── components/      chat/, hyperparams/, layout/, palette/, settings/, ui/
│       ├── hooks/           useApi, useChat
│       └── types/           API types (auto-generated from OpenAPI)
├── docker/
│   ├── proxy/               Caddy custom build (DNS-01 plugin)
│   └── vllm.Dockerfile
├── compose.yaml             Base Compose (dev-friendly, HMR)
├── compose.prod.yaml        Production overrides
├── docs/                    Reference docs (architecture, auth, database, api, chat, features, deployment, models) + ADRs
└── Makefile                 Unified workflow targets
```

## 🗺️ Architecture

### Request routing

```mermaid
flowchart LR
    Client[Browser / PWA]
    Caddy[Caddy 2<br/>tls internal · dev<br/>Let's Encrypt + DNS-01 · prod]
    Next[Next.js 15<br/>RSC + NextAuth]
    FastAPI[FastAPI<br/>SSE · auth · sessions · personas · tools]
    PG[(PostgreSQL 16)]
    Redis[(Redis 7)]
    vLLM[vLLM<br/>GPU inference]

    Client -->|https| Caddy
    Caddy -->|/api/auth/*| Next
    Caddy -->|/api/*| FastAPI
    Caddy -->|/| Next
    Next -.JWT.-> FastAPI
    FastAPI --> PG
    FastAPI --> Redis
    FastAPI -->|OpenAI-compatible<br/>SSE| vLLM
```

The `/api/*` split is same-origin, so the Next.js bundle uses a relative `NEXT_PUBLIC_API_URL=/api` and the **same build** serves any entry point (`chat.localhost`, public hostname, LAN IP) without per-deployment rebuilds.

### Streaming chat flow

```mermaid
sequenceDiagram
    participant U as User
    participant N as Next.js
    participant F as FastAPI
    participant V as vLLM

    U->>N: POST /api/v1/sessions/{id}/messages
    N->>F: forward (Authorization: Bearer …)
    F->>V: chat.completions (stream)
    loop while streaming
        V-->>F: token chunk
        alt reasoning token
            F-->>N: SSE reasoning.delta
        else content token
            F-->>N: SSE message.delta
        end
        N-->>U: useChat updates UI
    end
    opt tool call
        V-->>F: tool_call
        F-->>N: SSE tool.call
        F->>F: execute (web_search, …)
        F-->>N: SSE tool.result
        F->>V: continuation (with tool result)
    end
    V-->>F: finish
    F-->>N: SSE message.done
```

## 🛣️ Status

**The feature list above is the shipped surface.** Runs locally via
`make dev`, public HTTPS opt-in via `make dev` + `APP_HOSTNAMES`,
observability behind `make obs`. CI is green on every commit (backend
ruff + format + mypy strict + pytest, frontend `tsc` + ESLint, Docker
build + Trivy SARIF upload, pre-commit hooks enforced — gitleaks +
detect-private-key).

The deliberate parking-lot of follow-up ideas lives in [`plan.md` §7](plan.md) —
non-binding, each entry sized as a standalone slice:

- **Chibi-in-conversation** — pull the mascot into the chat shell so
  the seven moods react continuously while messages stream, plus a
  per-message frozen-mood avatar.
- **RAG memory** — star ⭐ an assistant bubble to persist it; pgvector
  + a small embeddings sidecar pull the top-K matches into the next
  chat's context.
- **Multimodal vision** — either drop the `--language-model-only`
  flag on the current Qwen3.5-9B (one env var, lose context budget),
  or hot-swap to [`GLM-OCR`](https://huggingface.co/zai-org/GLM-OCR) per session for OCR work.
- **Built-in tool wave** — `get_weather` (Open-Meteo), `fetch_url`
  (readability), `current_time`, `calculator`, `wikipedia_search`,
  `reminder` (cron + SSE), `recall_memory`. About one dev-day for
  the batch, big quality-of-life win.
- **Daily brief agent** — cron-driven session pre-built each morning
  (MCP + built-ins + a templated prompt).
- **Pin & widgets** — promote any assistant message to a persistent
  card on `/home`.
- **Chat search (BM25 + semantic)** — re-uses the embeddings sidecar
  from RAG memory; surfaced via Cmd+K.
- **Conversation branching, persona evolution, export / import** —
  smaller items, see `plan.md`.

## 📄 License

MIT — see [LICENSE](LICENSE).
