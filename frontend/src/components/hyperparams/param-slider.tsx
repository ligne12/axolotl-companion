"use client";

import { Minus, Plus, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useHaptic } from "@/hooks/use-haptic";
import { SAMPLING_DEFAULTS, type SamplingFieldMeta } from "@/lib/hyperparams";
import { cn } from "@/lib/utils";

/**
 * Single-param row: label + clickable value pill + native range slider with
 * stepper buttons on either side. Native `<input type=range>` is styled
 * via globals.css to match the DA (24 px square thumb on touch devices).
 *
 * - `value === null` → "fall through to the default". The slider tracks the
 *   default value, the pill shows it dimmed with a `defaultLabel`, and the
 *   clear-override icon is hidden.
 * - `defaultValue` is the global sampling default in Settings → Model and
 *   the user-level default in the chat drawer, so the pill reports the
 *   *effective* fallback rather than the server one.
 * - Steppers (`±`) increment/decrement by `field.step` — the only sane way
 *   to nudge a value with `step=0.01` on a 200 px touch slider.
 * - Clicking the value pill swaps it for an inline numeric input so the
 *   user can type an exact value (Enter or blur to commit, Esc to cancel).
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
  const haptic = useHaptic();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(() => String(displayed));
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!editing) setDraft(String(displayed));
  }, [displayed, editing]);

  const clamp = (n: number) => Math.min(field.max, Math.max(field.min, n));
  const snap = (n: number) => {
    // Round to the slider's step so we don't drift floating-point noise.
    const inv = 1 / field.step;
    return Math.round(n * inv) / inv;
  };

  const stepBy = (delta: number) => {
    if (disabled) return;
    haptic("tap");
    onChange(clamp(snap(displayed + delta)));
  };

  const commitDraft = () => {
    const parsed = Number(draft);
    if (Number.isFinite(parsed)) {
      onChange(clamp(snap(parsed)));
      haptic("tap");
    }
    setEditing(false);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <label className="text-xs font-semibold uppercase tracking-wider">
          {field.label}
        </label>
        <div className="flex items-center gap-2">
          {editing ? (
            <input
              ref={inputRef}
              type="number"
              inputMode="decimal"
              step={field.step}
              min={field.min}
              max={field.max}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitDraft}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitDraft();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  setEditing(false);
                }
              }}
              autoFocus
              className="w-20 border-2 border-border bg-card px-2 py-0.5 text-right font-pixel text-[11px] uppercase tracking-[0.12em] outline-none focus:shadow-[2px_2px_0_0_var(--lime)]"
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                if (disabled) return;
                setEditing(true);
                requestAnimationFrame(() => inputRef.current?.select());
              }}
              disabled={disabled}
              aria-label={`Edit ${field.label.toLowerCase()} value`}
              className={cn(
                "border-2 border-border bg-card px-2 py-0.5 font-pixel text-[11px] uppercase tracking-[0.12em] transition-[transform,box-shadow] duration-100 hover:shadow-[1px_1px_0_0_var(--border)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-50",
                overridden ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {field.format(displayed)}
              {!overridden && (
                <span className="ml-1.5 text-[9px] tracking-[0.2em] text-muted-foreground">
                  {defaultLabel}
                </span>
              )}
            </button>
          )}
          {canClear && (
            <button
              type="button"
              onClick={() => {
                haptic("tap");
                onClear();
              }}
              disabled={disabled}
              aria-label={`Reset ${field.label.toLowerCase()} to default`}
              className="inline-flex size-9 items-center justify-center text-muted-foreground transition-colors hover:text-foreground active:scale-90 disabled:opacity-40 md:size-auto"
            >
              <RotateCcw className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Slider + steppers. Steppers are the only realistic way to nudge a
          value with step=0.01 on a touch-screen — dragging is too coarse. */}
      <div className="flex items-center gap-2">
        <Stepper
          icon={Minus}
          aria-label={`Decrement ${field.label.toLowerCase()}`}
          onClick={() => stepBy(-field.step)}
          disabled={disabled || displayed <= field.min}
        />
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
        <Stepper
          icon={Plus}
          aria-label={`Increment ${field.label.toLowerCase()}`}
          onClick={() => stepBy(field.step)}
          disabled={disabled || displayed >= field.max}
        />
      </div>

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        {field.description}
      </p>
    </div>
  );
}

function Stepper({
  icon: Icon,
  onClick,
  disabled,
  ...props
}: {
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  disabled?: boolean;
  "aria-label": string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex size-9 shrink-0 items-center justify-center border-2 border-border bg-card text-muted-foreground transition-[transform,colors,box-shadow] duration-75 hover:text-foreground hover:shadow-[1px_1px_0_0_var(--border)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-40 md:size-7"
      {...props}
    >
      <Icon className="size-4" />
    </button>
  );
}
