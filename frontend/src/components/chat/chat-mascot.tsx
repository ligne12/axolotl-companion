"use client";

import { motion } from "motion/react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { useMood } from "@/hooks/use-mood";
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
        className="border-border bg-card size-14 shrink-0 rounded-xl border-2 shadow-[3px_3px_0_0_var(--border)]"
      />
    ),
  },
);

/** Threshold above which a pointerdown→pointerup pair counts as a long-press
 *  (hide) rather than a click (toggle size). */
const LONG_PRESS_MS = 500;

/** Edge of the inner canvas in px for each size mode. The outer button
 *  wraps with 4 px of padding, so the tile itself is +8 px on each axis. */
const SMALL_PX = 56;
const LARGE_PX = 104;

/**
 * Small persistent mascot pinned next to the chat composer. Reads
 * ``useMood()`` so it matches the home hero's seven-state grammar
 * (idle / listening / thinking / searching / typing / happy /
 * confused).
 *
 * Two gestures :
 *  - **Click / tap** toggles between ``small`` and ``large`` so the
 *    user can pop the chibi forward when they want to admire it and
 *    tuck it back to keep the chat readable.
 *  - **Long-press** (~500 ms) hides the mascot for the rest of the
 *    browser session, with a toast pointing at "reload to bring back".
 */
export function ChatMascot() {
  const mood = useMood();
  const mascotHidden = useChatStatus((s) => s.mascotHidden);
  const setMascotHidden = useChatStatus((s) => s.setMascotHidden);
  const t = useTranslations("mascot");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Whether the in-flight gesture already classified as a long-press
  // — if so, ``pointerup`` must NOT also treat it as a click.
  const longPressedRef = useRef(false);
  const [large, setLarge] = useState(false);

  if (mascotHidden) return null;

  const onPointerDown = () => {
    longPressedRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      longPressedRef.current = true;
      setMascotHidden(true);
      toast(t("hidden"), { description: t("hiddenDescription") });
    }, LONG_PRESS_MS);
  };

  const onPointerUp = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (longPressedRef.current) return;
    setLarge((v) => !v);
  };

  const cancelGesture = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    longPressedRef.current = false;
  };

  const px = large ? LARGE_PX : SMALL_PX;
  const tileEdge = px + 8;

  return (
    <motion.button
      type="button"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={cancelGesture}
      onPointerCancel={cancelGesture}
      onContextMenu={(e) => e.preventDefault()}
      aria-label={t("toggleSizeHint")}
      title={t("toggleSizeHint")}
      animate={{ width: tileEdge, height: tileEdge }}
      // Slight bounce on resize — spring overshoots by ~5 % before
      // settling. Mass + damping tuned so the rebound is felt but
      // never jittery.
      transition={{ type: "spring", stiffness: 320, damping: 18, mass: 0.7 }}
      className="border-border bg-card flex shrink-0 items-center justify-center rounded-xl border-2 p-1 shadow-[3px_3px_0_0_var(--border)] hover:shadow-[4px_4px_0_0_var(--border)]"
    >
      <Axolotl3D mood={mood} size={px} className="!h-full !w-full" />
    </motion.button>
  );
}
