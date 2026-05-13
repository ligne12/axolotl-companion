"use client";

import { Construction } from "lucide-react";

/**
 * Shared placeholder for Settings tabs that aren't wired yet (Personas /
 * Model / Reasoning). Keeps the active-tab grammar intact while we build
 * the real screens in F4.2 / F4.3.
 */
export function ComingSoon({
  title,
  milestone,
  children,
}: {
  title: string;
  milestone: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl leading-tight font-bold">{title}</h1>
        {children && <p className="text-muted-foreground max-w-xl text-sm">{children}</p>}
      </header>

      <div className="border-border bg-card/60 flex items-center gap-4 border-2 border-dashed p-6">
        <Construction className="text-muted-foreground size-6 shrink-0" aria-hidden />
        <div className="space-y-0.5">
          <p className="font-display text-base font-semibold">
            Coming in <span className="italic">{milestone}</span>
          </p>
          <p className="text-muted-foreground text-xs">
            Tab scaffold is in place — the form behind it ships in the next chunk.
          </p>
        </div>
      </div>
    </div>
  );
}
