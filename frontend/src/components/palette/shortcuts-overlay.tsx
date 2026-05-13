"use client";

import { Modal } from "@/components/ui/modal";

type Shortcut = { keys: string[]; label: string };

const GROUPS: { name: string; items: Shortcut[] }[] = [
  {
    name: "Global",
    items: [
      { keys: ["⌘", "K"], label: "Open command palette" },
      { keys: ["/"], label: "Focus conversation filter" },
      { keys: ["?"], label: "Show this overlay" },
      { keys: ["Esc"], label: "Close / cancel" },
    ],
  },
  {
    name: "Chat",
    items: [
      { keys: ["Enter"], label: "Send message" },
      { keys: ["⇧", "Enter"], label: "New line" },
      { keys: ["⌘", ","], label: "Toggle chat controls (tools + model)" },
    ],
  },
  {
    name: "Palette",
    items: [
      { keys: ["↑", "↓"], label: "Navigate items" },
      { keys: ["Enter"], label: "Run action / open session" },
    ],
  },
];

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span className="border-border bg-background font-pixel inline-flex min-w-[1.4rem] items-center justify-center border-2 px-1.5 py-0.5 text-[11px] tracking-wider uppercase">
      {children}
    </span>
  );
}

export function ShortcutsOverlay({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Keyboard *shortcuts*">
      <div className="space-y-5">
        {GROUPS.map((g) => (
          <div key={g.name}>
            <h3 className="font-pixel text-muted-foreground mb-2 text-[10px] tracking-[0.14em] uppercase">
              {g.name}
            </h3>
            <ul className="space-y-2">
              {g.items.map((s) => (
                <li key={s.label} className="flex items-center justify-between gap-4">
                  <span className="text-sm">{s.label}</span>
                  <span className="inline-flex items-center gap-1">
                    {s.keys.map((k, i) => (
                      <Kbd key={i}>{k}</Kbd>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Modal>
  );
}
