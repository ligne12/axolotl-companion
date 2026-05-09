"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { WeatherPill } from "@/components/layout/weather-pill";
import { useApi } from "@/hooks/use-api";
import { cn } from "@/lib/utils";
import { useChatStatus } from "@/stores/chat-status";
import type { UserPublic } from "@/types/api";

type RuntimeConfig = {
  version: string;
  model: string;
  model_source: "vllm" | "config";
};

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}

function formatClock(d: Date, format: "12h" | "24h" = "24h"): string {
  const m = d.getMinutes().toString().padStart(2, "0");
  if (format === "12h") {
    const hours = d.getHours();
    const suffix = hours >= 12 ? "PM" : "AM";
    const h12 = hours % 12 || 12;
    return `${h12}:${m} ${suffix}`;
  }
  const h = d.getHours().toString().padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * Vim/tmux-style status line pinned to the bottom of the AppShell main
 * column. Always visible, desktop + mobile. See DESIGN.md §5.
 *
 * Layout:
 *  - Mobile: two rows (LOCAL · locality · weather  /  clock · stream · model)
 *    at 12 px pixel font, ~36 px each → 72 px total
 *  - sm+: single row at 11 px pixel font, ~28 px
 */
export function TerminalBar() {
  const api = useApi();
  const isSending = useChatStatus((s) => s.isSending);
  const tokensPerSec = useChatStatus((s) => s.tokensPerSec);
  // Placeholder during SSR so the server's UTC clock doesn't mismatch the
  // client's local time on hydration. The effect below fills it in.
  const [clock, setClock] = useState<string>("--:--");

  // Live config from the backend — proxies vLLM ``/v1/models`` so the bar
  // shows the **actually loaded** model, not what an env var claims.
  const config = useQuery({
    queryKey: ["runtime-config"],
    queryFn: () => api<RuntimeConfig>("/v1/config"),
    staleTime: 5 * 60_000,
    retry: 1,
  });
  // Current user's locality — rendered next to the LOCAL dot when set.
  const me = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => api<UserPublic>("/auth/me"),
    staleTime: 60_000,
  });
  const modelName = config.data?.model ?? "—";
  const appVersion = config.data?.version ? `v${config.data.version}` : "";
  const locality = me.data?.locality?.trim() || null;
  const timeFormat: "12h" | "24h" = me.data?.time_format === "12h" ? "12h" : "24h";
  const tempUnit: "C" | "F" = me.data?.temperature_unit === "F" ? "F" : "C";

  useEffect(() => {
    const tick = () => setClock(formatClock(new Date(), timeFormat));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [timeFormat]);

  const Dot = ({ className }: { className?: string }) => (
    <span aria-hidden className={cn("inline-block size-1.5 shrink-0", className)} />
  );

  const StreamState = isSending ? (
    <span className="inline-flex items-center gap-1.5 text-foreground">
      <Dot className="animate-pulse bg-[color:var(--lime)]" />
      Streaming
      {typeof tokensPerSec === "number" && (
        <span className="ml-1 font-mono normal-case tracking-normal text-muted-foreground">
          {tokensPerSec}&thinsp;t/s
        </span>
      )}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <Dot className="bg-[color:var(--muted-foreground)] opacity-60" />
      Idle
    </span>
  );

  return (
    <div className="shrink-0 border-t-2 border-border bg-card font-pixel uppercase">
      {/* Row 1 — locality + weather (always visible). On sm+ this single row
          carries the entire bar. */}
      <div className="flex h-9 items-center gap-2 overflow-hidden px-3 text-[12px] tracking-[0.1em] sm:h-7 sm:gap-3 sm:px-4 sm:text-[11px] sm:tracking-[0.14em]">
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <Dot className="bg-[color:var(--lime)]" />
          <span className="shrink-0">Local</span>
          {locality && (
            <span className="min-w-0 text-muted-foreground">
              <span className="text-muted-foreground">· </span>
              <span className="text-foreground">{truncate(locality, 24)}</span>
            </span>
          )}
        </span>
        <WeatherPill locality={locality} unit={tempUnit} />

        {/* Desktop continuation — clock, model, stream, version on the
            same line. Hidden on mobile (rendered as row 2 below). */}
        <span className="hidden sm:contents">
          <Sep />
          <span className="font-mono tabular-nums text-foreground/80">{clock}</span>
          <Sep />
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <span className="text-foreground">Model</span>
            <span className="font-mono normal-case tracking-normal text-foreground/80">
              {truncate(modelName, 32)}
            </span>
          </span>
          <Sep />
          {StreamState}
          {appVersion && (
            <span className="ml-auto inline-flex items-center gap-3 text-muted-foreground">
              <Sep />
              <span className="font-mono normal-case tracking-normal">{appVersion}</span>
            </span>
          )}
        </span>
      </div>

      {/* Row 2 — mobile only. Clock + stream state + model.  */}
      <div className="flex h-9 items-center gap-2 overflow-hidden border-t border-border/40 px-3 text-[12px] tracking-[0.1em] sm:hidden">
        <span className="font-mono tabular-nums text-foreground/80">{clock}</span>
        <Sep />
        {StreamState}
        <span className="ml-auto inline-flex min-w-0 items-center gap-1.5 text-muted-foreground">
          <span className="shrink-0 text-foreground">Model</span>
          <span className="min-w-0 truncate font-mono normal-case tracking-normal text-foreground/80">
            {truncate(modelName, 18)}
          </span>
        </span>
      </div>
    </div>
  );
}

function Sep() {
  return (
    <span aria-hidden className="text-muted-foreground">
      ·
    </span>
  );
}
