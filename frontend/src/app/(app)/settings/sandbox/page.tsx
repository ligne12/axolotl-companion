"use client";

import {
  ArrowRight,
  Clock,
  MessageSquarePlus,
  Search,
  Send,
  Sparkles,
  Square,
  Trash2,
  Wrench,
} from "lucide-react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { useState } from "react";

import type { AxolotlMood } from "@/components/axolotl/axolotl-3d";
import CircularText from "@/components/reactbits/circular-text";

// Heavy Three.js bundle stays out of the initial paint; a neutral
// sized tile fills the slot during SSR + first-load.
const Axolotl3D = dynamic(
  () => import("@/components/axolotl/axolotl-3d").then((m) => m.Axolotl3D),
  {
    ssr: false,
    loading: () => (
      <div
        aria-hidden
        className="border-border bg-card size-[140px] rounded-2xl border-2 shadow-[3px_3px_0_0_var(--border)]"
      />
    ),
  },
);
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
  const t = useTranslations("sandbox");
  return (
    <div>
      <header className="mb-8 space-y-3">
        <h1 className="font-display text-3xl leading-tight font-bold">
          {t.rich("title", {
            em: (chunks) => <span className="italic">{chunks}</span>,
          })}
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm">{t("intro")}</p>
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
      <h2 className="font-display text-xl font-bold tracking-tight uppercase">
        <span className="font-pixel text-muted-foreground text-[11px] font-normal tracking-widest uppercase">
          §{" "}
        </span>
        {title}
      </h2>
      <div className="border-border bg-card rounded-xl border-2 p-6 shadow-[3px_3px_0_0_var(--border)]">
        {children}
      </div>
    </section>
  );
}

function Row({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      {label && (
        <div className="font-pixel text-muted-foreground text-[10px] tracking-[0.14em] uppercase">
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
          <div className="font-pixel text-muted-foreground text-[10px] tracking-[0.14em] uppercase">
            Clash Display · h1
          </div>
          <h1 className="font-display text-5xl leading-[1.05] font-bold">
            Your <span className="italic">axolotl</span> is listening.
          </h1>
        </div>
        <div>
          <div className="font-pixel text-muted-foreground text-[10px] tracking-[0.14em] uppercase">
            Clash Display · h2
          </div>
          <h2 className="font-display text-3xl font-bold">
            Pick what the axolotl can <span className="italic">reach for</span>.
          </h2>
        </div>
        <div>
          <div className="font-pixel text-muted-foreground text-[10px] tracking-[0.14em] uppercase">
            Inter · body
          </div>
          <p className="max-w-xl text-sm leading-relaxed">
            Body copy is Inter at 14/22 with comfortable measure. Secondary text uses{" "}
            <span className="text-muted-foreground">muted-foreground</span>.
          </p>
        </div>
        <div>
          <div className="font-pixel text-muted-foreground text-[10px] tracking-[0.14em] uppercase">
            Pixelify Sans · label
          </div>
          <span className="font-pixel text-[12px] tracking-[0.14em] uppercase">
            LOCAL · AXOLOTL · COMPANION
          </span>
        </div>
        <div>
          <div className="font-pixel text-muted-foreground text-[10px] tracking-[0.14em] uppercase">
            Mono tabular · numerics
          </div>
          <span className="font-mono text-sm tabular-nums">16:45 · 342 t/s · v0.2.0 · 1.2s</span>
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
      className="border-border flex h-16 min-w-[10rem] flex-col justify-between border-2 p-2"
      style={{ backgroundColor: value, color: fg }}
    >
      <span className="font-pixel text-[10px] tracking-widest uppercase">{name}</span>
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
          <Swatch
            name="destructive"
            value="var(--destructive)"
            fg="var(--destructive-foreground)"
          />
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
          <button
            className={cn("inline-flex size-11 items-center justify-center", DESTRUCTIVE)}
            aria-label="Stop"
          >
            <Square className="size-4" />
          </button>
        </Row>
        <Row label="Icon-only primary">
          <button
            className={cn("inline-flex size-11 items-center justify-center", PRIMARY)}
            aria-label="Send"
          >
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
        <span className="border-border bg-card font-pixel inline-flex items-center gap-2 border-2 px-2.5 py-1 text-[12px] tracking-[0.14em] uppercase">
          <span className="size-2 bg-[color:var(--lime)]" />
          Registration
        </span>
        <span className="border-border bg-card font-pixel inline-flex items-center gap-2 border-2 px-2.5 py-1 text-[12px] tracking-[0.14em] uppercase">
          <span className="size-2 bg-[color:var(--lime)]" />
          Hi Thomas
        </span>
      </Row>
      <div className="mt-4" />
      <Row label="Category tag">
        <span className="border-border bg-background font-pixel text-muted-foreground inline-block border-2 px-1.5 py-0.5 text-[11px] tracking-wider uppercase">
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
    <span className="border-border bg-background font-pixel inline-flex min-w-[1.4rem] items-center justify-center border-2 px-1.5 py-0.5 text-[11px] tracking-wider uppercase">
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
          <label className="block text-xs font-semibold tracking-wider uppercase">Text input</label>
          <input
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder="Type something…"
            className="border-border bg-card placeholder:text-muted-foreground w-full max-w-sm border-2 px-3 py-2.5 text-sm transition-[box-shadow] duration-100 outline-none focus:shadow-[3px_3px_0_0_var(--lime)]"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold tracking-wider uppercase">Textarea</label>
          <textarea
            defaultValue="Multi-line…"
            rows={3}
            className="border-border bg-card w-full max-w-sm resize-none border-2 px-3 py-2.5 text-sm outline-none focus:shadow-[3px_3px_0_0_var(--lime)]"
          />
        </div>
        <div>
          <Row label="Pixel switch (tools toggle)">
            <PixelSwitch checked={checked} onChange={setChecked} />
            <span className="text-muted-foreground text-sm">
              {checked ? "enabled" : "disabled"}
            </span>
          </Row>
        </div>
        <div>
          <Row label="Sidebar filter input">
            <div className="relative w-full max-w-xs">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2" />
              <input
                placeholder="Filter…"
                className="border-border bg-card placeholder:text-muted-foreground h-8 w-full border-2 pr-8 pl-7 text-[13px] outline-none focus:shadow-[3px_3px_0_0_var(--lime)]"
              />
              <span className="border-border/40 bg-background font-pixel text-muted-foreground pointer-events-none absolute top-1/2 right-1.5 -translate-y-1/2 border px-1 py-0.5 text-[9px] tracking-widest uppercase">
                /
              </span>
            </div>
          </Row>
        </div>
      </div>
    </Section>
  );
}

function PixelSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "border-border relative inline-flex h-7 w-12 shrink-0 items-center border-2 transition-colors",
        checked ? "bg-[color:var(--lime)]" : "bg-card",
      )}
    >
      <span
        className={cn(
          "border-border bg-background inline-block size-4 border-2 transition-transform",
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
        <div className="border-border bg-card rounded-xl border-2 p-4 shadow-[3px_3px_0_0_var(--border)]">
          <p className="font-medium">Static card</p>
          <p className="text-muted-foreground mt-1 text-xs">
            ``border-2 border-border bg-card p-4 shadow-[3px_3px_0_0_var(--border)]``
          </p>
        </div>
        <a
          href="#"
          onClick={(e) => e.preventDefault()}
          className="group border-border bg-card flex h-full flex-col justify-between gap-3 rounded-xl border-2 p-4 shadow-[3px_3px_0_0_var(--border)] transition-[transform,box-shadow] duration-100 hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[5px_5px_0_0_var(--lime)]"
        >
          <p className="group-hover:text-foreground font-medium">Interactive (hover me)</p>
          <div className="text-muted-foreground flex items-center justify-between text-xs">
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
          <div className="font-pixel text-muted-foreground mb-2 text-[10px] tracking-[0.14em] uppercase">
            TextType
          </div>
          <TextType
            as="p"
            className="text-muted-foreground min-h-[2rem] text-sm"
            text={["Typing in…", "Rotating sentences…", "Hero tagline pattern."]}
            typingSpeed={38}
            deletingSpeed={18}
            pauseDuration={1800}
            cursorCharacter="▍"
          />
        </div>
        <div>
          <div className="font-pixel text-muted-foreground mb-2 text-[10px] tracking-[0.14em] uppercase">
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
          <div className="font-pixel text-muted-foreground mb-2 text-[10px] tracking-[0.14em] uppercase">
            Magnet (hover close)
          </div>
          <Magnet padding={80} magnetStrength={3}>
            <button className={PRIMARY}>Attract me</button>
          </Magnet>
        </div>
        <div>
          <div className="font-pixel text-muted-foreground mb-2 text-[10px] tracking-[0.14em] uppercase">
            ClickSpark (click inside)
          </div>
          <div className="border-border bg-card h-32 w-full max-w-sm border-2">
            <ClickSpark sparkColor="#171512" sparkCount={12} sparkRadius={22} duration={500}>
              <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
                click anywhere in this panel
              </div>
            </ClickSpark>
          </div>
        </div>
        <div>
          <div className="font-pixel text-muted-foreground mb-2 text-[10px] tracking-[0.14em] uppercase">
            PixelSnow
          </div>
          <div className="border-border bg-card relative h-32 w-full max-w-sm overflow-hidden border-2">
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
              <details className="border-border/30 bg-background/40 text-muted-foreground rounded-md border-2 p-2 text-xs">
                <summary className="font-display flex cursor-pointer items-center gap-2 font-semibold tracking-wider uppercase select-none">
                  Reasoned
                  <span className="ml-auto font-mono text-[10px] tabular-nums">1.2s</span>
                </summary>
                <pre className="mt-1 font-sans text-xs whitespace-pre-wrap">
                  The user wants local restaurants. I should call web_search…
                </pre>
              </details>
              <div className="border-border bg-card rounded-md border-2 p-2.5 text-xs shadow-[2px_2px_0_0_var(--border)]">
                <div className="flex items-center gap-1.5">
                  <span className="font-pixel inline-flex items-center gap-1.5 tracking-[0.14em] uppercase">
                    <Wrench className="size-3.5" aria-hidden />
                    web_search
                  </span>
                  <span className="text-muted-foreground ml-auto font-mono text-[10px] tabular-nums">
                    342ms
                  </span>
                </div>
              </div>
              <p>Here are three solid picks in Montpellier.</p>
            </div>
            <div className="mt-1 flex w-full items-center gap-1">
              <span className="text-muted-foreground ml-auto font-mono text-[10px] tabular-nums">
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

const MOODS: AxolotlMood[] = [
  "idle",
  "listening",
  "thinking",
  "searching",
  "typing",
  "happy",
  "confused",
];

function SectionMascot() {
  const [mood, setMood] = useState<AxolotlMood>("idle");
  return (
    <Section id="mascot" title="Axolotl mascot">
      <div className="flex flex-col items-start gap-8 md:flex-row md:items-center md:gap-10">
        <div className="relative shrink-0">
          <ClickSpark sparkColor="#baff39" sparkCount={12} sparkRadius={22} duration={500}>
            <button
              onClick={() => setMood("happy")}
              className="border-border bg-card rounded-2xl border-2 p-3 shadow-[3px_3px_0_0_var(--border)] transition-[transform,box-shadow] duration-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_0_var(--border)]"
              aria-label="Poke"
            >
              <Axolotl3D mood={mood} size={140} />
            </button>
          </ClickSpark>
          <div className="pointer-events-none absolute inset-0 z-10 -m-6 flex items-center justify-center">
            <CircularText
              text="AXOLOTL ✦ COMPANION ✦ LOCAL ✦ FIRST ✦ "
              spinDuration={28}
              onHover="speedUp"
              className="!text-foreground font-pixel !h-[200px] !w-[200px] !text-[10px] !tracking-[0.18em] !uppercase"
            />
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="space-y-1.5">
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Blender-baked GLB driven by Three.js with seven NLA clips (idle, listening, thinking,
              searching, typing, happy, confused) and a 300 ms crossfade between moods. The renderer
              lives in ``components/axolotl/axolotl-3d.tsx`` and is consumed by the home hero plus
              this preview.
            </p>
          </div>

          <div className="space-y-1.5">
            <p className="font-pixel text-muted-foreground text-[10px] tracking-[0.14em] uppercase">
              Mood
            </p>
            <div className="flex flex-wrap gap-2">
              {MOODS.map((m) => (
                <button
                  key={m}
                  onClick={() => setMood(m)}
                  className={cn(SECONDARY, mood === m && "shadow-[3px_3px_0_0_var(--lime)]")}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
