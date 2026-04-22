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
        <h1 className="font-display text-3xl font-bold leading-tight">
          {title}
        </h1>
        {children && (
          <p className="max-w-xl text-sm text-muted-foreground">{children}</p>
        )}
      </header>

      <div className="flex items-center gap-4 border-2 border-dashed border-border bg-card/60 p-6">
        <Construction className="size-6 shrink-0 text-muted-foreground" aria-hidden />
        <div className="space-y-0.5">
          <p className="font-display text-base font-semibold">
            Coming in <span className="italic">{milestone}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Tab scaffold is in place — the form behind it ships in the next chunk.
          </p>
        </div>
      </div>
    </div>
  );
}
