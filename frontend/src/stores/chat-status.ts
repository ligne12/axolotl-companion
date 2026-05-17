/**
 * Global stream status — read by the terminal footer, any future
 * ambient indicator, etc. Written to by ``useChat`` on send/delta/done.
 * Single source of truth, no prop drilling.
 */
import { create } from "zustand";

type ChatStatus = {
  isSending: boolean;
  tokensPerSec: number | null;
  /** Name of the tool currently streaming (e.g. "web_search"), null when none. */
  currentTool: string | null;
  /** True for ~3s after a stream error so the mascot can react. */
  lastError: boolean;
  /**
   * Session-scoped "vibe" counter consumed by the mascot's mood
   * derivation. ``+1`` on each successful round, ``-2`` on each error
   * / retry. Crossing the thresholds defined in ``ENERGY_*`` flips the
   * idle clip toward a perky or tired variant. Never persisted —
   * reset on ``useChat`` mount / session change.
   */
  energy: number;
  /** Per-session toggle: hide the inline mascot for a quieter UI. */
  mascotHidden: boolean;
  setIsSending: (v: boolean) => void;
  setTokensPerSec: (v: number | null) => void;
  setCurrentTool: (v: string | null) => void;
  flagError: () => void;
  bumpEnergy: (delta: number) => void;
  setMascotHidden: (v: boolean) => void;
  reset: () => void;
};

const ERROR_FLASH_MS = 3000;

/** Energy floor / ceiling — keeps a single bad day from spiralling. */
export const ENERGY_MIN = -8;
export const ENERGY_MAX = 8;
/** Threshold for the idle clip to lean tired (≤) or perky (≥). */
export const ENERGY_TIRED = -4;
export const ENERGY_PERKY = 4;

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export const useChatStatus = create<ChatStatus>((set) => {
  let errorTimer: ReturnType<typeof setTimeout> | null = null;
  return {
    isSending: false,
    tokensPerSec: null,
    currentTool: null,
    lastError: false,
    energy: 0,
    mascotHidden: false,
    setIsSending: (isSending) => set({ isSending }),
    setTokensPerSec: (tokensPerSec) => set({ tokensPerSec }),
    setCurrentTool: (currentTool) => set({ currentTool }),
    flagError: () => {
      set({ lastError: true });
      if (errorTimer) clearTimeout(errorTimer);
      errorTimer = setTimeout(() => set({ lastError: false }), ERROR_FLASH_MS);
    },
    bumpEnergy: (delta) =>
      set((s) => ({ energy: clamp(s.energy + delta, ENERGY_MIN, ENERGY_MAX) })),
    setMascotHidden: (mascotHidden) => set({ mascotHidden }),
    reset: () => {
      if (errorTimer) {
        clearTimeout(errorTimer);
        errorTimer = null;
      }
      set({
        isSending: false,
        tokensPerSec: null,
        currentTool: null,
        lastError: false,
        energy: 0,
        // ``mascotHidden`` is intentionally NOT reset — the user
        // hid the mascot deliberately and the preference outlives a
        // single chat round.
      });
    },
  };
});
