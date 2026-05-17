"use client";

import { Menu, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { LotusLogo } from "@/components/layout/lotus-logo";
import { SidebarRail } from "@/components/layout/sidebar-rail";
import { TerminalBar } from "@/components/layout/terminal-bar";
import { KeyboardShortcutsProvider } from "@/components/providers/keyboard-shortcuts";
import { Button } from "@/components/ui/button";

const SIDEBAR_PANEL_PX = 256;

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
  const [panelOpen, setPanelOpen] = useState(false);
  const pathname = usePathname();
  const desktop = useIsDesktop();
  const reduceMotion = useReducedMotion();

  // close the mobile drawer + desktop panel whenever the route changes
  useEffect(() => {
    setDrawerOpen(false);
    setPanelOpen(false);
  }, [pathname]);

  // The rail's Search icon (and any future call site) dispatch this
  // event to toggle the panel — click-driven, no hover involvement.
  useEffect(() => {
    if (!desktop) return;
    const onToggle = () => setPanelOpen((v) => !v);
    window.addEventListener("sidebar:toggle", onToggle);
    return () => window.removeEventListener("sidebar:toggle", onToggle);
  }, [desktop]);

  // Slight overshoot on the slide-in, no spring when prefers-reduced-motion.
  const transition = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 280, damping: 24, mass: 0.6 };

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

        {/* Desktop : 56 px rail always visible. Click on the rail's
            search icon toggles the full panel; no hover trigger. */}
        {desktop && <SidebarRail />}

        {/* Mobile drawer — full 256 px sidebar slides in via translateX. */}
        {!desktop && (
          <motion.div
            className="fixed inset-y-0 left-0 z-40 h-dvh overflow-hidden"
            animate={{ x: drawerOpen ? 0 : -SIDEBAR_PANEL_PX }}
            initial={false}
            transition={transition}
          >
            <div className="h-full w-64">
              <AppSidebar />
            </div>
          </motion.div>
        )}

        {/* Desktop click-to-open overlay : the full ``AppSidebar``
            slides in from the rail's left edge. A transparent backdrop
            catches clicks outside the panel and closes it. */}
        <AnimatePresence>
          {desktop && panelOpen && (
            <>
              <button
                type="button"
                aria-label="Close sidebar"
                onClick={() => setPanelOpen(false)}
                className="absolute inset-0 z-30 cursor-default bg-transparent"
              />
              <motion.div
                key="sidebar-overlay"
                className="absolute inset-y-0 left-0 z-40 h-dvh overflow-hidden"
                initial={{ x: -SIDEBAR_PANEL_PX }}
                animate={{ x: 0 }}
                exit={{ x: -SIDEBAR_PANEL_PX }}
                transition={transition}
              >
                <div className="h-full w-64">
                  <AppSidebar />
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

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
