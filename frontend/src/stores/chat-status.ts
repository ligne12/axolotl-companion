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
  setIsSending: (v: boolean) => void;
  setTokensPerSec: (v: number | null) => void;
  setCurrentTool: (v: string | null) => void;
  flagError: () => void;
  reset: () => void;
};

const ERROR_FLASH_MS = 3000;

export const useChatStatus = create<ChatStatus>((set) => {
  let errorTimer: ReturnType<typeof setTimeout> | null = null;
  return {
    isSending: false,
    tokensPerSec: null,
    currentTool: null,
    lastError: false,
    setIsSending: (isSending) => set({ isSending }),
    setTokensPerSec: (tokensPerSec) => set({ tokensPerSec }),
    setCurrentTool: (currentTool) => set({ currentTool }),
    flagError: () => {
      set({ lastError: true });
      if (errorTimer) clearTimeout(errorTimer);
      errorTimer = setTimeout(() => set({ lastError: false }), ERROR_FLASH_MS);
    },
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
      });
    },
  };
});
