"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import ClickSpark from "@/components/reactbits/click-spark";

/**
 * Wraps the entire app so any click fires a lime burst. The spark layer is
 * pointer-events-none already (a canvas sibling), so interactive widgets under
 * the cursor stay clickable.
 */
export function GlobalClickSpark({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Until we know the theme, render children without sparks to avoid a
  // flash of wrong-colour spark on first paint.
  if (!mounted) return <>{children}</>;

  const sparkColor = resolvedTheme === "dark" ? "#baff39" : "#171512";

  return (
    // Ensure ClickSpark's ``h-full w-full`` wrapper actually has a height so
    // its canvas sizes to the viewport and clicks anywhere fire sparks.
    <div className="min-h-dvh">
      <ClickSpark
        sparkColor={sparkColor}
        sparkCount={10}
        sparkRadius={18}
        sparkSize={8}
        duration={420}
        extraScale={1.1}
      >
        {children}
      </ClickSpark>
    </div>
  );
}
