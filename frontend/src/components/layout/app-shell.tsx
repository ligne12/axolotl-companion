"use client";

import { Menu, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { LotusLogo } from "@/components/layout/lotus-logo";
import { TerminalBar } from "@/components/layout/terminal-bar";
import { KeyboardShortcutsProvider } from "@/components/providers/keyboard-shortcuts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Fully hidden by default — a separate 4 px lime strip on the
// viewport's left edge provides the hover affordance.
const SIDEBAR_COLLAPSED_PX = 0;
const SIDEBAR_EXPANDED_PX = 256;
/** Width of the lime hover-trigger strip when the sidebar is hidden. */
const HOVER_TRIGGER_PX = 8;

/**
 * Match-media listener exposed as a React state. Server-renders to
 * ``false`` so the desktop hover-expand chrome doesn't ship to mobile
 * via SSR; the first effect tick updates it once the browser knows
 * the viewport width.
 */
function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isDesktop;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const pathname = usePathname();
  const desktop = useIsDesktop();
  const reduceMotion = useReducedMotion();

  // close the mobile drawer whenever the route changes
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Desktop: width swings 28 ↔ 256 on hover; mobile: width fixed at
  // 256 and the wrapper slides off-screen when the drawer is closed.
  const sidebarWidth = desktop
    ? hovered
      ? SIDEBAR_EXPANDED_PX
      : SIDEBAR_COLLAPSED_PX
    : SIDEBAR_EXPANDED_PX;
  const sidebarX = desktop ? 0 : drawerOpen ? 0 : -SIDEBAR_EXPANDED_PX;
  // Slight overshoot when expanding, no bounce when ``prefers-reduced-motion``.
  const transition = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 280, damping: 22, mass: 0.6 };

  return (
    <KeyboardShortcutsProvider>
      <div className="relative flex h-dvh w-screen overflow-hidden">
        {/* Mobile backdrop */}
        {!desktop && drawerOpen && (
          <button
            type="button"
            aria-label="Close menu"
            className="bg-background/60 fixed inset-0 z-30 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
        )}

        {/* Sidebar wrapper — single rendered tree, animated width/x.
            Floats above the main content on desktop so the chat
            doesn't reflow when the panel slides in / out. */}
        <motion.div
          className={cn("fixed inset-y-0 left-0 z-40 h-dvh overflow-hidden md:absolute")}
          animate={{ width: sidebarWidth, x: sidebarX }}
          initial={false}
          transition={transition}
          onMouseEnter={() => desktop && setHovered(true)}
          onMouseLeave={() => desktop && setHovered(false)}
        >
          <div className="h-full w-64">
            <AppSidebar />
          </div>
        </motion.div>

        {/* Hover-trigger strip — only desktop, only when the sidebar
            is collapsed. A faint lime band on the leftmost edge that
            grows the cursor's hover target wide enough to mouse into
            comfortably without showing visible UI when not needed. */}
        {desktop && !hovered && (
          <div
            aria-hidden
            onMouseEnter={() => setHovered(true)}
            className="absolute inset-y-0 left-0 z-30 hidden md:block"
            style={{
              width: HOVER_TRIGGER_PX,
              background:
                "linear-gradient(to right, color-mix(in srgb, var(--lime) 55%, transparent) 0%, transparent 100%)",
            }}
          />
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile top bar with hamburger */}
          <div className="border-border bg-background flex items-center justify-between border-b-2 px-3 py-2 md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDrawerOpen((v) => !v)}
              aria-label={drawerOpen ? "Close menu" : "Open menu"}
            >
              {drawerOpen ? <X /> : <Menu />}
            </Button>
            <span className="font-display inline-flex items-center gap-1.5 text-sm font-bold">
              <LotusLogo className="size-5" />
              Axolotl
            </span>
            <span className="w-9" /> {/* spacer for symmetry */}
          </div>

          <main className="flex-1 overflow-hidden">{children}</main>
          <TerminalBar />
        </div>
      </div>
    </KeyboardShortcutsProvider>
  );
}
