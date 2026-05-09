"use client";

import { useLocale } from "next-intl";
import { useTransition } from "react";

import { setLocale } from "@/i18n/actions";
import { LOCALES, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

const LABELS: Record<Locale, string> = {
  fr: "FR",
  en: "EN",
};

/**
 * Pixel-neubru segmented control mirroring ``ThemeToggle``: one cell per
 * locale, the active one wears the lime inset. Writes the cookie via a
 * server action and lets ``revalidatePath('/', 'layout')`` swap the
 * messages for the next render.
 */
export function LocaleSwitcher({ className }: { className?: string }) {
  const current = useLocale() as Locale;
  const [pending, startTransition] = useTransition();

  return (
    <div
      role="radiogroup"
      aria-label="Language"
      className={cn(
        "inline-flex items-center border-2 border-border bg-card p-0.5",
        className,
      )}
    >
      {LOCALES.map((code) => {
        const active = current === code;
        return (
          <button
            key={code}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={pending || active}
            onClick={() => startTransition(() => setLocale(code))}
            className={cn(
              "inline-flex h-7 min-w-7 items-center justify-center px-1.5 font-pixel text-[10px] uppercase tracking-[0.14em] transition-colors disabled:cursor-not-allowed",
              active
                ? "bg-[color:var(--lime)] text-[color:var(--lime-foreground)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {LABELS[code]}
          </button>
        );
      })}
    </div>
  );
}
