"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Command } from "cmdk";
import {
  Keyboard,
  LogOut,
  MessageCircle,
  MessageSquarePlus,
  Palette,
  Settings,
  Settings2,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import { useApi } from "@/hooks/use-api";
import { cn } from "@/lib/utils";
import type { SessionPublic } from "@/types/api";

/**
 * Cmd+K command palette. Thin cmdk surface rendered in a Radix Dialog
 * styled to the pixel-neubru DA (2px ink borders, lime active row, no
 * backdrop blur). See DESIGN.md §5.
 */
export function CommandPalette({
  open,
  onOpenChange,
  onOpenShortcuts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenShortcuts: () => void;
}) {
  const router = useRouter();
  const api = useApi();
  const qc = useQueryClient();
  const { setTheme, theme } = useTheme();

  const sessionsQuery = useQuery({
    queryKey: ["sessions"],
    queryFn: () => api<SessionPublic[]>("/v1/sessions"),
    enabled: open,
  });

  const createSession = useMutation({
    mutationFn: () =>
      api<SessionPublic>("/v1/sessions", {
        method: "POST",
        body: { title: "New conversation" },
      }),
    onSuccess: (s) => {
      qc.invalidateQueries({ queryKey: ["sessions"] });
      onOpenChange(false);
      router.push(`/chat/${s.id}`);
    },
    onError: () => toast.error("Could not create a session"),
  });

  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  const cycleTheme = () => {
    const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    setTheme(next);
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/55 data-[state=open]:animate-[axo-fade-in_200ms_ease-out] data-[state=closed]:animate-[axo-fade-out_180ms_ease-in]" />
        <Dialog.Content
          aria-describedby={undefined}
          className={cn(
            // Shift right by half the sidebar width on desktop so the palette
            // sits in the optical centre of the main column, not the viewport.
            "fixed left-1/2 md:left-[calc(50%+8rem)] top-[22%] z-50 -translate-x-1/2",
            "w-[min(92vw,34rem)]",
            "overflow-hidden border-2 border-border bg-card rounded-xl",
            "shadow-[4px_4px_0_0_var(--border)]",
            "focus:outline-none",
            "data-[state=open]:animate-[axo-fade-in_200ms_ease-out]",
            "data-[state=closed]:animate-[axo-fade-out_180ms_ease-in]",
          )}
        >
          <Dialog.Title className="sr-only">Command palette</Dialog.Title>
          <Command
            loop
            filter={(value, search) => {
              if (!search) return 1;
              return value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
            }}
          >
            <Command.Input
              placeholder="Search sessions or run a command…"
              className="h-11 w-full border-b-2 border-border bg-card px-4 text-sm outline-none placeholder:text-muted-foreground"
            />
            <Command.List className="max-h-[60vh] overflow-y-auto py-1">
              <Command.Empty className="px-4 py-6 text-center font-pixel text-[11px] uppercase tracking-wider text-muted-foreground">
                No match
              </Command.Empty>

              <Command.Group
                heading="Actions"
                className="[&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:font-pixel [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.14em] [&_[cmdk-group-heading]]:text-muted-foreground"
              >
                <PaletteItem
                  icon={MessageSquarePlus}
                  label="New conversation"
                  shortcut="⌘N"
                  onSelect={() => createSession.mutate()}
                />
                <PaletteItem
                  icon={Palette}
                  label={`Toggle theme · ${theme ?? "system"}`}
                  onSelect={cycleTheme}
                />
                <PaletteItem
                  icon={Settings}
                  label="Open settings"
                  onSelect={() => go("/settings")}
                />
                <PaletteItem
                  icon={Settings2}
                  label="Open tools"
                  onSelect={() => go("/settings/tools")}
                />
                <PaletteItem
                  icon={Keyboard}
                  label="Keyboard shortcuts"
                  shortcut="?"
                  onSelect={() => {
                    onOpenChange(false);
                    onOpenShortcuts();
                  }}
                />
                <PaletteItem
                  icon={LogOut}
                  label="Sign out"
                  onSelect={() => signOut({ callbackUrl: "/login" })}
                />
              </Command.Group>

              {sessionsQuery.data && sessionsQuery.data.length > 0 && (
                <Command.Group
                  heading="Sessions"
                  className="[&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:font-pixel [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.14em] [&_[cmdk-group-heading]]:text-muted-foreground"
                >
                  {sessionsQuery.data.map((s) => (
                    <PaletteItem
                      key={s.id}
                      icon={MessageCircle}
                      label={s.title}
                      onSelect={() => go(`/chat/${s.id}`)}
                      value={`session-${s.id}-${s.title}`}
                    />
                  ))}
                </Command.Group>
              )}
            </Command.List>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function PaletteItem({
  icon: Icon,
  label,
  shortcut,
  onSelect,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  shortcut?: string;
  onSelect: () => void;
  value?: string;
}) {
  return (
    <Command.Item
      value={value ?? label}
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm outline-none data-[selected=true]:bg-[color:var(--lime)] data-[selected=true]:text-[color:var(--lime-foreground)]"
    >
      <Icon className="size-4 shrink-0" />
      <span className="flex-1 truncate">{label}</span>
      {shortcut && (
        <span className="font-pixel text-[10px] uppercase tracking-widest text-muted-foreground group-data-[selected=true]:text-[color:var(--lime-foreground)]/80">
          {shortcut}
        </span>
      )}
    </Command.Item>
  );
}
