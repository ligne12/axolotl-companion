"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", icon: Sun, label: "Light" },
  { value: "system", icon: Monitor, label: "System" },
  { value: "dark", icon: Moon, label: "Dark" },
] as const;

const CYCLE = OPTIONS.map((o) => o.value);

/**
 * Pixel-neubru segmented control. Three states (Light · System · Dark),
 * each cell a 2px bordered button; the active one wears the lime inset.
 *
 * In ``compact`` mode the three segments collapse into a single button
 * that cycles through the values on click — used by the collapsed
 * sidebar rail where horizontal space is constrained.
 */
export function ThemeToggle({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  if (compact) {
    const current = (theme ?? "system") as (typeof CYCLE)[number];
    const idx = CYCLE.indexOf(current);
    const next = CYCLE[(idx + 1) % CYCLE.length] ?? "system";
    const opt = OPTIONS.find((o) => o.value === current) ?? OPTIONS[1]!;
    const Icon = opt.icon;
    return (
      <button
        type="button"
        onClick={() => setTheme(next)}
        aria-label={`Theme · ${opt.label}`}
        title={`Theme · ${opt.label}`}
        className={cn(
          "border-border bg-card text-foreground inline-flex size-7 items-center justify-center border-2 transition-colors",
          className,
        )}
      >
        <Icon className="size-3.5" />
      </button>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={cn("border-border bg-card inline-flex items-center border-2 p-0.5", className)}
    >
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const active = theme === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={opt.label}
            title={opt.label}
            onClick={() => setTheme(opt.value)}
            className={cn(
              "inline-flex size-7 items-center justify-center transition-colors",
              active
                ? "bg-[color:var(--lime)] text-[color:var(--lime-foreground)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" />
          </button>
        );
      })}
    </div>
  );
}
