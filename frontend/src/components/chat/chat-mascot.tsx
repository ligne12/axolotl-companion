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
        className="border-border bg-card size-[80px] shrink-0 rounded-xl border-2 shadow-[3px_3px_0_0_var(--border)]"
      />
    ),
  },
);

/** Threshold above which a pointerdown→pointerup pair counts as a long-press
 *  (hide) rather than a click (toggle size). */
const LONG_PRESS_MS = 500;

/** Edge of the inner canvas in px for the compact baseline. The large
 *  state applies a CSS ``scale`` transform — the DOM box stays at this
 *  size so the chat composer's layout never shifts when the user
 *  clicks to enlarge. */
const BASE_PX = 80;
/** Visual scale on the ``large`` state — the chibi visually grows
 *  from 80 → 160 px without affecting the surrounding flex. */
const LARGE_SCALE = 2.0;

/**
 * Persistent chibi mascot pinned next to the controls button in the
 * chat composer. Reads ``useMood()`` so it cycles through the seven-
 * state grammar (idle / listening / thinking / searching / typing /
 * happy / confused).
 *
 * Two gestures:
 *  - **Click / tap** toggles a ``scale`` transform between 1× and 2×,
 *    pivot-anchored to the bottom-left so the tile grows upward into
 *    the chat area without shifting the textarea or the scroll mask.
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
      // ``scale`` instead of width/height: the DOM box keeps the
      // ``BASE_PX`` footprint while the chibi grows visually upward
      // and rightward. Pivot at bottom-left so the baseline stays
      // glued to the composer's bottom edge.
      animate={{ scale: large ? LARGE_SCALE : 1 }}
      transition={{ type: "spring", stiffness: 180, damping: 20, mass: 1.1 }}
      style={{
        width: BASE_PX,
        height: BASE_PX,
        transformOrigin: "bottom left",
      }}
      className="border-border bg-card relative z-30 flex shrink-0 items-center justify-center rounded-xl border-2 p-1 shadow-[3px_3px_0_0_var(--border)] hover:shadow-[4px_4px_0_0_var(--border)]"
    >
      <Axolotl3D mood={mood} size={BASE_PX - 8} className="!h-full !w-full" />
    </motion.button>
  );
}
