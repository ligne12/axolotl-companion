"use client";

/**
 * Tiny haptic feedback hook.
 *
 * iOS Safari does NOT expose any haptic API to the web (the Taptic Engine
 * is reserved for native apps), so on iPhones the visual `active:` state
 * — scale-down + offset-shadow collapse — is the only feedback the user
 * gets. On Android, ``navigator.vibrate()`` is available and gives a real
 * tactile pulse for ~10–30 ms.
 *
 * The hook is a no-op when the API is missing, so it's safe to call
 * unconditionally on every action.
 */

type HapticPattern = "tap" | "select" | "success" | "error";

const PATTERNS: Record<HapticPattern, number | number[]> = {
  // Single short pulse — confirms a button press, slider snap, toggle flip.
  tap: 10,
  // Slightly heavier — confirms a destination change (route nav, drawer open).
  select: 18,
  // Two-pulse pattern — confirms an action persisted (save, delete).
  success: [12, 40, 18],
  // Three quick pulses — flags an error (no submit, validation fail).
  error: [30, 50, 30, 50, 30],
};

export function useHaptic() {
  return (pattern: HapticPattern = "tap") => {
    if (typeof navigator === "undefined") return;
    if (typeof navigator.vibrate !== "function") return;
    try {
      navigator.vibrate(PATTERNS[pattern]);
    } catch {
      // Some browsers throw on rapid repeats — silently swallow.
    }
  };
}
