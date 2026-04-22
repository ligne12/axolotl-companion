"use client";

import { ArrowRight, Clock, MessageSquarePlus, Search, Send, Sparkles, Square, Trash2, Wrench } from "lucide-react";
import { useState } from "react";

import { AxolotlSprite, type AxolotlMood } from "@/components/axolotl/axolotl-sprite";
import CircularText from "@/components/reactbits/circular-text";
import ClickSpark from "@/components/reactbits/click-spark";
import DecryptedText from "@/components/reactbits/decrypted-text";
import Magnet from "@/components/reactbits/magnet";
import PixelSnow from "@/components/reactbits/pixel-snow";
import TextType from "@/components/reactbits/text-type";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

/**
 * /dev/components — living sandbox for the pixel-neubru DA.
 * Everything we've built, in one scrollable page. Not gated behind a
 * role: trivial to discover when iterating on design, costs nothing in
 * prod beyond a route that nobody links to from user-facing chrome.
 */
export default function ComponentsSandboxPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-4 py-10 md:py-14">
        <header className="mb-10 space-y-3">
          <div className="inline-flex w-fit items-center gap-2 border-2 border-border bg-card px-2.5 py-1 font-pixel text-[12px] uppercase tracking-[0.14em]">
            <span className="size-2 bg-[color:var(--lime)]" />
            Dev / Components
          </div>
          <h1 className="font-display text-4xl font-bold uppercase leading-[1.05] md:text-5xl">
            Design <span className="italic">sandbox</span>.
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Every primitive in the DA — typography, colours, shadows, buttons,
            pills, inputs, modals, palette, chat bubbles, mascot. If a new
            pattern doesn&apos;t land cleanly here, it isn&apos;t ready to ship.
          </p>
        </header>

        <div className="space-y-14">
          <SectionTypography />
          <SectionColours />
          <SectionShadows />
          <SectionButtons />
          <SectionPills />
          <SectionInputs />
          <SectionCards />
          <SectionModals />
          <SectionInteractions />
          <SectionChat />
          <SectionMascot />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Layout helpers                                                      */
/* ------------------------------------------------------------------ */

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="space-y-4">
      <h2 className="font-display text-xl font-bold uppercase tracking-tight">
        <span className="font-pixel text-[11px] font-normal uppercase tracking-widest text-muted-foreground">
          §{" "}
        </span>
        {title}
      </h2>
      <div className="rounded-xl border-2 border-border bg-card p-6 shadow-[3px_3px_0_0_var(--border)]">
        {children}
      </div>
    </section>
  );
}

function Row({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      {label && (
        <div className="font-pixel text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* §1 — Typography                                                     */
/* ------------------------------------------------------------------ */

function SectionTypography() {
  return (
    <Section id="type" title="Typography">
      <div className="space-y-6">
        <div>
          <div className="font-pixel text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Clash Display · h1
          </div>
          <h1 className="font-display text-5xl font-bold leading-[1.05]">
            Your <span className="italic">axolotl</span> is listening.
          </h1>
        </div>
        <div>
          <div className="font-pixel text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Clash Display · h2
          </div>
          <h2 className="font-display text-3xl font-bold">
            Pick what the axolotl can <span className="italic">reach for</span>.
          </h2>
        </div>
        <div>
          <div className="font-pixel text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Inter · body
          </div>
          <p className="max-w-xl text-sm leading-relaxed">
            Body copy is Inter at 14/22 with comfortable measure. Secondary text
            uses <span className="text-muted-foreground">muted-foreground</span>.
          </p>
        </div>
        <div>
          <div className="font-pixel text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Pixelify Sans · label
          </div>
          <span className="font-pixel text-[12px] uppercase tracking-[0.14em]">
            LOCAL · AXOLOTL · COMPANION
          </span>
        </div>
        <div>
          <div className="font-pixel text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Mono tabular · numerics
          </div>
          <span className="font-mono tabular-nums text-sm">
            16:45 · 342 t/s · v0.2.0 · 1.2s
          </span>
        </div>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* §2 — Colour swatches                                                */
/* ------------------------------------------------------------------ */

function Swatch({ name, value, fg }: { name: string; value: string; fg?: string }) {
  return (
    <div
      className="flex h-16 min-w-[10rem] flex-col justify-between border-2 border-border p-2"
      style={{ backgroundColor: value, color: fg }}
    >
      <span className="font-pixel text-[10px] uppercase tracking-widest">{name}</span>
      <span className="font-mono text-[10px] opacity-80">{value}</span>
    </div>
  );
}

function SectionColours() {
  return (
    <Section id="colours" title="Colours">
      <div className="space-y-4">
        <Row label="Ground">
          <Swatch name="background" value="var(--background)" fg="var(--foreground)" />
          <Swatch name="card" value="var(--card)" fg="var(--foreground)" />
          <Swatch name="muted" value="var(--muted)" fg="var(--foreground)" />
        </Row>
        <Row label="Ink & accent">
          <Swatch name="foreground" value="var(--foreground)" fg="var(--background)" />
          <Swatch name="border" value="var(--border)" fg="var(--background)" />
          <Swatch name="lime" value="var(--lime)" fg="var(--lime-foreground)" />
          <Swatch name="destructive" value="var(--destructive)" fg="var(--destructive-foreground)" />
        </Row>
        <Row label="Pastels (onboarding-only)">
          <Swatch name="pastel-pink" value="var(--pastel-pink)" fg="var(--foreground)" />
          <Swatch name="pastel-mint" value="var(--pastel-mint)" fg="var(--foreground)" />
          <Swatch name="pastel-violet" value="var(--pastel-violet)" fg="var(--foreground)" />
          <Swatch name="pastel-butter" value="var(--pastel-butter)" fg="var(--foreground)" />
        </Row>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* §3 — Shadows                                                        */
/* ------------------------------------------------------------------ */

function SectionShadows() {
  const base = "flex h-16 w-40 items-center justify-center border-2 border-border bg-card";
  return (
    <Section id="shadows" title="Shadows (L-shape only, no blur)">
      <Row label="Border shadow">
        <div className={cn(base, "shadow-[2px_2px_0_0_var(--border)]")}>2px</div>
        <div className={cn(base, "shadow-[3px_3px_0_0_var(--border)]")}>3px</div>
        <div className={cn(base, "shadow-[4px_4px_0_0_var(--border)]")}>4px</div>
        <div className={cn(base, "shadow-[6px_6px_0_0_var(--border)]")}>6px</div>
      </Row>
      <div className="mt-4">
        <Row label="Lime accent (primary CTAs only)">
          <div className={cn(base, "shadow-[3px_3px_0_0_var(--lime)]")}>3px lime</div>
          <div className={cn(base, "shadow-[4px_4px_0_0_var(--lime)]")}>4px lime</div>
        </Row>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* §4 — Buttons                                                        */
/* ------------------------------------------------------------------ */

const PRIMARY =
  "inline-flex items-center gap-2 border-2 border-border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[3px_3px_0_0_var(--lime)] transition-[transform,box-shadow] duration-100 hover:shadow-[4px_4px_0_0_var(--lime)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_0_var(--lime)] disabled:cursor-not-allowed disabled:opacity-60";
const SECONDARY =
  "inline-flex items-center gap-2 border-2 border-border bg-card px-4 py-2 text-sm font-semibold shadow-[3px_3px_0_0_var(--border)] transition-[transform,box-shadow] duration-100 hover:shadow-[4px_4px_0_0_var(--border)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_0_var(--border)]";
const DESTRUCTIVE =
  "inline-flex items-center gap-2 border-2 border-border bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground shadow-[3px_3px_0_0_var(--border)] transition-[transform,box-shadow] duration-100 hover:shadow-[4px_4px_0_0_var(--border)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_0_var(--border)]";

function SectionButtons() {
  return (
    <Section id="buttons" title="Buttons">
      <div className="space-y-4">
        <Row label="Primary">
          <button className={PRIMARY}>
            <MessageSquarePlus className="size-4" />
            New conversation
          </button>
          <button className={PRIMARY} disabled>
            <MessageSquarePlus className="size-4" />
            Disabled
          </button>
        </Row>
        <Row label="Secondary">
          <button className={SECONDARY}>
            <Sparkles className="size-4" />
            Resume last
          </button>
        </Row>
        <Row label="Destructive">
          <button className={DESTRUCTIVE}>
            <Trash2 className="size-4" />
            Delete
          </button>
          <button className={cn("inline-flex size-11 items-center justify-center", DESTRUCTIVE)} aria-label="Stop">
            <Square className="size-4" />
          </button>
        </Row>
        <Row label="Icon-only primary">
          <button className={cn("inline-flex size-11 items-center justify-center", PRIMARY)} aria-label="Send">
            <Send className="size-4" />
          </button>
        </Row>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* §5 — Pills & badges                                                 */
/* ------------------------------------------------------------------ */

function SectionPills() {
  return (
    <Section id="pills" title="Pills & badges">
      <Row label="Eyebrow pill with lime dot">
        <span className="inline-flex items-center gap-2 border-2 border-border bg-card px-2.5 py-1 font-pixel text-[12px] uppercase tracking-[0.14em]">
          <span className="size-2 bg-[color:var(--lime)]" />
          Registration
        </span>
        <span className="inline-flex items-center gap-2 border-2 border-border bg-card px-2.5 py-1 font-pixel text-[12px] uppercase tracking-[0.14em]">
          <span className="size-2 bg-[color:var(--lime)]" />
          Hi Thomas
        </span>
      </Row>
      <div className="mt-4" />
      <Row label="Category tag">
        <span className="inline-block border-2 border-border bg-background px-1.5 py-0.5 font-pixel text-[11px] uppercase tracking-wider text-muted-foreground">
          web
        </span>
      </Row>
      <div className="mt-4" />
      <Row label="Keyboard key (`<Kbd>`)">
        <KbdBadge>⌘</KbdBadge>
        <KbdBadge>K</KbdBadge>
        <KbdBadge>/</KbdBadge>
        <KbdBadge>?</KbdBadge>
        <KbdBadge>Esc</KbdBadge>
        <KbdBadge>Enter</KbdBadge>
      </Row>
    </Section>
  );
}

function KbdBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex min-w-[1.4rem] items-center justify-center border-2 border-border bg-background px-1.5 py-0.5 font-pixel text-[11px] uppercase tracking-wider">
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* §6 — Inputs                                                         */
/* ------------------------------------------------------------------ */

function SectionInputs() {
  const [val, setVal] = useState("hello");
  const [checked, setChecked] = useState(true);
  return (
    <Section id="inputs" title="Inputs">
      <div className="space-y-5">
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider">
            Text input
          </label>
          <input
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder="Type something…"
            className="w-full max-w-sm border-2 border-border bg-card px-3 py-2.5 text-sm outline-none transition-[box-shadow] duration-100 focus:shadow-[3px_3px_0_0_var(--lime)] placeholder:text-muted-foreground"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider">
            Textarea
          </label>
          <textarea
            defaultValue="Multi-line…"
            rows={3}
            className="w-full max-w-sm resize-none border-2 border-border bg-card px-3 py-2.5 text-sm outline-none focus:shadow-[3px_3px_0_0_var(--lime)]"
          />
        </div>
        <div>
          <Row label="Pixel switch (tools toggle)">
            <PixelSwitch checked={checked} onChange={setChecked} />
            <span className="text-sm text-muted-foreground">
              {checked ? "enabled" : "disabled"}
            </span>
          </Row>
        </div>
        <div>
          <Row label="Sidebar filter input">
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder="Filter…"
                className="h-8 w-full border-2 border-border bg-card pl-7 pr-8 text-[13px] outline-none focus:shadow-[3px_3px_0_0_var(--lime)] placeholder:text-muted-foreground"
              />
              <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 border border-border/40 bg-background px-1 py-0.5 font-pixel text-[9px] uppercase tracking-widest text-muted-foreground">
                /
              </span>
            </div>
          </Row>
        </div>
      </div>
    </Section>
  );
}

function PixelSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 items-center border-2 border-border transition-colors",
        checked ? "bg-[color:var(--lime)]" : "bg-card",
      )}
    >
      <span
        className={cn(
          "inline-block size-4 border-2 border-border bg-background transition-transform",
          checked ? "translate-x-[20px]" : "translate-x-[2px]",
        )}
      />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* §7 — Cards                                                          */
/* ------------------------------------------------------------------ */

function SectionCards() {
  return (
    <Section id="cards" title="Cards">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border-2 border-border bg-card p-4 shadow-[3px_3px_0_0_var(--border)]">
          <p className="font-medium">Static card</p>
          <p className="mt-1 text-xs text-muted-foreground">
            ``border-2 border-border bg-card p-4 shadow-[3px_3px_0_0_var(--border)]``
          </p>
        </div>
        <a
          href="#"
          onClick={(e) => e.preventDefault()}
          className="group flex h-full flex-col justify-between gap-3 rounded-xl border-2 border-border bg-card p-4 shadow-[3px_3px_0_0_var(--border)] transition-[transform,box-shadow] duration-100 hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[5px_5px_0_0_var(--lime)]"
        >
          <p className="font-medium group-hover:text-foreground">Interactive (hover me)</p>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" /> 2h ago
            </span>
            <ArrowRight className="size-3.5 translate-x-[-4px] opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
          </div>
        </a>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* §8 — Modals                                                         */
/* ------------------------------------------------------------------ */

function SectionModals() {
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmDanger, setConfirmDanger] = useState(false);
  return (
    <Section id="modals" title="Modals">
      <Row>
        <button className={SECONDARY} onClick={() => setModalOpen(true)}>
          Open Modal
        </button>
        <button className={SECONDARY} onClick={() => setConfirmOpen(true)}>
          Open Confirm (default)
        </button>
        <button className={DESTRUCTIVE} onClick={() => setConfirmDanger(true)}>
          <Trash2 className="size-4" /> Open Confirm (destructive)
        </button>
      </Row>

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="Sandbox *modal*"
        description="Body copy goes in muted-foreground. Italic accent on the operative word."
      >
        <p>Drop-in for any structured prompt with custom body + footer actions.</p>
        <Modal.Footer>
          <Modal.Cancel>Cancel</Modal.Cancel>
          <Modal.Confirm onClick={() => setModalOpen(false)}>OK</Modal.Confirm>
        </Modal.Footer>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Save *changes*?"
        description="Your edits will be persisted to the session."
        confirmLabel="Save"
        onConfirm={() => {}}
      />
      <ConfirmDialog
        open={confirmDanger}
        onOpenChange={setConfirmDanger}
        title="Delete *conversation*?"
        description="This can’t be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {}}
      />
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* §9 — Interactions / React Bits                                      */
/* ------------------------------------------------------------------ */

function SectionInteractions() {
  return (
    <Section id="interactions" title="Interactions">
      <div className="space-y-6">
        <div>
          <div className="mb-2 font-pixel text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            TextType
          </div>
          <TextType
            as="p"
            className="min-h-[2rem] text-sm text-muted-foreground"
            text={[
              "Typing in…",
              "Rotating sentences…",
              "Hero tagline pattern.",
            ]}
            typingSpeed={38}
            deletingSpeed={18}
            pauseDuration={1800}
            cursorCharacter="▍"
          />
        </div>
        <div>
          <div className="mb-2 font-pixel text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            DecryptedText (hover)
          </div>
          <span className="font-display text-xl font-bold uppercase">
            <DecryptedText
              text="Reasoned"
              animateOn="hover"
              speed={22}
              maxIterations={8}
              className="text-foreground"
              encryptedClassName="text-muted-foreground/60"
            />
          </span>
        </div>
        <div>
          <div className="mb-2 font-pixel text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Magnet (hover close)
          </div>
          <Magnet padding={80} magnetStrength={3}>
            <button className={PRIMARY}>Attract me</button>
          </Magnet>
        </div>
        <div>
          <div className="mb-2 font-pixel text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            ClickSpark (click inside)
          </div>
          <div className="h-32 w-full max-w-sm border-2 border-border bg-card">
            <ClickSpark sparkColor="#171512" sparkCount={12} sparkRadius={22} duration={500}>
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                click anywhere in this panel
              </div>
            </ClickSpark>
          </div>
        </div>
        <div>
          <div className="mb-2 font-pixel text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            PixelSnow
          </div>
          <div className="relative h-32 w-full max-w-sm overflow-hidden border-2 border-border bg-card">
            <PixelSnow color="#baff39" density={0.18} speed={0.6} variant="square" />
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* §10 — Chat bubbles                                                  */
/* ------------------------------------------------------------------ */

const USER_BUBBLE =
  "space-y-2 rounded-2xl border-2 border-border bg-primary px-4 py-2.5 text-sm text-primary-foreground shadow-[3px_3px_0_0_var(--lime)]";
const ASSIST_BUBBLE =
  "space-y-2 rounded-2xl border-2 border-border bg-card px-4 py-2.5 text-sm text-foreground shadow-[3px_3px_0_0_var(--border)]";

function SectionChat() {
  return (
    <Section id="chat" title="Chat bubbles">
      <div className="flex flex-col gap-4">
        {/* User */}
        <div className="flex flex-col items-end">
          <div className="flex max-w-[80%] min-w-0 flex-col">
            <div className={USER_BUBBLE}>
              <p>Can you find a few restaurants in Montpellier?</p>
            </div>
          </div>
        </div>

        {/* Assistant */}
        <div className="flex flex-col items-start">
          <div className="flex max-w-[80%] min-w-0 flex-col">
            <div className={ASSIST_BUBBLE}>
              <details className="rounded-md border-2 border-border/30 bg-background/40 p-2 text-xs text-muted-foreground">
                <summary className="flex cursor-pointer select-none items-center gap-2 font-display font-semibold uppercase tracking-wider">
                  Reasoned
                  <span className="ml-auto font-mono tabular-nums text-[10px]">1.2s</span>
                </summary>
                <pre className="mt-1 whitespace-pre-wrap font-sans text-xs">
                  The user wants local restaurants. I should call web_search…
                </pre>
              </details>
              <div className="rounded-md border-2 border-border bg-card p-2.5 text-xs shadow-[2px_2px_0_0_var(--border)]">
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1.5 font-pixel uppercase tracking-[0.14em]">
                    <Wrench className="size-3.5" aria-hidden />
                    web_search
                  </span>
                  <span className="ml-auto font-mono tabular-nums text-[10px] text-muted-foreground">
                    342ms
                  </span>
                </div>
              </div>
              <p>Here are three solid picks in Montpellier.</p>
            </div>
            <div className="mt-1 flex w-full items-center gap-1">
              <span className="ml-auto font-mono tabular-nums text-[10px] text-muted-foreground">
                2.4s
              </span>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* §11 — Axolotl mascot                                                */
/* ------------------------------------------------------------------ */

function SectionMascot() {
  const [mood, setMood] = useState<AxolotlMood>("idle");
  const moods: AxolotlMood[] = ["idle", "happy", "curious", "sleepy"];
  return (
    <Section id="mascot" title="Axolotl mascot">
      <div className="flex flex-col items-start gap-6 md:flex-row md:items-center">
        <div className="relative">
          <ClickSpark sparkColor="#baff39" sparkCount={12} sparkRadius={22} duration={500}>
            <button
              onClick={() => setMood("happy")}
              className="rounded-2xl border-2 border-border bg-card p-3 shadow-[3px_3px_0_0_var(--border)]"
              aria-label="Poke"
            >
              <AxolotlSprite mood={mood} size={140} />
            </button>
          </ClickSpark>
          <div className="pointer-events-none absolute inset-0 -m-6 z-10 flex items-center justify-center">
            <CircularText
              text="AXOLOTL ✦ COMPANION ✦ LOCAL ✦ FIRST ✦ "
              spinDuration={28}
              onHover="speedUp"
              className="!h-[200px] !w-[200px] !text-[10px] !text-foreground font-pixel !uppercase !tracking-[0.18em]"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {moods.map((m) => (
            <button
              key={m}
              onClick={() => setMood(m)}
              className={cn(
                SECONDARY,
                mood === m && "shadow-[3px_3px_0_0_var(--lime)]",
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
    </Section>
  );
}
