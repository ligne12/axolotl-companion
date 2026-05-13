"use client";

import { ArrowRight, Clock } from "lucide-react";
import { motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";

import type { SessionPublic } from "@/types/api";

/**
 * Locale-aware relative time. Used by ``<RecentSessions>`` to show
 * "5 min ago" on each card.
 *
 * The bare ``Date.now()`` differs between SSR and the first client
 * render, so we render a stable placeholder during SSR (the empty
 * string) and let an effect swap in the real value after hydration.
 * That kills the React 19 hydration-mismatch warning that complained
 * about ``4/25/2026`` (server) vs ``25/04/2026`` (client) when the
 * fallback formatted via ``toLocaleDateString()`` without a locale.
 */
function useRelativeTime(iso: string): string {
  const t = useTranslations("home.relativeTime");
  const locale = useLocale();
  const [label, setLabel] = useState("");

  useEffect(() => {
    const compute = () => {
      const then = new Date(iso).getTime();
      const diffSec = Math.max(0, (Date.now() - then) / 1000);
      if (diffSec < 60) return t("justNow");
      if (diffSec < 3600) return t("minutes", { count: Math.round(diffSec / 60) });
      if (diffSec < 86400) return t("hours", { count: Math.round(diffSec / 3600) });
      const days = Math.round(diffSec / 86400);
      if (days < 14) return t("days", { count: days });
      return new Date(iso).toLocaleDateString(locale);
    };
    setLabel(compute());
    const id = setInterval(() => setLabel(compute()), 60_000);
    return () => clearInterval(id);
  }, [iso, locale, t]);

  return label;
}

function RecentSessionRow({ s }: { s: SessionPublic }) {
  const relative = useRelativeTime(s.updated_at);
  return (
    <Link
      href={`/chat/${s.id}`}
      className="group border-border bg-card flex h-full flex-col justify-between gap-3 rounded-xl border-2 p-4 shadow-[3px_3px_0_0_var(--border)] transition-[transform,box-shadow] duration-100 hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[5px_5px_0_0_var(--lime)] focus:outline-none focus-visible:-translate-x-[1px] focus-visible:-translate-y-[1px] focus-visible:shadow-[5px_5px_0_0_var(--lime)]"
    >
      <div>
        <p className="line-clamp-2 leading-snug font-medium">{s.title}</p>
      </div>
      <div className="text-muted-foreground flex items-center justify-between text-xs">
        <span className="inline-flex items-center gap-1" suppressHydrationWarning>
          <Clock className="size-3" />
          {relative}
        </span>
        <ArrowRight className="size-3.5 translate-x-[-4px] opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
      </div>
    </Link>
  );
}

export function RecentSessions({ sessions }: { sessions: SessionPublic[] }) {
  const t = useTranslations("home");
  if (sessions.length === 0) {
    return (
      <section>
        <h2 className="font-display text-muted-foreground mb-3 text-sm font-semibold tracking-[0.2em] uppercase">
          {t("recent")}
        </h2>
        <div className="border-border text-muted-foreground rounded-xl border-2 border-dashed p-8 text-center text-sm">
          {t("empty")}
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2 className="font-display text-muted-foreground mb-3 text-sm font-semibold tracking-[0.2em] uppercase">
        {t("recent")}
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {sessions.map((s, i) => (
          <motion.li
            key={s.id}
            initial={{ opacity: 0, y: 10, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.32, delay: Math.min(i, 8) * 0.06, ease: "easeOut" }}
          >
            <RecentSessionRow s={s} />
          </motion.li>
        ))}
      </ul>
    </section>
  );
}
