# Contributing

Thanks for your interest in Axolotl Companion!

## Setup

```bash
git clone https://github.com/ligne12/axolotl-companion.git
cd axolotl-companion
cp .env.example .env   # Fill in your secrets
make install-hooks     # Install pre-commit hooks (optional)
make dev               # Launch the full stack
```

Open <https://chat.localhost> once everything is up. See the
[README](README.md#-quick-start) for prerequisites and
[`docs/deployment.md`](docs/deployment.md) if you want to expose the
stack on a phone over the LAN.

## Branching

- `main` — production-ready
- `dev` — integration branch
- `feat/xxx` — new features
- `fix/xxx` — bug fixes
- `docs/xxx` — documentation only
- `chore/xxx` — tooling, deps, etc.

## Commit messages

We follow [Conventional Commits](https://www.conventionalcommits.org/).

```
feat(chat): add web search tool call support
fix(auth): refresh token race condition
docs(readme): update setup instructions
chore(deps): bump next to 15.1.0
```

The commit-msg hook enforces this locally.

## Pull requests

1. Open a PR against `dev`
2. Make sure CI passes (lint, type-check, tests, build)
3. Include a brief description + screenshots for UI changes
4. Link related issues

## Code style

**Backend (Python)**
- Ruff for linting and formatting
- Mypy in strict mode
- 100-column lines

**Frontend (TypeScript)**
- ESLint + Prettier
- `tsc --noEmit` must pass
- Tailwind classes sorted via `prettier-plugin-tailwindcss`

## Tests

- **Backend** — pytest (unit + integration)
- **Frontend** — Vitest (unit) + Playwright (e2e)

Run all tests: `make test`

## Documentation & ADRs

Reference docs live under [docs/](docs/). When you change behaviour
that's documented (auth, schema, API, chat pipeline, …), update the
relevant `.md` in the same PR.

Architectural decisions are recorded as ADRs under
[docs/adr/](docs/adr/).
