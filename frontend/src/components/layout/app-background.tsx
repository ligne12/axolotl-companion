"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import PixelBlast from "@/components/reactbits/pixel-blast";

/**
 * Global ambient background. Sits behind every route via a fixed full-screen
 * canvas. Kept on very low intensity + low density so it's decorative texture
 * only — the eye should read it as "paper grain", not as a focal point.
 */
export function AppBackground() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const isDark = resolvedTheme === "dark";
  // Lime on dark, near-black ink on cream — always low brightness.
  const color = isDark ? "#baff39" : "#171512";

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 opacity-[0.18] dark:opacity-[0.28]"
    >
      <PixelBlast
        color={color}
        pixelSize={6}
        patternScale={3.5}
        patternDensity={1.0}
        pixelSizeJitter={0.4}
        speed={0.45}
        edgeFade={0.24}
        transparent
        antialias={false}
        liquid={false}
      />
    </div>
  );
}
