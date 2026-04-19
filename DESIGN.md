# Axolotl — Design Direction

> Source of truth for the app's visual identity. Every new screen / component
> must defend itself against this doc. If a rule blocks you, amend this file
> first and get it reviewed, then implement.

---

## 0. Intent

**Typography-first pixel-neubrutalism.** Cream paper. Ink ballpoint. One
electric-lime accent. Monospace + pixel labels bring a terminal / local-first
feel. Sparse colour, high contrast, rigorous borders. Imagery is decorative
grain, never the point — the words are.

Mood: *serious, local-first, crafted, mischievous*.

References (Godly curated picks): `lorenzodaldosso.it`, `sick.agency`,
`edh.dev`, `lamalama.nl`, `hle.io`, `jeen-yuhs.com`,
`foundry.basement.studio`. Common thread: typography as the hero, one bold
accent, repetition-as-texture, retro-computing cues, interaction-rich.

---

## 1. Palette

Tokens live in `frontend/src/app/globals.css` on `:root` and `.dark`.
**Never** hard-code a colour outside of this file; always reach for the CSS
variable via `bg-[color:var(--*)]` or the Tailwind token (`bg-card`,
`text-foreground`, `bg-primary`, etc.).

### Light (default)

| Role                   | Token             | Approx hex | Usage                                              |
|------------------------|-------------------|-----------:|----------------------------------------------------|
| `--background`         | cream paper       | `#faf6ec`  | page bg, sidebar bg                                |
| `--card`               | off-white         | `#fffdf8`  | bubbles, cards, inputs, sidebar rows (active)      |
| `--foreground`         | strict ink        | `#171512`  | all text, all borders                              |
| `--primary`            | same as ink       | `#171512`  | primary button fill                                |
| `--primary-foreground` | cream             | `#faf6ec`  | text on primary button                             |
| `--muted-foreground`   | warm grey         | `~#6d665a` | secondary text                                     |
| `--lime` ★             | electric lime     | `#baff39`  | single accent: CTA shadow, active states, dots     |
| `--destructive`        | red               | `~#cc3333` | stop button, error toasts                          |

### Dark

Inverted: ink paper, cream text. `--lime` stays identical. `--card` becomes
a dim warm charcoal (`~#232019`), borders stay cream (`#f7f4ec`).

### Secondary pastels (reserved)

`--pastel-pink / mint / violet / butter` are declared but **only** allowed
on **full-screen onboarding / marketing pages** (like the BITNAPSE
3-step-flow inspiration). They **never** appear inside content cards on the
main app.

### Rules

- One surface colour at a time in a screen. No pastel gradients inside
  content areas.
- Text is **always** `--foreground` (or `--primary-foreground` on black
  fills). No custom greys other than `--muted-foreground`.
- Lime is **rare and loud**. If a screen has >3 lime accents we've failed.

---

## 2. Typography

Three families, each with a clear job.

| Family                | Variable          | Role                                         |
|-----------------------|-------------------|----------------------------------------------|
| **Inter**             | `--font-sans`     | body, UI default                             |
| **Clash Display**     | `--font-display`  | h1, h2, big editorial numbers, stats         |
| **Pixelify Sans**     | `--font-pixel`    | badges, pills, tags, section eyebrows, tool labels, axolotl ring |
| system ui-monospace   | `--font-mono`     | durations, timestamps, code, numerics        |

### Scale

```
h1  → 48 / 56 px  bold 700  Clash Display  leading-[1.05]
h2  → 32 / 36 px  bold 700  Clash Display
h3  → 20 / 24 px  semi 600  Clash Display
body → 14 / 22 px regular  Inter
small → 12 / 18 px regular  Inter
label → 11 / 16 px  500     Pixelify Sans, uppercase, tracking-[0.14em]
mono  → 10-12 px  regular   monospace, tabular-nums (for numbers)
```

### Rules

- H1 always carries **one italic keyword** (e.g. *listening*, *axolotl*).
  Italic = emphasis, nothing else.
- Headings are always **left-aligned**. No `text-center` on content text
  (mobile included). Centered is reserved for empty-states.
- `font-pixel` is for **labels only** (max 5 words). Never paragraph text.
- Numerics (duration badges, timers, versions) are `font-mono tabular-nums`
  — never Pixelify — so columns of digits align.
- `text-balance` is banned on Shuffle / SplitText nodes (breaks per-char
  layout). Fine on static h1.

---

## 3. Spacing

Use the 4-based scale: **4, 8, 12, 16, 24, 32, 48, 64, 96**. Any custom
value (`[10px]`, `[14px]`) is a code smell — justify or snap to scale.

Tailwind utilities: `p-1/p-2/p-3/p-4/p-6/p-8/p-12/p-16/p-24`. Prefer
`gap-*` over margins for flex/grid rhythm.

---

## 4. Borders, radius, shadows

### Borders

- **2px solid ink** is the default border everywhere (cards, buttons,
  inputs, pills, dividers). `border-2 border-border`.
- 1px borders exist only inside tables (row separators) and for subtle
  code fences.
- Never use `border-dashed` except for empty-state placeholders.

### Radius

| Context                     | Radius        |
|-----------------------------|---------------|
| default cards, modal panels | `rounded-xl` (12px) |
| hero section                | `rounded-[28px]`    |
| buttons, pills, badges, toggles, inputs | `rounded-none` (sharp corners — DA rigor) |
| chat bubbles                | `rounded-2xl` (16px) |
| avatars only                | `rounded-full` |

Buttons and pills keep sharp corners so the L-shape offset shadow stays
architectural and the border reads as a stroke, not a pill. Only
containers (cards, modal panels, the hero) are rounded. No `rounded-lg`
(8px) unless matching a shadcn primitive kept for API reasons.

### Shadows — the pixel-neubru signature

**Rule**: hard offset shadows only. No blur, no soft drop-shadow.

| Element                      | Shadow token                         |
|------------------------------|--------------------------------------|
| Primary CTA                  | `shadow-[3px_3px_0_0_var(--lime)]`   |
| Secondary / card / bubble    | `shadow-[3px_3px_0_0_var(--border)]` |
| Small variant (nested cards) | `shadow-[2px_2px_0_0_var(--border)]` |
| Hover on primary             | `shadow-[4px_4px_0_0_var(--lime)]`   |
| Active on primary            | translate `(2px, 2px)` + shadow `[1px_1px_0_0_var(--lime)]` |

All offset is **bottom-right** (`3px 3px`). Never top/left. Shadows
**never** blur.

---

## 5. Components — canonical recipes

### Primary button

```tsx
className="inline-flex items-center gap-2 border-2 border-border bg-primary
  px-5 py-2.5 text-sm font-semibold text-primary-foreground
  shadow-[3px_3px_0_0_var(--lime)]
  hover:shadow-[4px_4px_0_0_var(--lime)]
  active:translate-x-[2px] active:translate-y-[2px]
  active:shadow-[1px_1px_0_0_var(--lime)]
  transition-[transform,box-shadow] duration-100
  disabled:cursor-not-allowed disabled:opacity-60"
```

### Secondary button / link-as-button

Same as primary but `bg-card` and shadow uses `--border` (not lime).

### Stop / destructive

`bg-destructive text-destructive-foreground`, same shadow grammar with
`--border`.

### Pill / eyebrow tag

```tsx
<span className="inline-flex w-fit items-center gap-2
  border-2 border-border bg-card
  px-2.5 py-1 font-pixel text-[12px] uppercase tracking-[0.14em]">
  <span className="size-2 bg-[color:var(--lime)]" />
  Section
</span>
```

Lime dot is optional but common on hero / page header pills.

### Input

```tsx
className="w-full border-2 border-border bg-card px-3 py-2.5 text-sm
  outline-none transition-[box-shadow] duration-100
  focus:shadow-[3px_3px_0_0_var(--lime)]
  placeholder:text-muted-foreground"
```

Label above the input: `text-xs font-semibold uppercase tracking-wider`.

### Toggle (pixel switch)

See `frontend/src/app/(app)/tools/page.tsx`. 2px bordered track, lime
fill when enabled, 2px bordered thumb that translates 2 → 20px.

### Card (generic container)

`border-2 border-border bg-card p-4 shadow-[3px_3px_0_0_var(--border)]`.
Use `shadow-[3px_3px_0_0_var(--lime)]` on **hover** for interactive
cards (session rows).

### Modal / Dialog

Radix Dialog underneath (`@radix-ui/react-dialog`) for focus trap,
Escape-to-close, aria wiring. Styled to match the DA — no blur, no soft
shadow, strict offsets.

- **Backdrop**: `fixed inset-0 bg-black/55` — solid black tint,
  theme-neutral (darkens cream in light, deepens the charcoal in dark),
  **no blur** (rigor).
- **Panel**: centered, `max-w-md w-[min(90vw,28rem)] border-2
  border-border bg-card rounded-xl p-6 shadow-[4px_4px_0_0_var(--border)]`.
  Offset shadow a notch larger than a card because the modal is elevated.
- **Animation**: backdrop and panel share the same pure-opacity fade
  (`axo-fade-in` 200ms ease-out on open, `axo-fade-out` 180ms ease-in
  on close) so they transition in lockstep — no translate/scale
  (zero cursor-drift, zero visible stepping).
- **Header**: optional. `font-display text-xl font-bold leading-tight`.
  Italic accent on the operative keyword (e.g. `Delete *conversation*?`,
  `Keyboard *shortcuts*`).
- **Body**: `text-sm text-muted-foreground`, left-aligned. Regular prose
  or form elements.
- **Footer actions**: `flex justify-end gap-3` on desktop,
  `flex-col-reverse` full-width on mobile. Primary = lime shadow for
  safe actions, `bg-destructive` with ink shadow for destructive.
  Secondary cancel = card + ink shadow.
- **Close button**: lucide `X` absolute top-right, `size-5`,
  `aria-label="Close"`. `hover:text-destructive`.
- **Dismiss**: Escape, backdrop click, and the X button — all three work.

**`ConfirmDialog`** is the convenience wrapper: pass `title`,
`description`, `confirmLabel`, `onConfirm`, `variant: "default" |
"destructive"`, and `open / onOpenChange`. Use it to replace **every**
`window.confirm()` call — the first refactor target is the delete-
session prompt in the sidebar.

### Terminal status bar (footer)

A thin status-line at the **bottom** of the AppShell — vim / tmux vibe,
always visible on desktop and mobile. Pinned inside the main column so
it doesn't overlap the sidebar.

- Container: `h-7 border-t-2 border-border bg-card flex items-center
  gap-3 px-4`.
- Typography: `font-pixel text-[10px] uppercase tracking-[0.14em]`
  for labels. Numerics (clock, tokens/s) use `font-mono tabular-nums`
  so digits don't reflow.
- Separators: ` · ` (middle dot) in `text-muted-foreground` between
  blocks.
- **Blocks, left → right**:
  1. `● LOCAL` — lime dot always lit. Marks the "runs on your box" vibe.
  2. `HH:MM` — auto-updates every 30s, monospace.
  3. `MODEL <name>` — current model, truncated at 32 chars. Fetched
     live from ``GET /v1/config`` which proxies vLLM's ``/v1/models`` —
     the bar shows the model **actually** served, not what an env var
     claims. Falls back to the configured env value only if vLLM is
     unreachable.
  4. **Stream state**, subscribed to the `chat-status` store:
     - idle: `○ idle` in muted foreground, dot `--border`
     - streaming: `● streaming` with lime dot that `animate-pulse`
- Right-side (optional): app version tag + GitHub link in muted pixel.

### Sidebar session filter

Input inside the sidebar, above the conversation list and below the
"New chat" button.

- Height: `h-8`, `text-[13px]`, `px-2.5`. Same border/shadow grammar as
  `INPUT` but compact.
- Left-side icon: lucide `Search size-3.5` placed absolute left, so the
  native `<input>` keeps its full interactive area.
- Right-side hint: a small `font-pixel text-[10px] uppercase` badge
  showing `[/]` in `border border-border/40 bg-background px-1 py-0.5`
  to advertise the global `/` shortcut.
- Behaviour:
  - Pressing `/` anywhere in the app (not inside another input) focuses
    the filter. `Escape` clears and blurs.
  - Case-insensitive substring filter on `session.title`, client-side.
  - If non-empty with zero matches: placeholder row
    `No match for "<query>"` in muted pixel.
  - Below the list when filtered: discrete counter `N / Total`.

### Chat-status store (Zustand)

A tiny global store so non-chat screens (top terminal bar, sidebar, any
future ambient indicator) can react to the live stream state without
drilling props.

```ts
// src/stores/chat-status.ts
import { create } from "zustand";

type ChatStatus = {
  isSending: boolean;
  tokensPerSec: number | null;
  setIsSending: (v: boolean) => void;
  setTokensPerSec: (v: number | null) => void;
  reset: () => void;
};
```

`useChat` writes to this store on mount / delta / done; consumers (the
terminal bar) read it. One source of truth, no prop drilling.

---

## 6. Interactions — the vocabulary

| Pattern            | Where                              | Component        |
|--------------------|------------------------------------|------------------|
| Global click spark | Any click anywhere                 | `GlobalClickSpark` (lime) |
| Magnet             | Primary CTAs on landing            | `Magnet`         |
| Text type          | Hero greeting line (rotating)      | `TextType`       |
| Decrypted text     | "Thinking" / "Reasoned" label      | `DecryptedText`  |
| Pixel snow         | Hero card background drift only    | `PixelSnow`      |
| Pixel blast        | App-wide ambient page bg           | `AppBackground`  |
| Circular text      | Ring around the axolotl sprite     | `CircularText`   |
| Click spark (local)| Axolotl poke                       | `ClickSpark`     |

### Axolotl reactive mood

The `AxolotlSprite` on the home hero subscribes to the `chat-status`
store and an internal idle timer. Mood transitions:

- `isSending === true` → **curious** (alert, the gills flutter)
- On the transition `true → false` (response just arrived) → **happy**
  for ~3s, then fall back to `idle`
- `isSending === false` for more than 60s → **sleepy** (with Zzz glyph)
- Otherwise → gentle random cycle `idle / curious` every ~6.5s

This ties the mascot to actual app state without adding a new reducer —
the store is already there for the terminal footer.

**Vendored but not currently mounted** (kept in `src/components/reactbits/`
for later use): `ShapeBlur` (trialled in hero corner, dropped — felt
decorative-for-decoration's-sake), `CurvedLoop` marquee (same — the
repetition motif didn't land at the hero footer), `MetaBalls`,
`PixelTransition` (route transitions), `Shuffle` (layout-sensitive,
see F3.3 notes), `ScrollStack`, `CardNav`, `StaggeredMenu`,
`GradualBlur`.

### Rules

- Animations must respect `prefers-reduced-motion`. Every vendored
  component that animates has a prop; pass it through.
- Only **one** attention-stealing animation per screen. The landing
  hero has 6 (axolotl mood cycle, pixel-snow, circular text, text-type,
  click-spark, magnet) — that's OK because they're all ambient. But don't
  stack `Shuffle` + `DecryptedText` + `Magnet` on the same thing.
- Hover states lift-up (no translate) + widen shadow. Active press
  returns to baseline. No scale transforms.

---

## 7. Layout rhythm

- All content text is **left-aligned** by default. `text-center` is for
  empty states and nothing else.
- Hero-style sections stay within `max-w-4xl` (inner content). App pages
  use `max-w-3xl` for forms / prose.
- Chat bubbles live inside a `max-w-[80%]` column that also holds their
  actions/timing footer (so the duration badge aligns with the bubble's
  right edge, not the viewport's).
- `gap-*` is preferred to margins. Vertical rhythm is consistent
  `gap-3 / gap-4 / gap-6 / gap-8` depending on section density.

---

## 8. Iconography & glyphs

- **Lucide React** is the single icon library. `size-3.5 / size-4 / size-5`
  sizes. Never mix icon styles.
- **No emojis in UI chrome** (buttons, labels, tool cards). Emojis are
  OK only as a single decorative flourish (e.g. the 🪷 logo wordmark in
  the sidebar header).
- Pixel axolotl SVG (`AxolotlSprite`) is the mascot. Avatars for users
  are initials on `bg-card`, never lucide `User` icon.
- Lime dot `<span className="size-2 bg-[color:var(--lime)]" />` is the
  "live / here / this" marker.

---

## 9. ASCII / terminal cues

The app reads as local-first & craft. Lean into it:

- Separators in nav / footer: ` · ` (middle dot) or ` — ` (em dash).
- Tags: `[LOCAL]`, `[DEV]`, `[01/06]` — uppercase pixel, brackets allowed.
- Timestamps: `04:19 PM · LOCAL` in mono.
- Arrows: `→` in text, lucide `ArrowRight` for buttons.
- Never use emoji for these markers.

---

## 10. Accessibility baseline

- Every interactive element has a visible focus-ring (`focus-visible`)
  — either the lime offset shadow or a 2px outline.
- Minimum text contrast: 4.5:1 (WCAG AA). Lime on white is **not**
  AA-compliant for text — lime is only for **backgrounds / accents /
  indicators**, never as text colour on white.
- Every icon-only button has an `aria-label`.
- Keyboard nav tested on modals / drawers / toggles.

---

## 11. Anti-patterns — things we never do

- ❌ Soft drop-shadows (`shadow-sm`, `shadow-md`, `shadow-lg`).
- ❌ `backdrop-filter: blur` on modals, menus, overlays, toasts, tooltips
  — anything functional. Decorative WebGL ambient shapes (ShapeBlur in a
  hero corner, pixel-blast grain) are OK because they're not obscuring
  readable content.
- ❌ Pastel inside a card (pastel lives on full-screen sections only).
- ❌ Centered body text.
- ❌ Emoji in button labels.
- ❌ Rounded-full on anything except avatar frames and the lime dot.
- ❌ Gradient fills (except reserved onboarding pages).
- ❌ Multiple accent colours. Lime and only lime.
- ❌ System font stack only (always opt-in to one of our three families).
- ❌ Inline hex colours outside globals.css.
- ❌ Animating on scroll without a `once` flag or reduced-motion fallback.

---

## 12. How to evolve this doc

Open a PR that edits `DESIGN.md` **before** the implementation PR.
The tokens and component recipes here are the contract; the
implementation follows.
