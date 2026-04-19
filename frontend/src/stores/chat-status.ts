/**
 * Global stream status — read by the terminal footer, any future
 * ambient indicator, etc. Written to by ``useChat`` on send/delta/done.
 * Single source of truth, no prop drilling.
 */
import { create } from "zustand";

type ChatStatus = {
  isSending: boolean;
  tokensPerSec: number | null;
  setIsSending: (v: boolean) => void;
  setTokensPerSec: (v: number | null) => void;
  reset: () => void;
};

export const useChatStatus = create<ChatStatus>((set) => ({
  isSending: false,
  tokensPerSec: null,
  setIsSending: (isSending) => set({ isSending }),
  setTokensPerSec: (tokensPerSec) => set({ tokensPerSec }),
  reset: () => set({ isSending: false, tokensPerSec: null }),
}));
