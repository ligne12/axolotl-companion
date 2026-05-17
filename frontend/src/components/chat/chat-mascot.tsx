"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useRef } from "react";
import { toast } from "sonner";

import { useMood } from "@/hooks/use-mood";
import { cn } from "@/lib/utils";
import { useChatStatus } from "@/stores/chat-status";

// Lazy-load the Three.js bundle the same way ``HomeHero`` does so the
// chat shell stays light on first paint. The placeholder is a neutral
// sized tile that matches the final mascot footprint, avoiding layout
// shift when the GLB finishes hydrating.
const Axolotl3D = dynamic(
  () => import("@/components/axolotl/axolotl-3d").then((m) => m.Axolotl3D),
  {
    ssr: false,
    loading: () => (
      <div
        aria-hidden
        className="border-border bg-card size-12 shrink-0 rounded-xl border-2 shadow-[3px_3px_0_0_var(--border)] md:size-14"
      />
    ),
  },
);

const LONG_PRESS_MS = 500;

/**
 * Small persistent mascot pinned next to the chat composer. Reads
 * ``useMood()`` so it matches the home hero's seven-state grammar
 * (idle / listening / thinking / searching / typing / happy /
 * confused) but at ~56-72 px instead of 150 px.
 *
 * Long-press toggles ``mascotHidden`` on the chat-status store —
 * users who prefer a quieter UI can press-and-hold for half a second
 * and the mascot rolls up. A short toast mentions that a page reload
 * brings it back (the flag is not persisted to localStorage).
 */
export function ChatMascot() {
  const mood = useMood();
  const mascotHidden = useChatStatus((s) => s.mascotHidden);
  const setMascotHidden = useChatStatus((s) => s.setMascotHidden);
  const t = useTranslations("mascot");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (mascotHidden) return null;

  const armLongPress = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setMascotHidden(true);
      toast(t("hidden"), { description: t("hiddenDescription") });
    }, LONG_PRESS_MS);
  };

  const cancelLongPress = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  return (
    <button
      type="button"
      // Pointer events cover mouse + touch + pen in one path. We don't
      // emit any click action — the only gesture is the long-press
      // hide. Keep the button semantic for screen readers.
      onPointerDown={armLongPress}
      onPointerUp={cancelLongPress}
      onPointerLeave={cancelLongPress}
      onPointerCancel={cancelLongPress}
      onContextMenu={(e) => e.preventDefault()}
      aria-label={t("longPressHint")}
      title={t("longPressHint")}
      className={cn(
        "border-border bg-card shrink-0 rounded-xl border-2 p-1 shadow-[3px_3px_0_0_var(--border)] transition-[transform,box-shadow] duration-100 hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_0_var(--border)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_0_var(--border)]",
        // Mobile: smaller footprint, sits above the input via the
        // wrapping flex's column direction in ``ChatInput``.
        "size-12 md:size-14",
      )}
    >
      <Axolotl3D mood={mood} size={48} className="md:!h-[56px] md:!w-[56px]" />
    </button>
  );
}
