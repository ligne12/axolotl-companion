import { ArrowRight, Clock } from "lucide-react";
import Link from "next/link";

import type { SessionPublic } from "@/types/api";

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const diffSec = Math.max(0, (Date.now() - then) / 1000);
  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.round(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.round(diffSec / 3600)}h ago`;
  const days = Math.round(diffSec / 86400);
  if (days < 14) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function RecentSessions({ sessions }: { sessions: SessionPublic[] }) {
  if (sessions.length === 0) {
    return (
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Recent
        </h2>
        <div className="rounded-2xl border-2 border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No conversations yet — start one from the hero above.
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Recent
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {sessions.map((s) => (
          <li key={s.id}>
            <Link
              href={`/chat/${s.id}`}
              className="group flex h-full flex-col justify-between gap-3 rounded-xl border-2 border-border bg-card p-4 shadow-[3px_3px_0_theme(colors.border)] transition-all hover:translate-y-[-1px] hover:shadow-[4px_4px_0_theme(colors.border)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div>
                <p className="line-clamp-2 font-medium leading-snug group-hover:text-primary">
                  {s.title}
                </p>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3" />
                  {formatRelative(s.updated_at)}
                </span>
                <ArrowRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
