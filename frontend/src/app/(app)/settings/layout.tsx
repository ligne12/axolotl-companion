"use client";

import {
  Brain,
  Construction,
  FlaskConical,
  IdCard,
  Plug,
  SlidersHorizontal,
  User as UserIcon,
  Wrench,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

type Tab = {
  href: string;
  /** Translation key under ``settings.tabs.*``. */
  key:
    | "profile"
    | "personas"
    | "tools"
    | "mcp"
    | "model"
    | "reasoning"
    | "sandbox";
  Icon: React.ComponentType<{ className?: string }>;
  soon?: boolean;
};

const TABS: Tab[] = [
  { href: "/settings", key: "profile", Icon: UserIcon },
  { href: "/settings/personas", key: "personas", Icon: IdCard },
  { href: "/settings/tools", key: "tools", Icon: Wrench },
  { href: "/settings/mcp", key: "mcp", Icon: Plug },
  { href: "/settings/model", key: "model", Icon: SlidersHorizontal },
  { href: "/settings/reasoning", key: "reasoning", Icon: Brain },
  { href: "/settings/sandbox", key: "sandbox", Icon: FlaskConical },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useTranslations("settings");
  return (
    <div className="h-full overflow-x-hidden overflow-y-auto">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 md:flex-row md:gap-8 md:py-14">
        {/* Sidebar tabs */}
        <aside className="md:w-52 md:shrink-0">
          <div className="inline-flex w-fit items-center gap-2 border-2 border-border bg-card px-2.5 py-1 font-pixel text-[11px] uppercase tracking-[0.14em] md:text-[12px]">
            <span className="size-2 bg-[color:var(--lime)]" />
            {t("tag")}
          </div>
          <nav
            className={cn(
              "mt-4 flex flex-row gap-1.5 overflow-x-auto md:flex-col md:gap-2 md:overflow-visible",
              // Fade out the right edge on mobile so the user *sees* there's
              // more to scroll. No visual change once at the end.
              "[mask-image:linear-gradient(to_right,black_calc(100%-24px),transparent)] md:[mask-image:none]",
              // Hide native scrollbar (mobile only).
              "[-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden [scrollbar-width:none] md:[scrollbar-width:auto]",
            )}
          >
            {TABS.map((tab) => {
              const isActive = pathname === tab.href;
              const Icon = tab.Icon;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    "group flex min-h-11 items-center gap-2 whitespace-nowrap rounded-md border-2 px-3 py-2 text-sm transition-[transform,box-shadow] duration-100 active:scale-[0.97] md:min-h-0 md:px-3 md:py-2",
                    isActive
                      ? "border-border bg-card shadow-[2px_2px_0_0_var(--lime)]"
                      : "border-transparent hover:border-border/40 hover:bg-card/60",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="flex-1">{t(`tabs.${tab.key}`)}</span>
                  {tab.soon && (
                    <Construction
                      className="size-3.5 shrink-0 text-muted-foreground"
                      aria-label="Coming soon"
                    />
                  )}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Content */}
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
