# ADR-002 — Why PostgreSQL (not SQLite or Supabase)

**Status** : Accepted
**Date** : 2026-04

## Context

We need a database to persist users, sessions, messages, personas, and settings,
with room to grow (multi-user, full-text search, analytics).

## Options considered

**SQLite**
- Pros: zero-setup, single file, great for solo use
- Cons: limited concurrent writes, weaker JSON support, not a realistic target for
  a multi-user deployment demo

**PostgreSQL**
- Pros: ACID, rich types (JSONB, arrays, `citext`), `pg_trgm` for search,
  battle-tested, scales with the project
- Cons: requires a running service (handled by Docker Compose)

**Supabase (self-hosted)**
- Pros: bundles Postgres + auth + realtime + storage
- Cons: extra moving parts; we prefer to own the auth flow to showcase the design

## Decision

**PostgreSQL 16 in Docker Compose.**

- Use `asyncpg` driver + SQLAlchemy 2.0 async
- Use SQLModel for the ORM layer (Pydantic-aligned)
- Alembic for migrations
- Enable `citext`, `pgcrypto`, `pg_trgm` extensions at init
- Keep an optional `scripts/migrate-to-supabase.sql` path for users who prefer
  Supabase

## Consequences

- One more container to orchestrate (manageable)
- Full control over auth schema and queries
- Clear migration path to hosted Postgres (Supabase, Neon, Railway) if needed
