"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Home, LogOut, MessageSquarePlus, Pencil, Settings2, Trash2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

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
  onDelete: (id: number) => void;
  onRename: (id: number, title: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(session.title);
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
            aria-label="Save"
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
            aria-label="Cancel"
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
            aria-label="Rename"
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
            aria-label="Delete"
            className="opacity-0 transition group-hover:opacity-100 hover:text-destructive"
            onClick={(e) => {
              e.preventDefault();
              if (confirm("Delete this conversation?")) onDelete(session.id);
            }}
          >
            <Trash2 className="size-3.5" />
          </button>
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
        body: { title: "New conversation" },
      }),
    onSuccess: (session) => {
      qc.invalidateQueries({ queryKey: ["sessions"] });
      router.push(`/chat/${session.id}`);
    },
    onError: () => toast.error("Could not create a session"),
  });

  const deleteSession = useMutation({
    mutationFn: (id: number) => api<void>(`/v1/sessions/${id}`, { method: "DELETE" }),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ["sessions"] });
      if (pathname === `/chat/${id}`) router.push("/chat");
    },
  });

  const renameSession = useMutation({
    mutationFn: ({ id, title }: { id: number; title: string }) =>
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
      toast.error("Could not rename");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["sessions"] }),
  });

  return (
    <aside className="flex h-dvh w-64 flex-col border-r-2 border-border bg-background">
      <Link
        href="/home"
        className="flex items-center gap-2 border-b-2 border-border px-4 py-3 transition hover:bg-[color:var(--pastel-butter)]/40"
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
          <MessageSquarePlus className="size-4" /> New chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3">
        <ul className="space-y-1 pb-3">
          <AnimatePresence initial={false}>
            {sessionsQuery.data?.map((s, i) => (
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
          {sessionsQuery.data?.length === 0 && (
            <p className="px-2 py-3 text-xs text-muted-foreground">
              No conversations yet.
            </p>
          )}
        </ul>
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
          <Home className="size-4" /> Home
        </Link>
        <Link
          href="/tools"
          className={cn(
            "flex items-center gap-2 rounded-md border-2 px-2 py-1.5 text-sm transition-colors",
            pathname === "/tools"
              ? "border-border bg-card shadow-[2px_2px_0_0_var(--lime)]"
              : "border-transparent hover:border-border/40 hover:bg-card/60",
          )}
        >
          <Settings2 className="size-4" /> Tools
        </Link>
        <div className="flex items-center justify-between px-2 py-1.5 text-sm">
          <span className="truncate text-muted-foreground">{user?.user?.name}</span>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-muted-foreground transition hover:text-foreground"
            aria-label="Sign out"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
