"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Home,
  LogOut,
  MessageSquarePlus,
  Pencil,
  Search,
  Settings,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { LotusLogo } from "@/components/layout/lotus-logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useApi } from "@/hooks/use-api";
import { cn } from "@/lib/utils";
import type { SessionPublic } from "@/types/api";

function SessionRow({
  session,
  active,
  onDelete,
  onRename,
}: {
  session: SessionPublic;
  active: boolean;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => Promise<void>;
}) {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(session.title);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    setValue(session.title);
  }, [session.title]);

  async function save() {
    const next = value.trim();
    if (!next || next === session.title) {
      setEditing(false);
      setValue(session.title);
      return;
    }
    await onRename(session.id, next);
    setEditing(false);
  }

  return (
    <li
      className={cn(
        "group flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors",
        active
          ? "border-border bg-card text-foreground border-2 shadow-[2px_2px_0_0_var(--lime)]"
          : "hover:border-border/40 hover:bg-card/60 border-2 border-transparent",
      )}
    >
      {editing ? (
        <>
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void save();
              if (e.key === "Escape") {
                setEditing(false);
                setValue(session.title);
              }
            }}
            onBlur={() => void save()}
            maxLength={200}
            className="border-border bg-background min-w-0 flex-1 rounded-sm border-2 px-1 text-sm outline-none focus:shadow-[2px_2px_0_0_var(--lime)]"
          />
          <button
            type="button"
            aria-label={tc("save")}
            className="text-muted-foreground hover:text-foreground"
            onMouseDown={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <Check className="size-3.5" />
          </button>
          <button
            type="button"
            aria-label={tc("cancel")}
            className="text-muted-foreground hover:text-destructive"
            onMouseDown={(e) => {
              e.preventDefault();
              setEditing(false);
              setValue(session.title);
            }}
          >
            <X className="size-3.5" />
          </button>
        </>
      ) : (
        <>
          <Link
            href={`/chat/${session.id}`}
            className="flex-1 truncate"
            title={session.title}
            onDoubleClick={(e) => {
              e.preventDefault();
              setEditing(true);
            }}
          >
            {session.title}
          </Link>
          <button
            type="button"
            aria-label={tc("rename")}
            className="hover:text-foreground opacity-0 transition group-hover:opacity-100"
            onClick={(e) => {
              e.preventDefault();
              setEditing(true);
            }}
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            type="button"
            aria-label={tc("delete")}
            className="hover:text-destructive opacity-0 transition group-hover:opacity-100"
            onClick={(e) => {
              e.preventDefault();
              setConfirmOpen(true);
            }}
          >
            <Trash2 className="size-3.5" />
          </button>
          <ConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            title={t("session.deleteTitle")}
            description={t("session.deleteDescription", { title: session.title })}
            confirmLabel={tc("delete")}
            variant="destructive"
            onConfirm={() => onDelete(session.id)}
          />
        </>
      )}
    </li>
  );
}

/**
 * Single morphing sidebar — same component renders the icon-only rail
 * (when ``collapsed``) and the full panel (when expanded). The outer
 * width animation lives in ``AppShell``; this component swaps content
 * via CSS opacity + a couple of conditional sub-renders so the two
 * states share visual anchors (logo, icons stay in place).
 */
export function AppSidebar({ collapsed = false }: { collapsed?: boolean }) {
  const api = useApi();
  const router = useRouter();
  const pathname = usePathname();
  const qc = useQueryClient();
  const { data: user } = useSession();
  const t = useTranslations("nav");
  const [filter, setFilter] = useState("");
  const filterRef = useRef<HTMLInputElement>(null);

  // Global `/` shortcut to focus the filter (Escape clears+blurs).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (e.key === "/" && !typing) {
        e.preventDefault();
        filterRef.current?.focus();
        filterRef.current?.select();
      }
      if (e.key === "Escape" && target === filterRef.current) {
        setFilter("");
        filterRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const sessionsQuery = useQuery({
    queryKey: ["sessions"],
    queryFn: () => api<SessionPublic[]>("/v1/sessions"),
    enabled: Boolean(user?.accessToken),
    refetchInterval: 10_000, // pick up backend auto-title changes
  });

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

  const deleteSession = useMutation({
    mutationFn: (id: string) => api<void>(`/v1/sessions/${id}`, { method: "DELETE" }),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ["sessions"] });
      if (pathname === `/chat/${id}`) router.push("/chat");
    },
  });

  const renameSession = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      api<SessionPublic>(`/v1/sessions/${id}`, {
        method: "PATCH",
        body: { title },
      }),
    onMutate: async ({ id, title }) => {
      await qc.cancelQueries({ queryKey: ["sessions"] });
      const prev = qc.getQueryData<SessionPublic[]>(["sessions"]);
      qc.setQueryData<SessionPublic[] | undefined>(["sessions"], (old) =>
        old?.map((s) => (s.id === id ? { ...s, title } : s)),
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["sessions"], ctx.prev);
      toast.error(t("session.errRename"));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["sessions"] }),
  });

  return (
    // No ``border-r-2`` here — that's now on the ``<motion.aside>``
    // wrapper in ``AppShell`` so it stays anchored to the visible
    // edge of the sidebar regardless of the collapsed / expanded
    // width animation.
    <aside className="bg-background flex h-dvh w-64 flex-col overflow-hidden">
      <Link
        href="/home"
        className="border-border hover:bg-card flex items-center gap-2 border-b-2 px-4 py-3 transition"
      >
        <LotusLogo className="size-7 shrink-0" />
        <span
          className={cn(
            "font-display text-lg font-bold whitespace-nowrap transition-opacity duration-150",
            collapsed && "opacity-0",
          )}
        >
          Axolotl
        </span>
      </Link>

      <div className={cn("p-3", collapsed && "flex justify-center")}>
        <button
          type="button"
          onClick={() => createSession.mutate()}
          disabled={createSession.isPending}
          aria-label={t("newChat")}
          title={t("newChat")}
          className={cn(
            "border-border bg-primary text-primary-foreground inline-flex items-center justify-center gap-2 border-2 text-sm font-semibold",
            "shadow-[3px_3px_0_0_var(--lime)] transition-[transform,box-shadow] duration-100",
            "hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_0_var(--lime)]",
            "active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_0_var(--lime)]",
            "disabled:cursor-not-allowed disabled:opacity-60",
            // Collapsed: compact 36 px square icon button that fits in
            // the 56 px rail with 10 px of breathing room each side.
            // Expanded: stretches across the panel like before.
            collapsed ? "size-9 shrink-0" : "w-full px-3 py-2",
          )}
        >
          <MessageSquarePlus className="size-4 shrink-0" />
          <span
            className={cn(
              "whitespace-nowrap transition-opacity duration-150",
              collapsed && "hidden",
            )}
          >
            {t("newChat")}
          </span>
        </button>
      </div>

      {/* Filter input (expanded) → search icon button (collapsed).
          Clicking the collapsed icon dispatches ``sidebar:toggle``
          which expands the sidebar; the filter input then takes
          focus on the next render via the existing ``/`` shortcut
          path if the user keeps typing. */}
      {collapsed ? (
        <div className="flex justify-center px-3 pb-2">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("sidebar:toggle"))}
            aria-label={t("filterLabel")}
            title={t("filterLabel")}
            className="border-border bg-card text-muted-foreground hover:text-foreground inline-flex size-9 shrink-0 items-center justify-center border-2 transition-colors"
          >
            <Search className="size-4" />
          </button>
        </div>
      ) : (
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2" />
            <input
              ref={filterRef}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder={t("filterPlaceholder")}
              className="border-border bg-card placeholder:text-muted-foreground h-8 w-full border-2 pr-8 pl-7 text-[13px] transition-[box-shadow] duration-100 outline-none focus:shadow-[3px_3px_0_0_var(--lime)]"
              aria-label={t("filterLabel")}
            />
            <span
              aria-hidden
              className="border-border/40 bg-background font-pixel text-muted-foreground pointer-events-none absolute top-1/2 right-1.5 -translate-y-1/2 border px-1 py-0.5 text-[9px] tracking-widest uppercase"
            >
              /
            </span>
          </div>
        </div>
      )}

      <div
        className={cn(
          "flex-1 overflow-y-auto px-3 transition-opacity duration-150",
          collapsed && "pointer-events-none opacity-0",
        )}
      >
        {(() => {
          const all = sessionsQuery.data ?? [];
          const q = filter.trim().toLowerCase();
          const filtered = q ? all.filter((s) => s.title.toLowerCase().includes(q)) : all;
          return (
            <>
              <ul className="space-y-1 pb-2">
                <AnimatePresence initial={false}>
                  {filtered.map((s, i) => (
                    <motion.div
                      key={s.id}
                      layout
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.18, delay: Math.min(i, 8) * 0.025 }}
                    >
                      <SessionRow
                        session={s}
                        active={pathname === `/chat/${s.id}`}
                        onDelete={(id) => deleteSession.mutate(id)}
                        onRename={async (id, title) => {
                          await renameSession.mutateAsync({ id, title });
                        }}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </ul>
              {all.length === 0 && (
                <p className="text-muted-foreground px-2 py-3 text-xs">{t("noConversations")}</p>
              )}
              {q && filtered.length === 0 && all.length > 0 && (
                <p className="font-pixel text-muted-foreground px-2 py-3 text-[11px] tracking-wider uppercase">
                  {t("noMatch", { query: filter })}
                </p>
              )}
              {q && filtered.length > 0 && (
                <p className="text-muted-foreground px-2 pb-3 font-mono text-[10px] tabular-nums">
                  {filtered.length} / {all.length}
                </p>
              )}
            </>
          );
        })()}
      </div>

      <div
        className={cn(
          "border-border space-y-1 border-t-2 p-3",
          collapsed && "flex flex-col items-center",
        )}
      >
        <Link
          href="/home"
          aria-label={t("home")}
          title={collapsed ? t("home") : undefined}
          className={cn(
            "flex items-center border-2 transition-colors",
            collapsed ? "size-9 justify-center" : "w-full gap-2 rounded-md px-2 py-1.5 text-sm",
            pathname === "/home"
              ? "border-border bg-card shadow-[2px_2px_0_0_var(--lime)]"
              : collapsed
                ? "border-border bg-card hover:bg-card/60"
                : "hover:border-border/40 hover:bg-card/60 border-transparent",
          )}
        >
          <Home className="size-4 shrink-0" />
          <span className={cn("whitespace-nowrap", collapsed && "hidden")}>{t("home")}</span>
        </Link>
        <Link
          href="/settings"
          aria-label={t("settings")}
          title={collapsed ? t("settings") : undefined}
          className={cn(
            "flex items-center border-2 transition-colors",
            collapsed ? "size-9 justify-center" : "w-full gap-2 rounded-md px-2 py-1.5 text-sm",
            pathname.startsWith("/settings")
              ? "border-border bg-card shadow-[2px_2px_0_0_var(--lime)]"
              : collapsed
                ? "border-border bg-card hover:bg-card/60"
                : "hover:border-border/40 hover:bg-card/60 border-transparent",
          )}
        >
          <Settings className="size-4 shrink-0" />
          <span className={cn("whitespace-nowrap", collapsed && "hidden")}>{t("settings")}</span>
        </Link>
        {collapsed ? (
          <>
            <ThemeToggle compact />
            <LocaleSwitcher compact />
          </>
        ) : (
          <div className="flex items-center justify-between gap-2 px-2 py-1.5 text-sm">
            <ThemeToggle />
            <LocaleSwitcher />
          </div>
        )}
        {collapsed ? (
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            aria-label={t("signOut")}
            title={t("signOut")}
            className="border-border bg-card text-muted-foreground hover:text-foreground inline-flex size-9 items-center justify-center border-2 transition-colors"
          >
            <LogOut className="size-4" />
          </button>
        ) : (
          <div className="flex items-center justify-between gap-2 px-2 py-1.5 text-sm">
            <span className="text-muted-foreground truncate whitespace-nowrap">
              {user?.user?.name}
            </span>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-muted-foreground hover:text-foreground shrink-0 transition"
              aria-label={t("signOut")}
            >
              <LogOut className="size-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
