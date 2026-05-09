"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  Pencil,
  Plug,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Modal } from "@/components/ui/modal";
import { useApi } from "@/hooks/use-api";
import { useHaptic } from "@/hooks/use-haptic";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import type {
  MCPServerCreate,
  MCPServerPublic,
  MCPServerUpdate,
  MCPSyncResult,
} from "@/types/api";

const INPUT =
  "w-full border-2 border-border bg-card px-3 py-2 text-sm outline-none transition-[box-shadow] duration-100 focus:shadow-[3px_3px_0_0_var(--lime)] placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60";

const LABEL = "block text-xs font-semibold uppercase tracking-wider";

const PRIMARY =
  "inline-flex min-h-11 items-center gap-2 border-2 border-border bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[3px_3px_0_0_var(--lime)] transition-[transform,box-shadow] duration-100 hover:shadow-[4px_4px_0_0_var(--lime)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_0_var(--lime)] disabled:cursor-not-allowed disabled:opacity-60";

type Draft = {
  id: number | null;
  name: string;
  url: string;
  authToken: string;
  // `null` = leave existing token in place on edit; `""` = clear; non-empty = replace
  authTokenDirty: boolean;
};

const blankDraft = (): Draft => ({
  id: null,
  name: "",
  url: "",
  authToken: "",
  authTokenDirty: true,
});

function relativeTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} h ago`;
  return `${Math.floor(diff / 86_400_000)} d ago`;
}

export default function McpPage() {
  const api = useApi();
  const qc = useQueryClient();
  const haptic = useHaptic();

  const servers = useQuery({
    queryKey: ["mcp", "servers"],
    queryFn: () => api<MCPServerPublic[]>("/v1/mcp/servers"),
  });

  const [editor, setEditor] = useState<Draft | null>(null);
  const [pendingDelete, setPendingDelete] = useState<MCPServerPublic | null>(null);

  const createMut = useMutation({
    mutationFn: (body: MCPServerCreate) =>
      api<MCPServerPublic>("/v1/mcp/servers", { method: "POST", body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mcp", "servers"] });
      setEditor(null);
      haptic("success");
      toast.success("MCP server added");
    },
    onError: (err: unknown) => {
      haptic("error");
      const msg =
        err instanceof ApiError && err.status === 409
          ? "Name already used"
          : "Could not add server";
      toast.error(msg);
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: MCPServerUpdate }) =>
      api<MCPServerPublic>(`/v1/mcp/servers/${id}`, { method: "PATCH", body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mcp", "servers"] });
      setEditor(null);
      haptic("success");
      toast.success("Server updated");
    },
    onError: (err: unknown) => {
      haptic("error");
      const msg =
        err instanceof ApiError && err.status === 409
          ? "Name already used"
          : "Could not update";
      toast.error(msg);
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) =>
      api<void>(`/v1/mcp/servers/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mcp", "servers"] });
      qc.invalidateQueries({ queryKey: ["tools"] });
      haptic("success");
      toast.success("Server removed");
    },
    onError: () => {
      haptic("error");
      toast.error("Could not delete");
    },
  });

  const syncMut = useMutation({
    mutationFn: (id: number) =>
      api<MCPSyncResult>(`/v1/mcp/servers/${id}/sync`, { method: "POST" }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["mcp", "servers"] });
      qc.invalidateQueries({ queryKey: ["tools"] });
      haptic("success");
      toast.success(`${data.tools_count} tool${data.tools_count === 1 ? "" : "s"} synced`);
    },
    onError: (err: unknown) => {
      // The backend persists ``last_sync_error`` on the row even when the
      // 502 fires, so refetch the list to flip the card from
      // "never synced" to "sync failed" and surface the reason.
      qc.invalidateQueries({ queryKey: ["mcp", "servers"] });
      haptic("error");
      const detail = err instanceof ApiError ? String(err.body) : null;
      toast.error(detail?.replace(/^Sync failed: /, "") ?? "Sync failed");
    },
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) =>
      api<MCPServerPublic>(`/v1/mcp/servers/${id}`, {
        method: "PATCH",
        body: { enabled },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mcp", "servers"] });
      qc.invalidateQueries({ queryKey: ["tools"] });
    },
    onError: () => toast.error("Could not toggle"),
  });

  const startCreate = () => setEditor(blankDraft());
  const startEdit = (s: MCPServerPublic) =>
    setEditor({
      id: s.id,
      name: s.name,
      url: s.url,
      authToken: "",
      authTokenDirty: false,
    });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editor) return;
    const name = editor.name.trim();
    const url = editor.url.trim();
    if (!name || !url) return;
    if (editor.id === null) {
      const body: MCPServerCreate = {
        name,
        url,
        transport: "http",
        ...(editor.authToken ? { auth_token: editor.authToken } : {}),
        enabled: true,
      };
      createMut.mutate(body);
    } else {
      const body: MCPServerUpdate = { name, url };
      if (editor.authTokenDirty) body.auth_token = editor.authToken;
      updateMut.mutate({ id: editor.id, body });
    }
  };

  const list = servers.data ?? [];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-bold leading-tight">
            MCP <span className="italic">servers</span>.
          </h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            Connect Model Context Protocol servers to plug their tools into the
            chat. Sync to fetch the tool list; toggle individual tools on the{" "}
            <a className="underline underline-offset-2" href="/settings/tools">
              Tools
            </a>{" "}
            page.
          </p>
        </div>
        <button className={PRIMARY} onClick={startCreate} type="button">
          <Plus className="size-4" />
          Add server
        </button>
      </header>

      {servers.isPending && (
        <p className="text-sm text-muted-foreground">Loading…</p>
      )}

      {!servers.isPending && list.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-border p-8 text-center">
          <Plug className="mx-auto size-6 text-muted-foreground" aria-hidden />
          <p className="mt-3 text-sm text-muted-foreground">
            No MCP servers yet. Add one to start connecting external tools.
          </p>
        </div>
      )}

      <ul className="grid gap-3 sm:grid-cols-2">
        {list.map((s) => {
          const synced = relativeTime(s.last_synced_at);
          const isSyncing = syncMut.isPending && syncMut.variables === s.id;
          const isToggling =
            toggleMut.isPending && toggleMut.variables?.id === s.id;
          return (
            <li
              key={s.id}
              className={cn(
                "group relative flex h-full flex-col gap-2 rounded-xl border-2 border-border bg-card p-4 transition-[transform,box-shadow] duration-100 hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[5px_5px_0_0_var(--lime)]",
                s.enabled
                  ? "shadow-[3px_3px_0_0_var(--border)]"
                  : "opacity-60 shadow-[3px_3px_0_0_var(--border)]",
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-base font-semibold">{s.name}</h2>
                {s.has_auth_token && (
                  <span
                    className="border-2 border-border bg-background px-1.5 py-0.5 font-pixel text-[9px] uppercase tracking-widest text-muted-foreground"
                    title="Authenticated"
                  >
                    auth
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    haptic("tap");
                    toggleMut.mutate({ id: s.id, enabled: !s.enabled });
                  }}
                  disabled={isToggling}
                  className={cn(
                    "ml-auto inline-flex h-7 items-center gap-1 border-2 border-border px-2 font-pixel text-[10px] uppercase tracking-[0.14em] transition-transform active:scale-90",
                    s.enabled
                      ? "bg-[color:var(--lime)] text-[color:var(--lime-foreground)]"
                      : "bg-card text-muted-foreground",
                  )}
                >
                  {s.enabled ? "on" : "off"}
                </button>
              </div>

              <p className="truncate text-xs text-muted-foreground" title={s.url}>
                {s.url}
              </p>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                {s.last_sync_error ? (
                  <>
                    <span
                      className="inline-flex items-center gap-1 text-[color:var(--destructive)]"
                      title={s.last_sync_error}
                    >
                      <AlertCircle className="size-3.5" />
                      sync failed
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        haptic("select");
                        syncMut.mutate(s.id);
                      }}
                      disabled={isSyncing}
                      className="inline-flex items-center gap-1 underline-offset-2 hover:underline disabled:opacity-50"
                    >
                      <RefreshCw
                        className={cn("size-3", isSyncing && "animate-spin")}
                      />
                      retry
                    </button>
                  </>
                ) : s.last_synced_at ? (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <CheckCircle2 className="size-3.5" />
                    {s.synced_tools?.length ?? 0} tool
                    {(s.synced_tools?.length ?? 0) === 1 ? "" : "s"}
                    {synced ? ` · ${synced}` : ""}
                  </span>
                ) : (
                  <>
                    <span className="text-muted-foreground">never synced</span>
                    <button
                      type="button"
                      onClick={() => {
                        haptic("select");
                        syncMut.mutate(s.id);
                      }}
                      disabled={isSyncing}
                      className="inline-flex items-center gap-1 underline-offset-2 hover:underline disabled:opacity-50"
                    >
                      <RefreshCw
                        className={cn("size-3", isSyncing && "animate-spin")}
                      />
                      sync now
                    </button>
                  </>
                )}
              </div>

              <div className="mt-auto flex justify-end gap-1 pt-2 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
                <button
                  type="button"
                  aria-label="Sync"
                  title="Sync"
                  onClick={() => {
                    haptic("select");
                    syncMut.mutate(s.id);
                  }}
                  disabled={isSyncing}
                  className="inline-flex size-11 items-center justify-center text-muted-foreground transition-transform duration-75 hover:text-foreground active:scale-90 disabled:opacity-50 md:size-7"
                >
                  <RefreshCw
                    className={cn("size-4 md:size-3.5", isSyncing && "animate-spin")}
                  />
                </button>
                <button
                  type="button"
                  aria-label="Edit"
                  onClick={() => startEdit(s)}
                  className="inline-flex size-11 items-center justify-center text-muted-foreground transition-transform duration-75 hover:text-foreground active:scale-90 md:size-7"
                >
                  <Pencil className="size-4 md:size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Delete"
                  onClick={() => setPendingDelete(s)}
                  className="inline-flex size-11 items-center justify-center text-muted-foreground transition-transform duration-75 hover:text-destructive active:scale-90 md:size-7"
                >
                  <Trash2 className="size-4 md:size-3.5" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <Modal
        open={editor !== null}
        onOpenChange={(o) => {
          if (!o) setEditor(null);
        }}
        title={editor?.id === null ? "New *MCP server*" : "Edit *MCP server*"}
      >
        {editor && (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="mcp-name" className={LABEL}>
                Name
              </label>
              <input
                id="mcp-name"
                className={INPUT}
                value={editor.name}
                onChange={(e) => setEditor({ ...editor, name: e.target.value })}
                placeholder="context7"
                maxLength={100}
                pattern="[a-zA-Z0-9_\- ]+"
                required
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Letters, digits, dashes, underscores. Used to namespace the tools.
              </p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="mcp-url" className={LABEL}>
                URL
              </label>
              <input
                id="mcp-url"
                type="url"
                className={INPUT}
                value={editor.url}
                onChange={(e) => setEditor({ ...editor, url: e.target.value })}
                placeholder="https://mcp.context7.com/mcp"
                required
              />
              <p className="text-xs text-muted-foreground">
                Streamable-HTTP MCP endpoint. SSE-only servers aren&apos;t
                supported in this iteration.
              </p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="mcp-token" className={LABEL}>
                Auth token{" "}
                <span className="ml-1 text-muted-foreground">(optional)</span>
              </label>
              <input
                id="mcp-token"
                type="password"
                className={INPUT}
                value={editor.authToken}
                onChange={(e) =>
                  setEditor({
                    ...editor,
                    authToken: e.target.value,
                    authTokenDirty: true,
                  })
                }
                placeholder={
                  editor.id !== null && !editor.authTokenDirty
                    ? "(unchanged)"
                    : "Bearer token"
                }
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                Stored encrypted at rest (Fernet). Sent as{" "}
                <code>Authorization: Bearer …</code> on every call to the server.
              </p>
            </div>

            <Modal.Footer>
              <Modal.Cancel>Cancel</Modal.Cancel>
              <Modal.Confirm
                onClick={() => onSubmit({ preventDefault() {} } as React.FormEvent)}
                disabled={createMut.isPending || updateMut.isPending}
              >
                {editor.id === null ? "Add" : "Save"}
              </Modal.Confirm>
            </Modal.Footer>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(o) => {
          if (!o) setPendingDelete(null);
        }}
        title="Remove *MCP server*?"
        description={
          pendingDelete
            ? `“${pendingDelete.name}” will be unregistered. Its tools stop appearing in the registry. Past tool calls in conversations are preserved.`
            : ""
        }
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={() => {
          if (pendingDelete) {
            deleteMut.mutate(pendingDelete.id);
            setPendingDelete(null);
          }
        }}
      />
    </div>
  );
}
