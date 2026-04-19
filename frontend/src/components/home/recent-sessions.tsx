"use client";

import { ArrowRight, Clock } from "lucide-react";
import { motion } from "motion/react";
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
        <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Recent
        </h2>
        <div className="rounded-xl border-2 border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No conversations yet — start one from the hero above.
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        Recent
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {sessions.map((s, i) => (
          <motion.li
            key={s.id}
            initial={{ opacity: 0, y: 10, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.32, delay: Math.min(i, 8) * 0.06, ease: "easeOut" }}
          >
            <Link
              href={`/chat/${s.id}`}
              className="group flex h-full flex-col justify-between gap-3 rounded-xl border-2 border-border bg-card p-4 shadow-[3px_3px_0_0_var(--border)] transition-[transform,box-shadow] duration-100 hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[5px_5px_0_0_var(--lime)] focus:outline-none focus-visible:-translate-x-[1px] focus-visible:-translate-y-[1px] focus-visible:shadow-[5px_5px_0_0_var(--lime)]"
            >
              <div>
                <p className="line-clamp-2 font-medium leading-snug">{s.title}</p>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3" />
                  {formatRelative(s.updated_at)}
                </span>
                <ArrowRight className="size-3.5 translate-x-[-4px] opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
              </div>
            </Link>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}
