"use client";

import { ChevronLeft, ChevronRight, Menu, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { LotusLogo } from "@/components/layout/lotus-logo";
import { TerminalBar } from "@/components/layout/terminal-bar";
import { KeyboardShortcutsProvider } from "@/components/providers/keyboard-shortcuts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SIDEBAR_COLLAPSED_PX = 56;
const SIDEBAR_EXPANDED_PX = 256;

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
  const [expanded, setExpanded] = useState(false);
  const pathname = usePathname();
  const desktop = useIsDesktop();
  const reduceMotion = useReducedMotion();

  // close the mobile drawer + desktop panel whenever the route changes
  useEffect(() => {
    setDrawerOpen(false);
    setExpanded(false);
  }, [pathname]);

  // Any sub-component (e.g. the Search button inside the sidebar) can
  // dispatch this event to toggle the expanded state — click-driven,
  // no hover involvement.
  useEffect(() => {
    if (!desktop) return;
    const onToggle = () => setExpanded((v) => !v);
    window.addEventListener("sidebar:toggle", onToggle);
    return () => window.removeEventListener("sidebar:toggle", onToggle);
  }, [desktop]);

  const transition = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 280, damping: 28, mass: 0.7 };

  const sidebarWidth = desktop
    ? expanded
      ? SIDEBAR_EXPANDED_PX
      : SIDEBAR_COLLAPSED_PX
    : SIDEBAR_EXPANDED_PX;
  const sidebarX = desktop ? 0 : drawerOpen ? 0 : -SIDEBAR_EXPANDED_PX;

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

        {/* Sidebar — single morphing tree. On desktop the wrapper width
            animates 56 ↔ 256 and ``<AppSidebar>`` re-renders content
            accordingly (icons stay anchored to the left, labels +
            sessions list fade in / out). On mobile the wrapper is
            fixed at 256 and slides off-screen via translateX. */}
        <motion.aside
          className={cn(
            !desktop && "fixed inset-y-0 left-0 z-40",
            // ``border-r-2`` lives on the motion wrapper so the
            // separator stays visible in both width states — placing
            // it on the inner ``<AppSidebar>`` (which is always 256
            // px wide) would clip the border off-screen whenever the
            // wrapper collapsed to 56.
            "border-border bg-background h-dvh shrink-0 overflow-hidden border-r-2",
          )}
          animate={{ width: sidebarWidth, x: sidebarX }}
          initial={false}
          transition={transition}
        >
          <div className="h-full w-64">
            <AppSidebar collapsed={desktop && !expanded} />
          </div>
        </motion.aside>

        {/* Desktop click-away catcher. Only mounted while the sidebar
            is expanded so the main content stays interactive when the
            sidebar is in its collapsed rail mode. */}
        {desktop && expanded && (
          <button
            type="button"
            aria-label="Collapse sidebar"
            onClick={() => setExpanded(false)}
            className="absolute inset-0 z-20 cursor-default bg-transparent"
            style={{ left: SIDEBAR_EXPANDED_PX }}
          />
        )}

        {/* Pixel-neubru toggle handle — square 24×24 tile straddling
            the sidebar's right edge, 2 px ink border with an L-shape
            lime shadow that "pops" the chevron out of the panel. The
            ``left`` animates synced with the sidebar width spring;
            hover bumps the shadow for that pixel-press feel. */}
        {desktop && (
          <motion.button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
            title={expanded ? "Collapse sidebar" : "Expand sidebar"}
            animate={{ left: sidebarWidth - 12 }}
            transition={transition}
            whileHover={{ x: 1, y: -1 }}
            whileTap={{ x: 0, y: 0 }}
            className="border-border bg-card text-foreground absolute top-1/2 z-40 inline-flex size-6 -translate-y-1/2 items-center justify-center border-2 shadow-[3px_3px_0_0_var(--lime)] hover:shadow-[4px_4px_0_0_var(--lime)] active:shadow-[1px_1px_0_0_var(--lime)]"
          >
            {expanded ? (
              <ChevronLeft className="size-3.5" />
            ) : (
              <ChevronRight className="size-3.5" />
            )}
          </motion.button>
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
