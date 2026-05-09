# Features

Feature-level deep-dives — what's behind each user-facing capability and
where the code that implements it lives.

## Personas

A **persona** is a named system prompt the model adopts at the start of
a conversation. Two flavours coexist:

- **Built-ins** — created by migrations / seed data, owned by no user
  (`personas.user_id IS NULL`, `is_builtin = true`). Visible to everyone,
  cannot be edited or deleted.
- **User personas** — created by a user from `Settings → Personas`,
  owned by them, full CRUD.

The system prompt body supports markdown (`**bold**`, lists, links,
code). It's rendered with `react-markdown` + `remark-gfm` in the UI
(both in the persona card preview and in the chat where the prompt
applies invisibly).

### Default persona

A user can pin one persona as default via `users.default_persona_id`
(FK with `ON DELETE SET NULL`). When a session is created without an
explicit `persona_id`, the backend reads the user's default and applies
it. Sessions started with `persona_id: null` (explicitly) keep the empty
state regardless.

The pin is set from the persona card in `Settings → Personas` (lime pin
icon) or cleared from the same control when a persona is already the
default. The "Start as persona" group in the `Cmd+K` palette spawns a
new session with that persona pre-attached.

### Code

| Concern | File |
|---|---|
| Backend CRUD | `backend/src/axolotl/api/v1/personas.py` |
| Default pin | `users.default_persona_id`, `PATCH /auth/me` |
| Frontend page | `frontend/src/app/(app)/settings/personas/page.tsx` |
| Markdown renderer | `frontend/src/components/ui/markdown.tsx` (shared with chat) |

## Layered hyperparameters

Sampling parameters (`temperature`, `top_p`, `top_k`, `min_p`,
`presence_penalty`, `repetition_penalty`, `max_tokens`,
`enable_thinking`) stack in three layers:

```
┌─────────────────────────────────────┐
│ Session.overrides (per-session)     │  Cmd+,  drawer
├─────────────────────────────────────┤
│ User.defaults (per-user)            │  Settings → Model
├─────────────────────────────────────┤
│ Settings.vllm_* (server defaults)   │  .env / config.py
└─────────────────────────────────────┘
```

The merge happens once at the start of `stream_chat()` and uses **fall-through**
semantics: the topmost layer that has a key wins; a missing key
defers to the layer below. This is what `_merge_sampling_params` does.

A user clears an override by setting it to `null`/undefined — the JSONB
storage is sparse, so unsetting just removes the key.

### UI

- **Settings → Model** edits `users.defaults`. Each of the eight knobs
  is a DA-styled range slider (`.axo-range` — flat 2 px ink track, square
  lime thumb). The pill next to each slider shows the value plus a
  "default" tag when the user hasn't overridden the server default. A
  per-slider `↺` clears just that override; "Reset all" clears the whole
  dict. A sticky save bar appears when the form is dirty.
- **Settings → Reasoning** is a three-choice radio (on / off / server
  default) for `enable_thinking` — same dict, just one key.
- **`Cmd+,` controls drawer** edits `sessions.overrides` for the current
  session. The slider's "default value" is dynamic: if the user has set
  `temperature = 0.6` in their defaults, the drawer slider shows that as
  the fallback (`your default`); if not, it shows the server value
  (`server`). All overrides apply only to this session, persona switcher
  and model picker live in the same drawer.

### Code

| Concern | File |
|---|---|
| Merge logic | `backend/src/axolotl/llm/orchestrator.py::_merge_sampling_params` |
| Schemas | `backend/src/axolotl/schemas/params.py` (HyperParams) |
| Slider component | `frontend/src/components/hyperparams/param-slider.tsx` |
| Slider metadata | `frontend/src/lib/hyperparams.ts` (default values + UI ranges) |
| Settings pages | `frontend/src/app/(app)/settings/{model,reasoning}/page.tsx` |
| Drawer | `frontend/src/components/chat/chat-controls-drawer.tsx` |

## Command palette (`Cmd+K`)

Opens from anywhere in the app. Three groups:

- **Actions** — new conversation, toggle theme, open settings, open
  tools, keyboard-shortcuts overlay (`?`), sign out
- **Start as persona** — one row per persona (built-in + user's own).
  Each item creates a new session pre-attached to that persona.
- **Sessions** — recent conversations (cached via TanStack Query). Click
  to navigate.

The picker is built on `cmdk` (Radix UI's combobox primitive). Navigation
keeps a `loop` flag so arrow keys wrap. Filter is case-insensitive
substring on labels.

### Code

`frontend/src/components/palette/command-palette.tsx`

## Controls drawer (`Cmd+,`)

A right-side slide-in panel anchored inside the chat. Edits the **current
session**'s overrides without leaving the conversation. Sections:

- **Persona** — pick one of the user's personas (or "None"); writes
  `session.persona_id`
- **Model** — free-text input that overrides the model name for this
  session only (defaults to `VLLM_SERVED_MODEL_NAME`)
- **Reasoning** — three-choice radio (on / off / inherit from your
  default), writes `session.overrides.enable_thinking`
- **Sampling** — eight sliders, each edits one key in
  `session.overrides`; the "default" pill shows whether the slider's
  fallback comes from your user defaults (`your default`) or the server
  (`server`)
- **Tools** — read-only mirror of `Settings → Tools`, kept side-by-side
  for context (toggle is at the user level, not per-session)

A single Apply button at the bottom sends one `PATCH /v1/sessions/{id}`
with `persona_id`, `model`, and the pruned `overrides` dict. The button
is dirty-state-aware.

### Code

`frontend/src/components/chat/chat-controls-drawer.tsx`

## Tool registry

Tools are pluggable Python classes registered at module import time.
Each tool exposes:

- a stable `name` (matches the OpenAI `function.name` payload)
- UI-friendly metadata (`title`, `description`, `category`, `icon`)
- a JSON Schema for arguments (`parameters_schema`)
- an async `run(arguments)` that returns a JSON-serializable dict
- a `enabled_by_default` flag for new users

The registry exposes:

- `registry.specs_for(enabled_names)` — OpenAI-format `tools` array filtered
  to what's enabled for the current user
- `registry.default_enabled()` — initial enable list for new users

### Adding a new tool

1. Create a file under `backend/src/axolotl/llm/tools/` extending `Tool`.
2. `registry.register(MyTool())` at the bottom of the file.
3. Import the file from `backend/src/axolotl/llm/tools/__init__.py` so
   the side-effect runs at app start.
4. Restart the backend; the new tool is now visible at `GET /v1/tools`
   and toggleable from the Settings → Tools page.

The first user fetch after a new tool is added picks it up via
`enabled_by_default`. Existing users keep their previous list and need
to enable the new tool manually.

### Built-ins shipped

| Name | What it does | Key dependency |
|---|---|---|
| `web_search` | Top-N DuckDuckGo results with title, url, snippet, domain favicon | `httpx` |

### Code

| Concern | File |
|---|---|
| Base class + registry | `backend/src/axolotl/llm/tools/base.py` |
| Web search implementation | `backend/src/axolotl/llm/tools/web_search.py` |
| Per-user enable/disable | `backend/src/axolotl/services/settings_store.py` (key `tools.enabled`) |
| HTTP API | `backend/src/axolotl/api/v1/tools.py` |
| UI list + toggles | `frontend/src/components/tools/tools-list.tsx` |

## Profile & terminal footer

The footer at the bottom of the app shows `● LOCAL · {locality} ·
{HH:MM} · {temp}°C clear`. Each piece is driven by a profile field:

| Footer piece | Source | Editable in |
|---|---|---|
| `LOCAL · MONTPELLIER` | `users.locality` | Settings → Profile (`locality` text input) |
| `21:45` (time) | `users.time_format` (`12h` / `24h`) | Settings → Profile (segmented control) |
| `17°C clear` | locality → Open-Meteo geocoding → forecast; unit from `users.temperature_unit` | Settings → Profile (segmented control) |

The locality lookup is cached via TanStack Query (24 h staleTime); the
forecast refreshes every 15 min. Both run client-side directly against
Open-Meteo (no API key, generous CORS).

The pill renders the **moon phase** at night using the Meeus synodic
formula (`frontend/src/lib/moon.ts`) — a phase-aware silhouette layered
behind the weather icon (cloud / rain / fog / …).

### Code

| Concern | File |
|---|---|
| Profile form | `frontend/src/app/(app)/settings/page.tsx` |
| Terminal footer | `frontend/src/components/layout/terminal-bar.tsx` |
| Weather pill | `frontend/src/components/layout/weather-pill.tsx` |
| Moon phase math | `frontend/src/lib/moon.ts` |

## Theme

System / light / dark, persisted via `next-themes`. Tokens live in CSS
custom properties (`--background`, `--foreground`, `--lime`, etc.) and
are switched by toggling a `class="dark"` on `<html>`. The lime accent
intentionally stays identical across themes — it's the project's
signature.

The toggle lives in the command palette ("Toggle theme · {next}") and
in the user dropdown.

The full design language is documented in `DESIGN.md` (gitignored,
local-only).

## OpenAPI → TypeScript pipeline

The backend is the single source of truth for API shapes. The flow:

```
backend changes → make openapi-export → backend/openapi.json
                                      → make gen-api-types
                                      → frontend/src/types/api-generated.ts
                                      → tsc + ESLint catch any drift
```

`make check-api-types` is the CI hook: it regenerates and `git diff
--exit-code`s. A backend change that drifts from the committed types
fails CI. Domain-specific refinements live in
`frontend/src/types/api.ts` (re-exports + narrower types for the SSE
event union, message metadata shape, etc.).
