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

/** Compact and expanded edge sizes in px for the Three.js canvas. We
 *  drive width/height (not ``scale``) so the GLB re-renders crisp at
 *  every size instead of stretching pixels. ``MOBILE_PX`` is the
 *  always-on size below the ``md`` breakpoint so the chibi never
 *  blows past the composer's row on small screens. */
const MOBILE_PX = 56;
const SMALL_PX = 80;
const LARGE_PX = 160;

/**
 * Chibi mascot pinned next to the controls button. Reads ``useMood()``
 * so it cycles through the seven-state grammar (idle / listening /
 * thinking / searching / typing / happy / confused).
 *
 * Two gestures :
 *  - **Click / tap** toggles ``mascotLarge`` on the chat-status store
 *    so other surfaces (``ChatInput``'s textarea row) can shrink to
 *    accommodate the larger chibi without it ever covering the
 *    composer.
 *  - **Long-press** (~500 ms) hides the mascot for the rest of the
 *    browser session.
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

  // On mobile (< md), keep the chibi at its compact size always —
  // the chat composer's row is too tight for the 80 → 160 swing to
  // fit alongside controls + textarea + send.
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

  // Mobile clamps to ``MOBILE_PX``. Desktop honours the
  // ``mascotLarge`` toggle.
  const edge = !isDesktop ? MOBILE_PX : large ? LARGE_PX : SMALL_PX;
  // Outer button = canvas + 8 px padding (2 × 4).
  const tileEdge = edge + 8;

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
      // ``width/height`` instead of ``scale``: the inner Three.js
      // canvas re-renders at the target resolution so the chibi stays
      // crisp at every size. Sibling flex items (controls / textarea
      // / send) automatically shrink because the row's gap eats the
      // extra width — see ``ChatInput`` for the matching ``max-w``
      // adjustment that keeps everything fitting on one line.
      animate={{ width: tileEdge, height: tileEdge }}
      transition={{ type: "spring", stiffness: 220, damping: 22, mass: 0.9 }}
      style={{ transformOrigin: "bottom left" }}
      className="border-border bg-card relative z-30 flex shrink-0 items-center justify-center self-end rounded-xl border-2 p-1 shadow-[3px_3px_0_0_var(--border)] hover:shadow-[4px_4px_0_0_var(--border)]"
    >
      <Axolotl3D mood={mood} size={edge} className="!h-full !w-full" />
    </motion.button>
  );
}
