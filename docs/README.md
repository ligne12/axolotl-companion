# Documentation

Reference docs for the project, organised by what you're trying to do.

## Reading order

If you're new to the codebase:

1. [`architecture.md`](architecture.md) — the overall picture: services,
   request routing, deployment topology
2. [`auth.md`](auth.md) — how Auth.js v5 (frontend) and FastAPI JWT (backend)
   compose into a single authenticated request
3. [`database.md`](database.md) — Postgres schema, table by table, with the
   FK behaviour and the indexes that matter
4. [`api.md`](api.md) — REST endpoints reference with curl examples; SSE
   event protocol for the streaming chat
5. [`chat.md`](chat.md) — how a single message becomes a streamed reply
   (multi-round tool calling, reasoning extraction, persistence)
6. [`features.md`](features.md) — feature-level deep-dives (personas,
   layered hyperparams, command palette, controls drawer, tool registry)

## Operational

- [`deployment.md`](deployment.md) — local dev, public hostname via
  Let's Encrypt + DNS-01, optional Cloudflare Tunnel for Internet-wide demo
  access
- [`models.md`](models.md) — vLLM model configuration: tested profiles, KV
  cache and memory tuning, recommended models per VRAM tier

## Decision records

ADRs in [`adr/`](adr/) capture the *why* behind a few decisions:

- [`adr/001-nextjs.md`](adr/001-nextjs.md) — Next.js 15 over Vite / Remix
- [`adr/002-postgres.md`](adr/002-postgres.md) — Postgres over SQLite / Supabase
- [`adr/003-auth-strategy.md`](adr/003-auth-strategy.md) — two-layer auth
  rationale

The ADRs are supplementary. The primary "how it works" lives in `auth.md`,
`database.md`, etc.
