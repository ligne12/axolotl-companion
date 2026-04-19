"use client";

import { useCallback, useEffect, useState } from "react";

import { CommandPalette } from "@/components/palette/command-palette";
import { ShortcutsOverlay } from "@/components/palette/shortcuts-overlay";

/**
 * Mounts the Cmd+K palette and the ``?`` shortcuts overlay, and wires the
 * global key bindings so they open from anywhere in the app.
 *
 *  - ``Cmd/Ctrl+K``: toggle palette
 *  - ``?`` (shift+slash) from outside an input: open shortcuts
 *  - ``Cmd/Ctrl+N``: delegates to palette (it has the New conversation
 *    action; users typing `Cmd+N` expect a new tab — so we only
 *    intercept when the palette would be the natural home)
 *
 * The sidebar's own ``/`` shortcut stays independent.
 */
export function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const openShortcuts = useCallback(() => setShortcutsOpen(true), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      // Cmd/Ctrl+K — toggle palette from anywhere, even while typing
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }

      if (typing) return;

      // ? — show shortcuts overlay
      if (e.key === "?") {
        e.preventDefault();
        setShortcutsOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      {children}
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onOpenShortcuts={openShortcuts}
      />
      <ShortcutsOverlay open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </>
  );
}
