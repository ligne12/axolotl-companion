# ADR-001 — Why Next.js (not Vite)

**Status** : Accepted
**Date** : 2026-04
**Deciders** : ligne12

## Context

We need a frontend framework for a local-first PWA chat app with:
- Auth.js v5 integration
- Responsive mobile + desktop UI
- Installable as a PWA
- Route-based code-splitting
- Good DX

## Options considered

**Vite + React**
- Pros: very fast HMR, minimal config, bundles to static files, trivial to self-host
- Cons: no file-based routing out of the box, need to bolt on auth and PWA manually

**Next.js 15 (App Router)**
- Pros: file-based routing, React Server Components, first-class Auth.js v5 support,
  `next-pwa`/Serwist integration, server actions, widely recognised ecosystem
- Cons: heavier than Vite, some concepts (RSC, streaming) add cognitive load

**Remix / React Router 7**
- Pros: progressive enhancement, nested routes
- Cons: smaller ecosystem, less aligned with Auth.js patterns

## Decision

**Next.js 15 with App Router.**

Rationale:
- Auth.js v5 is designed around Next.js (credentials provider + middleware
  patterns); the same `auth()` helper is reused in middleware, server
  components and route handlers.
- PWA support via Serwist is first-class (manifest already wired; service
  worker pending — Phase 4).
- React Server Components + streaming map cleanly to our SSE chat flow:
  static shells render on the server, the `useChat` hook lights up on the
  client.
- Tailwind v4 + Radix UI primitives + a custom design system (pixel-neubru)
  give us the headless control we want without the ergonomic tax of a
  pure Vite + React setup.

## Consequences

- App Router conventions apply (file-based routing, server / client
  component split). The chat page is client-heavy by necessity (SSE);
  surrounding shells (settings, home) stay server-rendered.
- Extra TypeScript config is needed for path aliases (`@/components/*` etc.)
- Deployment stays flexible: Docker image (current setup) or any Node
  runtime if we eventually split frontend / backend hosting.
