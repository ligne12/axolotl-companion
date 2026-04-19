"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, MessageSquarePlus, Settings2, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useApi } from "@/hooks/use-api";
import { cn } from "@/lib/utils";
import type { SessionPublic } from "@/types/api";

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
    mutationFn: (id: number) =>
      api<void>(`/v1/sessions/${id}`, { method: "DELETE" }),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ["sessions"] });
      if (pathname === `/chat/${id}`) router.push("/chat");
    },
  });

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-muted/30">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <span aria-hidden className="text-xl">
          🪷
        </span>
        <span className="font-semibold">Axolotl</span>
      </div>

      <div className="p-3">
        <Button
          onClick={() => createSession.mutate()}
          disabled={createSession.isPending}
          className="w-full justify-start"
        >
          <MessageSquarePlus /> New chat
        </Button>
      </div>

      <ScrollArea className="flex-1 px-3">
        <ul className="space-y-1 pb-3">
          {sessionsQuery.data?.map((s) => {
            const active = pathname === `/chat/${s.id}`;
            return (
              <li
                key={s.id}
                className={cn(
                  "group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50",
                )}
              >
                <Link
                  href={`/chat/${s.id}`}
                  className="flex-1 truncate"
                  title={s.title}
                >
                  {s.title}
                </Link>
                <button
                  type="button"
                  aria-label="Delete session"
                  className="opacity-0 transition group-hover:opacity-100 hover:text-destructive"
                  onClick={(e) => {
                    e.preventDefault();
                    if (confirm("Delete this conversation?")) {
                      deleteSession.mutate(s.id);
                    }
                  }}
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            );
          })}
          {sessionsQuery.data?.length === 0 && (
            <p className="px-2 py-3 text-xs text-muted-foreground">
              No conversations yet.
            </p>
          )}
        </ul>
      </ScrollArea>

      <div className="space-y-1 border-t p-3">
        <Link
          href="/tools"
          className={cn(
            "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition hover:bg-accent",
            pathname === "/tools" && "bg-accent",
          )}
        >
          <Settings2 className="size-4" /> Tools
        </Link>
        <div className="flex items-center justify-between px-2 py-1.5 text-sm">
          <span className="truncate text-muted-foreground">
            {user?.user?.name}
          </span>
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
