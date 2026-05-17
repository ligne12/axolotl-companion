"use client";

import { motion } from "motion/react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useMood } from "@/hooks/use-mood";
import { useChatStatus } from "@/stores/chat-status";

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

const LONG_PRESS_MS = 500;

/** Three.js canvas resolution — fixed at the largest size we ever show.
 *  The visible chibi is then scaled down with a CSS transform so the
 *  GPU does the morphing instead of the renderer re-allocating buffers
 *  on every animation frame (which was the source of the visible
 *  stutter during the resize spring). */
const CANVAS_PX = 160;
const MOBILE_PX = 56;
const SMALL_PX = 80;
const LARGE_PX = 160;

/**
 * Chibi mascot pinned next to the controls button.
 *
 * Two gestures :
 *  - **Click / tap** toggles ``mascotLarge`` on the chat-status
 *    store so ``ChatInput`` can shrink the composer row to make
 *    room.
 *  - **Long-press** (~500 ms) hides the mascot for the rest of the
 *    browser session.
 *
 * The DOM box (a ``<motion.button>``) drives the flex layout; the
 * inner Three.js canvas stays a fixed ``CANVAS_PX`` so we never
 * re-allocate WebGL buffers mid-animation. A CSS ``scale``
 * synchronised with the same spring smoothes the visual size.
 */
export function ChatMascot() {
  const mood = useMood();
  const mascotHidden = useChatStatus((s) => s.mascotHidden);
  const setMascotHidden = useChatStatus((s) => s.setMascotHidden);
  const large = useChatStatus((s) => s.mascotLarge);
  const setLarge = useChatStatus((s) => s.setMascotLarge);
  const t = useTranslations("mascot");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressedRef = useRef(false);

  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

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
    setLarge(!large);
  };

  const cancelGesture = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    longPressedRef.current = false;
  };

  const edge = !isDesktop ? MOBILE_PX : large ? LARGE_PX : SMALL_PX;
  // Tile = canvas + 8 px padding (4 each side).
  const tileEdge = edge + 8;
  // CSS scale to fit the fixed-resolution canvas in the current tile.
  const innerScale = edge / CANVAS_PX;
  const spring = { type: "spring" as const, stiffness: 220, damping: 24, mass: 0.9 };

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
      transition={spring}
      className="border-border bg-card relative z-30 flex shrink-0 items-center justify-center self-end overflow-hidden rounded-xl border-2 shadow-[3px_3px_0_0_var(--border)] hover:shadow-[4px_4px_0_0_var(--border)]"
    >
      {/* Inner canvas wrapper. The DOM rect stays ``CANVAS_PX``; only
          the ``scale`` transform animates. Centered inside the tile
          via flex on the parent. */}
      <motion.div
        animate={{ scale: innerScale }}
        transition={spring}
        style={{ width: CANVAS_PX, height: CANVAS_PX, transformOrigin: "center" }}
      >
        <Axolotl3D mood={mood} size={CANVAS_PX} className="!h-full !w-full" />
      </motion.div>
    </motion.button>
  );
}
