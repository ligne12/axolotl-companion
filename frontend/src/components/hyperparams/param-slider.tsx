"use client";

import { RotateCcw } from "lucide-react";

import { SAMPLING_DEFAULTS, type SamplingFieldMeta } from "@/lib/hyperparams";
import { cn } from "@/lib/utils";

/**
 * Single-param row: label + value pill + native range slider. Native
 * ``<input type=range>`` is styled via ``globals.css`` to match the DA.
 *
 * ``value === null`` means "fall through to the default" — the slider tracks
 * the default value, the pill shows it dimmed with a ``defaultLabel``, and the
 * clear-override button is hidden. ``defaultValue`` is usually the global
 * sampling default but in the chat drawer we pass the user-level default so
 * the slider reports the effective fallback, not the server one.
 */
export function ParamSlider({
  field,
  value,
  onChange,
  onClear,
  defaultValue,
  defaultLabel = "default",
  disabled,
}: {
  field: SamplingFieldMeta;
  value: number | null | undefined;
  onChange: (next: number) => void;
  onClear?: () => void;
  defaultValue?: number;
  defaultLabel?: string;
  disabled?: boolean;
}) {
  const fallback = defaultValue ?? (SAMPLING_DEFAULTS[field.key] as number);
  const overridden = value !== null && value !== undefined;
  const displayed = overridden ? (value as number) : fallback;
  const canClear = overridden && onClear !== undefined;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <label className="text-xs font-semibold uppercase tracking-wider">
          {field.label}
        </label>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "border-2 border-border bg-card px-2 py-0.5 font-pixel text-[11px] uppercase tracking-[0.12em]",
              overridden ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {field.format(displayed)}
            {!overridden && (
              <span className="ml-1.5 text-[9px] tracking-[0.2em] text-muted-foreground">
                {defaultLabel}
              </span>
            )}
          </span>
          {canClear && (
            <button
              type="button"
              onClick={onClear}
              disabled={disabled}
              aria-label={`Reset ${field.label.toLowerCase()} to default`}
              className="text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
            >
              <RotateCcw className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      <input
        type="range"
        min={field.min}
        max={field.max}
        step={field.step}
        value={displayed}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className="axo-range w-full"
      />

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        {field.description}
      </p>
    </div>
  );
}
