# Architecture

## High-level diagram

```
┌───────────────────────────────────────────────────┐
│                  Caddy (reverse proxy)             │
│         *.localhost  →  automatic self-signed TLS  │
└─────────────┬─────────────────────┬───────────────┘
              │                     │
   chat.localhost               api.localhost
              │                     │
        ┌─────▼─────┐         ┌─────▼────────┐
        │  Next.js  │         │   FastAPI    │
        │  :3000    │ ─HTTP──▶│   :8001      │
        └───────────┘  JWT    └─────┬────────┘
                                    │
                 ┌──────────────────┼───────────────┐
                 │                  │               │
            ┌────▼────┐       ┌─────▼─────┐    ┌────▼────┐
            │Postgres │       │  Redis    │    │  vLLM   │
            │  :5432  │       │  :6379    │    │  :8000  │
            └─────────┘       └───────────┘    └─────────┘
```

## Data flow — chat message

```
User types message in the frontend
       │
       ▼
Next.js POST /api/sessions/:id/messages  (Bearer JWT)
       │
       ▼
FastAPI /v1/sessions/:id/messages
       │
       ├─ persist user message to Postgres
       │
       └─ open SSE stream, call vLLM /v1/chat/completions
              │
              ▼
       stream deltas back to client:
         - message.start
         - reasoning.delta (think tokens)
         - message.delta   (response tokens)
         - tool.call       (if model requests a tool)
         - tool.result     (after execution)
         - message.done    (finish_reason, usage)
              │
              ▼
       persist assistant message + metadata
```

## ADRs

Architectural decisions are documented as ADRs:

- [ADR-001 — Why Next.js](adr-001-why-nextjs.md)
- [ADR-002 — Why Postgres](adr-002-why-postgres.md)
- [ADR-003 — Auth strategy (Auth.js ↔ FastAPI JWT)](adr-003-auth-strategy.md)
