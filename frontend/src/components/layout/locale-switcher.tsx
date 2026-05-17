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
 *
 * In ``compact`` mode the two segments collapse into a single button
 * that swaps to the other locale on click — used by the collapsed
 * sidebar rail.
 */
export function LocaleSwitcher({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const current = useLocale() as Locale;
  const [pending, startTransition] = useTransition();

  if (compact) {
    const other: Locale = current === "fr" ? "en" : "fr";
    return (
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => setLocale(other))}
        aria-label="Language"
        title={`→ ${LABELS[other]}`}
        className={cn(
          "font-pixel border-border bg-card text-foreground inline-flex size-9 items-center justify-center border-2 text-[11px] tracking-[0.14em] uppercase disabled:cursor-not-allowed disabled:opacity-60",
          className,
        )}
      >
        {LABELS[current]}
      </button>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="Language"
      className={cn("border-border bg-card inline-flex items-center border-2 p-0.5", className)}
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
              "font-pixel inline-flex h-7 min-w-7 items-center justify-center px-1.5 text-[10px] tracking-[0.14em] uppercase transition-colors disabled:cursor-not-allowed",
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
