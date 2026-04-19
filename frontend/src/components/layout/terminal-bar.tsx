"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { useApi } from "@/hooks/use-api";
import { cn } from "@/lib/utils";
import { useChatStatus } from "@/stores/chat-status";

type RuntimeConfig = {
  version: string;
  model: string;
  model_source: "vllm" | "config";
};

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}

function formatClock(d: Date): string {
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * Vim/tmux-style status line pinned to the bottom of the AppShell main
 * column. Always visible, desktop + mobile. See DESIGN.md §5.
 */
export function TerminalBar() {
  const api = useApi();
  const isSending = useChatStatus((s) => s.isSending);
  const tokensPerSec = useChatStatus((s) => s.tokensPerSec);
  const [clock, setClock] = useState<string>(() => formatClock(new Date()));

  // Live config from the backend — proxies vLLM ``/v1/models`` so the bar
  // shows the **actually loaded** model, not what an env var claims.
  const config = useQuery({
    queryKey: ["runtime-config"],
    queryFn: () => api<RuntimeConfig>("/v1/config"),
    staleTime: 5 * 60_000,
    retry: 1,
  });
  const modelName = config.data?.model ?? "—";
  const appVersion = config.data?.version ? `v${config.data.version}` : "";

  useEffect(() => {
    const tick = () => setClock(formatClock(new Date()));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  const Dot = ({ className }: { className?: string }) => (
    <span
      aria-hidden
      className={cn("inline-block size-1.5 shrink-0", className)}
    />
  );

  return (
    <div className="flex h-7 shrink-0 items-center gap-3 border-t-2 border-border bg-card px-4 font-pixel text-[10px] uppercase tracking-[0.14em]">
      {/* LOCAL */}
      <span className="inline-flex items-center gap-1.5">
        <Dot className="bg-[color:var(--lime)]" />
        Local
      </span>

      <Sep />

      {/* Clock */}
      <span className="font-mono tabular-nums text-foreground/80">{clock}</span>

      <Sep />

      {/* Model — fetched live from /v1/config (proxies vLLM /v1/models) */}
      <span className="hidden sm:inline-flex items-center gap-1.5 text-muted-foreground">
        <span className="text-foreground">Model</span>
        <span className="font-mono normal-case tracking-normal text-foreground/80">
          {truncate(modelName, 32)}
        </span>
      </span>

      <span className="hidden sm:inline"><Sep /></span>

      {/* Stream state */}
      {isSending ? (
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
      )}

      {/* Right-side */}
      {appVersion && (
        <span className="ml-auto hidden sm:inline-flex items-center gap-3 text-muted-foreground">
          <Sep />
          <span className="font-mono normal-case tracking-normal">{appVersion}</span>
        </span>
      )}
    </div>
  );
}

function Sep() {
  return <span aria-hidden className="text-muted-foreground">·</span>;
}
