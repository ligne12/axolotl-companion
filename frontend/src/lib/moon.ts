/**
 * Moon phase computation — Meeus's approximate formula, good enough for an
 * ambient status-line indicator (well within a day of reality).
 */

/** Fraction of the synodic cycle (0 = new moon, 0.5 = full moon, back to 0). */
export function moonPhaseFraction(date: Date = new Date()): number {
  // Reference new moon: 2000-01-06 18:14 UTC
  const refMs = Date.UTC(2000, 0, 6, 18, 14);
  const synodicDays = 29.530_588_861;
  const days = (date.getTime() - refMs) / (1000 * 60 * 60 * 24);
  return (((days / synodicDays) % 1) + 1) % 1;
}

export type MoonPhaseName =
  | "new"
  | "waxing-crescent"
  | "first-quarter"
  | "waxing-gibbous"
  | "full"
  | "waning-gibbous"
  | "last-quarter"
  | "waning-crescent";

export function moonPhaseName(fraction: number): MoonPhaseName {
  if (fraction < 0.03 || fraction >= 0.97) return "new";
  if (fraction < 0.22) return "waxing-crescent";
  if (fraction < 0.28) return "first-quarter";
  if (fraction < 0.47) return "waxing-gibbous";
  if (fraction < 0.53) return "full";
  if (fraction < 0.72) return "waning-gibbous";
  if (fraction < 0.78) return "last-quarter";
  return "waning-crescent";
}

const SHORT_LABEL: Record<MoonPhaseName, string> = {
  new: "New",
  "waxing-crescent": "Wax. Cres.",
  "first-quarter": "First Qtr",
  "waxing-gibbous": "Wax. Gibb.",
  full: "Full",
  "waning-gibbous": "Wan. Gibb.",
  "last-quarter": "Last Qtr",
  "waning-crescent": "Wan. Cres.",
};

export function moonPhaseLabel(name: MoonPhaseName): string {
  return SHORT_LABEL[name];
}
