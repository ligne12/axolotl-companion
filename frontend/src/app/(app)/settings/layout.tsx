"use client";

import { Construction, User as UserIcon, Settings2, SlidersHorizontal, Brain } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

type Tab = {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  soon?: boolean;
};

const TABS: Tab[] = [
  { href: "/settings", label: "Profile", Icon: UserIcon },
  { href: "/settings/personas", label: "Personas", Icon: Settings2, soon: true },
  { href: "/settings/model", label: "Model", Icon: SlidersHorizontal, soon: true },
  { href: "/settings/reasoning", label: "Reasoning", Icon: Brain, soon: true },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10 md:flex-row md:py-14">
        {/* Sidebar tabs */}
        <aside className="md:w-52 md:shrink-0">
          <div className="inline-flex w-fit items-center gap-2 border-2 border-border bg-card px-2.5 py-1 font-pixel text-[12px] uppercase tracking-[0.14em]">
            <span className="size-2 bg-[color:var(--lime)]" />
            Settings
          </div>
          <nav className="mt-4 flex flex-row gap-2 overflow-x-auto md:flex-col md:overflow-visible">
            {TABS.map((t) => {
              const isActive = pathname === t.href;
              const Icon = t.Icon;
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={cn(
                    "group flex items-center gap-2 whitespace-nowrap rounded-md border-2 px-3 py-2 text-sm transition-[transform,box-shadow] duration-100",
                    isActive
                      ? "border-border bg-card shadow-[2px_2px_0_0_var(--lime)]"
                      : "border-transparent hover:border-border/40 hover:bg-card/60",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="flex-1">{t.label}</span>
                  {t.soon && (
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
