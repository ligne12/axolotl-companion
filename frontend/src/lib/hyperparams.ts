/**
 * Static metadata for the sampling hyperparameters. The backend owns the
 * authoritative defaults (``backend/src/axolotl/config.py``); we mirror them
 * here so the UI can render sliders without a round-trip. If the backend
 * changes a default the slider will still ship the user's override correctly
 * — only the greyed-out placeholder would be stale.
 */

import type { HyperParams } from "@/types/api";

export const SAMPLING_DEFAULTS = {
  temperature: 1.0,
  top_p: 0.95,
  top_k: 20,
  min_p: 0.0,
  presence_penalty: 1.5,
  repetition_penalty: 1.0,
  max_tokens: 8192,
  enable_thinking: true,
} as const;

export type SamplingKey = Exclude<keyof HyperParams, "enable_thinking">;

export type SamplingFieldMeta = {
  key: SamplingKey;
  label: string;
  description: string;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
};

const fmt = (digits: number) => (v: number) => v.toFixed(digits);
const fmtInt = (v: number) => Math.round(v).toString();

export const SAMPLING_FIELDS: SamplingFieldMeta[] = [
  {
    key: "temperature",
    label: "Temperature",
    description: "Higher = more creative / random. 0 is deterministic.",
    min: 0,
    max: 2,
    step: 0.05,
    format: fmt(2),
  },
  {
    key: "top_p",
    label: "Top-p",
    description: "Nucleus sampling cutoff. Keeps the smallest set of tokens whose probability sums to this.",
    min: 0,
    max: 1,
    step: 0.01,
    format: fmt(2),
  },
  {
    key: "top_k",
    label: "Top-k",
    description: "Consider only the k most likely tokens each step.",
    min: 1,
    max: 500,
    step: 1,
    format: fmtInt,
  },
  {
    key: "min_p",
    label: "Min-p",
    description: "Drop tokens whose probability is below this fraction of the top token.",
    min: 0,
    max: 1,
    step: 0.01,
    format: fmt(2),
  },
  {
    key: "presence_penalty",
    label: "Presence penalty",
    description: "Positive values push the model toward new topics rather than repeating.",
    min: -2,
    max: 2,
    step: 0.05,
    format: fmt(2),
  },
  {
    key: "repetition_penalty",
    label: "Repetition penalty",
    description: "Scales down tokens that have already appeared. 1.0 disables.",
    min: 0.5,
    max: 2,
    step: 0.05,
    format: fmt(2),
  },
  {
    key: "max_tokens",
    label: "Max tokens",
    description: "Cap the length of the model's reply.",
    min: 128,
    max: 32768,
    step: 128,
    format: fmtInt,
  },
];

/** Strip undefined/null keys so the backend only stores set overrides. */
export function pruneHyperParams(params: HyperParams): HyperParams {
  const out: HyperParams = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    (out as Record<string, unknown>)[key] = value;
  }
  return out;
}

/** Shallow equality on the sampling keys we care about. */
export function hyperParamsEqual(a: HyperParams, b: HyperParams): boolean {
  const keys: (keyof HyperParams)[] = [
    "temperature",
    "top_p",
    "top_k",
    "min_p",
    "presence_penalty",
    "repetition_penalty",
    "max_tokens",
    "enable_thinking",
  ];
  return keys.every((k) => (a[k] ?? null) === (b[k] ?? null));
}
