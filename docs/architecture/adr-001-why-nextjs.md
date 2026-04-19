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
- Auth.js v5 is designed around Next.js (credentials provider + middleware patterns)
- PWA via Serwist is well-supported
- Ecosystem alignment (shadcn/ui, Vercel deployment option)
- Demonstrates current React standard patterns (RSC, Server Actions)

## Consequences

- App Router conventions apply (file-based routing, server/client components)
- Some pages can render on the server with data fetching; chat pages remain client-heavy
- Extra TypeScript config is needed for path aliases
- Deployment stays flexible: Docker image or Vercel
