"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Home,
  LogOut,
  MessageSquarePlus,
  Monitor,
  Moon,
  Search,
  Settings,
  Sun,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { LotusLogo } from "@/components/layout/lotus-logo";
import { useApi } from "@/hooks/use-api";
import { setLocale } from "@/i18n/actions";
import type { Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";
import type { SessionPublic } from "@/types/api";

/** A single 40 px square icon button used by the rail. */
function RailButton({
  onClick,
  active,
  label,
  children,
}: {
  onClick?: () => void;
  active?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-10 items-center justify-center rounded-md border-2 transition-colors",
        active
          ? "border-border bg-card shadow-[2px_2px_0_0_var(--lime)]"
          : "text-muted-foreground hover:text-foreground hover:border-border/40 hover:bg-card/60 border-transparent",
      )}
    >
      {children}
    </button>
  );
}

function RailLink({
  href,
  active,
  label,
  children,
}: {
  href: string;
  active: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-10 items-center justify-center rounded-md border-2 transition-colors",
        active
          ? "border-border bg-card shadow-[2px_2px_0_0_var(--lime)]"
          : "text-muted-foreground hover:text-foreground hover:border-border/40 hover:bg-card/60 border-transparent",
      )}
    >
      {children}
    </Link>
  );
}

const THEME_CYCLE = ["light", "system", "dark"] as const;
const THEME_ICON: Record<(typeof THEME_CYCLE)[number], typeof Sun> = {
  light: Sun,
  system: Monitor,
  dark: Moon,
};

/** Always-visible 56 px icon column. Logo at top, primary actions in the
 *  middle, theme / locale / logout at the bottom. Hovering anywhere over
 *  the rail (or its parent shell) reveals the full sidebar overlay
 *  managed by ``AppShell``. */
export function SidebarRail() {
  const api = useApi();
  const qc = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const currentLocale = useLocale() as Locale;
  const { theme, setTheme } = useTheme();
  const [pendingLocale, startLocaleTransition] = useTransition();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const createSession = useMutation({
    mutationFn: () =>
      api<SessionPublic>("/v1/sessions", {
        method: "POST",
        body: { title: t("newConversation") },
      }),
    onSuccess: (session) => {
      qc.invalidateQueries({ queryKey: ["sessions"] });
      router.push(`/chat/${session.id}`);
    },
    onError: () => toast.error(t("session.errCreate")),
  });

  // Theme cycle: light → system → dark → light. Hides on SSR until
  // ``mounted`` because ``useTheme`` reads from the document attribute.
  const currentTheme = (theme ?? "system") as (typeof THEME_CYCLE)[number];
  const ThemeIcon = THEME_ICON[currentTheme] ?? Monitor;
  const cycleTheme = () => {
    const idx = THEME_CYCLE.indexOf(currentTheme);
    const next = THEME_CYCLE[(idx + 1) % THEME_CYCLE.length] ?? "system";
    setTheme(next);
  };

  const otherLocale: Locale = currentLocale === "fr" ? "en" : "fr";
  const toggleLocale = () => {
    startLocaleTransition(() => setLocale(otherLocale));
  };

  return (
    <aside className="border-border bg-background flex h-dvh w-14 shrink-0 flex-col items-center gap-2 border-r-2 py-3">
      <Link
        href="/home"
        aria-label={t("home")}
        title={t("home")}
        className="border-border bg-card inline-flex size-10 items-center justify-center rounded-md border-2 shadow-[2px_2px_0_0_var(--border)]"
      >
        <LotusLogo className="size-6" />
      </Link>

      <div className="bg-border/40 h-px w-8" aria-hidden />

      <RailButton onClick={() => createSession.mutate()} label={t("newChat")}>
        <MessageSquarePlus className="size-4" />
      </RailButton>
      <RailButton
        onClick={() => {
          // Click-driven toggle of the full sidebar overlay (managed
          // by ``AppShell``). Pressing the icon again while the panel
          // is open closes it.
          window.dispatchEvent(new CustomEvent("sidebar:toggle"));
        }}
        label={t("filterLabel")}
      >
        <Search className="size-4" />
      </RailButton>

      <div className="bg-border/40 h-px w-8" aria-hidden />

      <RailLink href="/home" active={pathname === "/home"} label={t("home")}>
        <Home className="size-4" />
      </RailLink>
      <RailLink href="/settings" active={pathname.startsWith("/settings")} label={t("settings")}>
        <Settings className="size-4" />
      </RailLink>

      <div className="mt-auto flex flex-col items-center gap-2">
        {mounted && (
          <RailButton onClick={cycleTheme} label={`Theme · ${currentTheme}`}>
            <ThemeIcon className="size-4" />
          </RailButton>
        )}
        <button
          type="button"
          onClick={toggleLocale}
          disabled={pendingLocale}
          aria-label={tc("language")}
          title={tc("language")}
          className="font-pixel border-border bg-card text-foreground inline-flex size-10 items-center justify-center rounded-md border-2 text-[10px] tracking-[0.14em] uppercase disabled:opacity-60"
        >
          {currentLocale === "fr" ? "FR" : "EN"}
        </button>
        <RailButton onClick={() => signOut({ callbackUrl: "/login" })} label={t("signOut")}>
          <LogOut className="size-4" />
        </RailButton>
      </div>
    </aside>
  );
}

export type { Locale };
