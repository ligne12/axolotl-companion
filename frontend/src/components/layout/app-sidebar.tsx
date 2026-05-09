"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Home, LogOut, MessageSquarePlus, Pencil, Search, Settings, Trash2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { LocaleSwitcher } from "@/components/layout/locale-switcher";
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
          ? "border-2 border-border bg-card text-foreground shadow-[2px_2px_0_0_var(--lime)]"
          : "border-2 border-transparent hover:border-border/40 hover:bg-card/60",
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
            className="flex-1 min-w-0 rounded-sm border-2 border-border bg-background px-1 text-sm outline-none focus:shadow-[2px_2px_0_0_var(--lime)]"
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
            className="opacity-0 transition group-hover:opacity-100 hover:text-foreground"
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
            className="opacity-0 transition group-hover:opacity-100 hover:text-destructive"
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

export function AppSidebar() {
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
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
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
    <aside className="flex h-dvh w-64 flex-col border-r-2 border-border bg-background">
      <Link
        href="/home"
        className="flex items-center gap-2 border-b-2 border-border px-4 py-3 transition hover:bg-card"
      >
        <span aria-hidden className="text-xl">🪷</span>
        <span className="font-display text-lg font-bold">Axolotl</span>
      </Link>

      <div className="p-3">
        <button
          type="button"
          onClick={() => createSession.mutate()}
          disabled={createSession.isPending}
          className={cn(
            "flex w-full items-center justify-center gap-2 border-2 border-border bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground",
            "shadow-[3px_3px_0_0_var(--lime)] transition-[transform,box-shadow] duration-100",
            "hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_0_var(--lime)]",
            "active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_0_var(--lime)]",
            "disabled:cursor-not-allowed disabled:opacity-60",
          )}
        >
          <MessageSquarePlus className="size-4" /> {t("newChat")}
        </button>
      </div>

      {/* Filter input */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={filterRef}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={t("filterPlaceholder")}
            className="h-8 w-full border-2 border-border bg-card pl-7 pr-8 text-[13px] outline-none transition-[box-shadow] duration-100 focus:shadow-[3px_3px_0_0_var(--lime)] placeholder:text-muted-foreground"
            aria-label={t("filterLabel")}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 border border-border/40 bg-background px-1 py-0.5 font-pixel text-[9px] uppercase tracking-widest text-muted-foreground"
          >
            /
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3">
        {(() => {
          const all = sessionsQuery.data ?? [];
          const q = filter.trim().toLowerCase();
          const filtered = q
            ? all.filter((s) => s.title.toLowerCase().includes(q))
            : all;
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
                <p className="px-2 py-3 text-xs text-muted-foreground">
                  {t("noConversations")}
                </p>
              )}
              {q && filtered.length === 0 && all.length > 0 && (
                <p className="px-2 py-3 font-pixel text-[11px] uppercase tracking-wider text-muted-foreground">
                  {t("noMatch", { query: filter })}
                </p>
              )}
              {q && filtered.length > 0 && (
                <p className="px-2 pb-3 font-mono text-[10px] tabular-nums text-muted-foreground">
                  {filtered.length} / {all.length}
                </p>
              )}
            </>
          );
        })()}
      </div>

      <div className="space-y-1 border-t-2 border-border p-3">
        <Link
          href="/home"
          className={cn(
            "flex items-center gap-2 rounded-md border-2 px-2 py-1.5 text-sm transition-colors",
            pathname === "/home"
              ? "border-border bg-card shadow-[2px_2px_0_0_var(--lime)]"
              : "border-transparent hover:border-border/40 hover:bg-card/60",
          )}
        >
          <Home className="size-4" /> {t("home")}
        </Link>
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-2 rounded-md border-2 px-2 py-1.5 text-sm transition-colors",
            pathname.startsWith("/settings")
              ? "border-border bg-card shadow-[2px_2px_0_0_var(--lime)]"
              : "border-transparent hover:border-border/40 hover:bg-card/60",
          )}
        >
          <Settings className="size-4" /> {t("settings")}
        </Link>
        <div className="flex items-center justify-between gap-2 px-2 py-1.5 text-sm">
          <ThemeToggle />
          <LocaleSwitcher />
        </div>
        <div className="flex items-center justify-between px-2 py-1.5 text-sm">
          <span className="truncate text-muted-foreground">{user?.user?.name}</span>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-muted-foreground transition hover:text-foreground"
            aria-label={t("signOut")}
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
