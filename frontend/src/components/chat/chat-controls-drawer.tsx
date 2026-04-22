"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Construction, X } from "lucide-react";
import Link from "next/link";

import { ToolsList } from "@/components/tools/tools-list";

/**
 * Slide-in side drawer anchored to the right of the main column. Gives
 * the chat fast access to per-turn knobs without leaving the conversation.
 *
 * Sections:
 *  - Tools — live toggles, writes to ``PUT /v1/tools/{name}`` (user-level
 *    for now; session-override backend lands in F4.3).
 *  - Model & reasoning — placeholder until F4.3 ships the per-session
 *    hyperparameter + think-mode override.
 */
export function ChatControlsDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/55 data-[state=open]:animate-[axo-fade-in_200ms_ease-out] data-[state=closed]:animate-[axo-fade-out_180ms_ease-in]" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed right-0 top-0 z-50 flex h-dvh w-[min(92vw,22rem)] flex-col border-l-2 border-border bg-card shadow-[-4px_0_0_0_var(--border)] data-[state=open]:animate-[axo-slide-in-right_200ms_ease-out] data-[state=closed]:animate-[axo-slide-out-right_180ms_ease-in] focus:outline-none"
        >
          <div className="flex items-center justify-between border-b-2 border-border px-4 py-3">
            <Dialog.Title asChild>
              <h2 className="font-display text-lg font-bold">
                Chat <span className="italic">controls</span>
              </h2>
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="text-muted-foreground transition-colors hover:text-destructive"
              >
                <X className="size-5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-5">
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="font-pixel text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  Tools
                </h3>
                <span className="border-2 border-border bg-background px-1.5 py-0.5 font-pixel text-[9px] uppercase tracking-widest text-muted-foreground">
                  user-level
                </span>
              </div>
              <ToolsList compact />
            </section>

            <section className="mt-8 space-y-3">
              <h3 className="font-pixel text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                Model &amp; reasoning
              </h3>
              <div className="flex items-center gap-3 border-2 border-dashed border-border bg-card/60 p-4">
                <Construction className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                <div className="space-y-0.5 text-xs">
                  <p className="font-display text-sm font-semibold">
                    Coming in <span className="italic">F4.3</span>
                  </p>
                  <p className="text-muted-foreground">
                    Per-session hyperparameters + think-mode toggle.{" "}
                    <Link
                      href="/settings/model"
                      className="underline underline-offset-2"
                      onClick={() => onOpenChange(false)}
                    >
                      Open Settings
                    </Link>{" "}
                    for the global defaults.
                  </p>
                </div>
              </div>
            </section>
          </div>

          <div className="border-t-2 border-border px-4 py-2">
            <span className="font-pixel text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              ⌘, to toggle this panel
            </span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
