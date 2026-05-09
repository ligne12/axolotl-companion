# Authentication

Two layers compose into a single authenticated request:

- **Auth.js v5** on the frontend manages the browser session — the cookie,
  the refresh-on-expiry logic, the `/login` and `/register` form flow.
- **FastAPI** issues short-lived JWTs and stateful refresh tokens, and
  validates the JWT on every protected call.

The split keeps FastAPI stateless on the request path (pure signature
verification, no DB hit) while keeping refresh tokens revocable.

## Login flow

```mermaid
sequenceDiagram
    participant U as User
    participant N as Next.js
    participant A as Auth.js v5
    participant F as FastAPI
    participant DB as Postgres

    U->>N: POST /login (username, password)
    N->>A: signIn("credentials")
    A->>F: POST /auth/login
    F->>DB: SELECT user WHERE username=?
    F->>F: bcrypt.checkpw(password, password_hash)
    F->>F: create_access_token (JWT, 15 min)
    F->>F: create_refresh_token (random, 30 days)
    F->>DB: INSERT refresh_tokens (token_hash)
    F-->>A: { access_token, refresh_token, *_expires_at }
    A->>A: pack into encrypted session cookie<br/>(AUTH_SECRET-derived, HttpOnly, SameSite=Lax)
    A-->>U: 302 → /home
```

## Authorized request

Every server-side fetch from Next.js to FastAPI rides the access token:

```mermaid
sequenceDiagram
    participant U as User (browser)
    participant N as Next.js (server)
    participant F as FastAPI

    U->>N: GET /chat/abc123 (session cookie attached)
    N->>N: auth() reads + decrypts session
    N->>F: GET /v1/sessions/abc123<br/>Authorization: Bearer <access_token>
    F->>F: jwt.decode (HS256, signature + exp)
    F->>F: get_current_user dependency<br/>SELECT user WHERE id=?
    F-->>N: 200 OK + JSON
    N-->>U: rendered page
```

Client-side fetches (e.g. from the chat hook) follow the same shape — the
token is forwarded by the API helper at `frontend/src/hooks/use-api.ts`.

## Refresh

Access tokens last 15 minutes (configurable via `JWT_ACCESS_EXPIRE_MINUTES`).
The Auth.js `jwt` callback in `frontend/src/auth.ts` watches the
`accessTokenExpiresAt` field and refreshes proactively when within 60 s
of expiry:

```mermaid
sequenceDiagram
    participant A as Auth.js (server)
    participant F as FastAPI
    participant DB as Postgres

    Note over A: Token expires in <60s
    A->>F: POST /auth/refresh<br/>{ refresh_token }
    F->>F: jwt.decode (validate signature)
    F->>DB: SELECT refresh_tokens WHERE token_hash=?
    alt token revoked or unknown
        F-->>A: 401
        A->>A: mark session.error = "RefreshAccessTokenError"<br/>middleware redirects to /login
    else valid
        F->>DB: UPDATE old token SET revoked_at = now()
        F->>F: issue new access + refresh
        F->>DB: INSERT new refresh
        F-->>A: { access_token, refresh_token, *_expires_at }
        A->>A: update session cookie
    end
```

Every refresh **rotates** the refresh token: the previous one is marked
`revoked_at`. A leaked refresh token is therefore single-use — replaying
it after the legitimate client refreshed will fail.

## Logout

```
Auth.js signOut() → DELETE session cookie
                  → POST /auth/logout (refresh_token)
                  → FastAPI marks the refresh as revoked_at = now()
```

The access token isn't invalidated explicitly — its 15-minute TTL is the
backstop. For higher-stakes deployments, add a JWT blacklist in Redis on
logout.

## Cookie attributes

Auth.js v5 chooses cookie attributes based on whether `AUTH_URL` is HTTPS.
This project always uses HTTPS for any non-`localhost` entry point (Caddy
issues a real cert via DNS-01), so the standard cookie set is:

| Cookie | Flags | Purpose |
|---|---|---|
| `__Secure-authjs.session-token` | `Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/` | Encrypted JWE containing user id + tokens |
| `__Host-authjs.csrf-token` | `Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/` | CSRF double-submit cookie checked on POST `/api/auth/callback/*` |
| `__Secure-authjs.callback-url` | `Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/` | Where to redirect after sign-in |

`AUTH_TRUST_HOST=true` + an explicit `trustHost: true` in `auth.ts` allow
the same bundle to serve multiple origins (chat.localhost, public hostname,
LAN IP) without pinning callbacks to one of them.

## Where the code lives

| Concern | File |
|---|---|
| Auth.js v5 config (server-side, has DB calls) | `frontend/src/auth.ts` |
| Auth.js v5 config (Edge-safe, used by middleware) | `frontend/src/auth.config.ts` |
| Edge middleware that gates protected routes | `frontend/src/middleware.ts` |
| FastAPI auth endpoints | `backend/src/axolotl/api/v1/auth.py` |
| `get_current_user` dependency | `backend/src/axolotl/api/deps.py` |
| JWT encode/decode, bcrypt, refresh hashing | `backend/src/axolotl/core/security.py` |

## Why two layers (and not one)

A pure Auth.js session would work for a Next.js-only app, but it ties
the API to Next as the sole client. A pure FastAPI cookie session would
work for a backend-only app, but it puts session state on every request
and complicates the Auth.js v5 ergonomics.

The two-layer model:

- keeps FastAPI usable from non-Next clients (a future CLI, a mobile
  native app, a webhook integration) — they only need a JWT
- gives the browser a single encrypted cookie that stores both tokens
  (no `localStorage` exposure, no XSS-readable JWT)
- makes refresh token rotation a backend concern (the only thing that
  hits the DB on every refresh)

The full rationale, including alternatives rejected, is recorded in
[`adr/003-auth-strategy.md`](adr/003-auth-strategy.md).
