"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Pencil, Plug, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Modal } from "@/components/ui/modal";
import { useApi } from "@/hooks/use-api";
import { useHaptic } from "@/hooks/use-haptic";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { MCPServerCreate, MCPServerPublic, MCPServerUpdate, MCPSyncResult } from "@/types/api";

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

function relativeTime(iso: string | null | undefined, locale: string): string | null {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (diff < 60_000) return rtf.format(0, "second");
  if (diff < 3_600_000) return rtf.format(-Math.floor(diff / 60_000), "minute");
  if (diff < 86_400_000) return rtf.format(-Math.floor(diff / 3_600_000), "hour");
  return rtf.format(-Math.floor(diff / 86_400_000), "day");
}

export default function McpPage() {
  const api = useApi();
  const qc = useQueryClient();
  const haptic = useHaptic();
  const t = useTranslations("mcp");
  const tc = useTranslations("common");
  const locale = useLocale();

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
      toast.success(t("toasts.added"));
    },
    onError: (err: unknown) => {
      haptic("error");
      const msg =
        err instanceof ApiError && err.status === 409
          ? t("toasts.errNameTaken")
          : t("toasts.errAdd");
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
      toast.success(t("toasts.updated"));
    },
    onError: (err: unknown) => {
      haptic("error");
      const msg =
        err instanceof ApiError && err.status === 409
          ? t("toasts.errNameTaken")
          : t("toasts.errUpdate");
      toast.error(msg);
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api<void>(`/v1/mcp/servers/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mcp", "servers"] });
      qc.invalidateQueries({ queryKey: ["tools"] });
      haptic("success");
      toast.success(t("toasts.removed"));
    },
    onError: () => {
      haptic("error");
      toast.error(t("toasts.errDelete"));
    },
  });

  const syncMut = useMutation({
    mutationFn: (id: number) =>
      api<MCPSyncResult>(`/v1/mcp/servers/${id}/sync`, { method: "POST" }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["mcp", "servers"] });
      qc.invalidateQueries({ queryKey: ["tools"] });
      haptic("success");
      toast.success(t("toasts.syncedCount", { count: data.tools_count }));
    },
    onError: (err: unknown) => {
      // The backend persists ``last_sync_error`` on the row even when the
      // 502 fires, so refetch the list to flip the card from
      // "never synced" to "sync failed" and surface the reason.
      qc.invalidateQueries({ queryKey: ["mcp", "servers"] });
      haptic("error");
      const detail = err instanceof ApiError ? String(err.body) : null;
      toast.error(detail?.replace(/^Sync failed: /, "") ?? t("toasts.errSync"));
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
    onError: () => toast.error(t("toasts.errToggle")),
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
          <h1 className="font-display text-3xl leading-tight font-bold">
            {t.rich("title", {
              em: (chunks) => <span className="italic">{chunks}</span>,
            })}
          </h1>
          <p className="text-muted-foreground max-w-xl text-sm">
            {t.rich("intro", {
              link: (chunks) => (
                <a className="underline underline-offset-2" href="/settings/tools">
                  {chunks}
                </a>
              ),
            })}
          </p>
        </div>
        <button className={PRIMARY} onClick={startCreate} type="button">
          <Plus className="size-4" />
          {t("addServer")}
        </button>
      </header>

      {servers.isPending && <p className="text-muted-foreground text-sm">{tc("loading")}</p>}

      {!servers.isPending && list.length === 0 && (
        <div className="border-border rounded-xl border-2 border-dashed p-8 text-center">
          <Plug className="text-muted-foreground mx-auto size-6" aria-hidden />
          <p className="text-muted-foreground mt-3 text-sm">{t("empty")}</p>
        </div>
      )}

      <ul className="grid gap-3 sm:grid-cols-2">
        {list.map((s) => {
          const synced = relativeTime(s.last_synced_at, locale);
          const isSyncing = syncMut.isPending && syncMut.variables === s.id;
          const isToggling = toggleMut.isPending && toggleMut.variables?.id === s.id;
          return (
            <li
              key={s.id}
              className={cn(
                "group border-border bg-card relative flex h-full flex-col gap-2 rounded-xl border-2 p-4 transition-[transform,box-shadow] duration-100 hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[5px_5px_0_0_var(--lime)]",
                s.enabled
                  ? "shadow-[3px_3px_0_0_var(--border)]"
                  : "opacity-60 shadow-[3px_3px_0_0_var(--border)]",
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-base font-semibold">{s.name}</h2>
                {s.has_auth_token && (
                  <span
                    className="border-border bg-background font-pixel text-muted-foreground border-2 px-1.5 py-0.5 text-[9px] tracking-widest uppercase"
                    title={t("auth")}
                  >
                    {t("auth")}
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
                    "border-border font-pixel ml-auto inline-flex h-7 items-center gap-1 border-2 px-2 text-[10px] tracking-[0.14em] uppercase transition-transform active:scale-90",
                    s.enabled
                      ? "bg-[color:var(--lime)] text-[color:var(--lime-foreground)]"
                      : "bg-card text-muted-foreground",
                  )}
                >
                  {s.enabled ? t("on") : t("off")}
                </button>
              </div>

              <p className="text-muted-foreground truncate text-xs" title={s.url}>
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
                      {t("syncFailed")}
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
                      <RefreshCw className={cn("size-3", isSyncing && "animate-spin")} />
                      {tc("retry")}
                    </button>
                  </>
                ) : s.last_synced_at ? (
                  <span className="text-muted-foreground inline-flex items-center gap-1">
                    <CheckCircle2 className="size-3.5" />
                    {t("syncedTools", { count: s.synced_tools?.length ?? 0 })}
                    {synced ? ` · ${synced}` : ""}
                  </span>
                ) : (
                  <>
                    <span className="text-muted-foreground">{t("neverSynced")}</span>
                    <button
                      type="button"
                      onClick={() => {
                        haptic("select");
                        syncMut.mutate(s.id);
                      }}
                      disabled={isSyncing}
                      className="inline-flex items-center gap-1 underline-offset-2 hover:underline disabled:opacity-50"
                    >
                      <RefreshCw className={cn("size-3", isSyncing && "animate-spin")} />
                      {t("syncNow")}
                    </button>
                  </>
                )}
              </div>

              <div className="mt-auto flex justify-end gap-1 pt-2 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
                <button
                  type="button"
                  aria-label={t("syncNow")}
                  title={t("syncNow")}
                  onClick={() => {
                    haptic("select");
                    syncMut.mutate(s.id);
                  }}
                  disabled={isSyncing}
                  className="text-muted-foreground hover:text-foreground inline-flex size-11 items-center justify-center transition-transform duration-75 active:scale-90 disabled:opacity-50 md:size-7"
                >
                  <RefreshCw className={cn("size-4 md:size-3.5", isSyncing && "animate-spin")} />
                </button>
                <button
                  type="button"
                  aria-label={tc("edit")}
                  onClick={() => startEdit(s)}
                  className="text-muted-foreground hover:text-foreground inline-flex size-11 items-center justify-center transition-transform duration-75 active:scale-90 md:size-7"
                >
                  <Pencil className="size-4 md:size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label={tc("delete")}
                  onClick={() => setPendingDelete(s)}
                  className="text-muted-foreground hover:text-destructive inline-flex size-11 items-center justify-center transition-transform duration-75 active:scale-90 md:size-7"
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
        title={editor?.id === null ? t("modal.newTitle") : t("modal.editTitle")}
      >
        {editor && (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="mcp-name" className={LABEL}>
                {t("modal.name")}
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
              <p className="text-muted-foreground text-xs">{t("modal.nameHelp")}</p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="mcp-url" className={LABEL}>
                {t("modal.url")}
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
              <p className="text-muted-foreground text-xs">{t("modal.urlHelp")}</p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="mcp-token" className={LABEL}>
                {t("modal.authToken")}{" "}
                <span className="text-muted-foreground ml-1">{t("modal.optional")}</span>
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
                    ? t("modal.tokenUnchanged")
                    : t("modal.tokenPlaceholder")
                }
                autoComplete="off"
              />
              <p className="text-muted-foreground text-xs">{t("modal.tokenHelp")}</p>
            </div>

            <Modal.Footer>
              <Modal.Cancel>{tc("cancel")}</Modal.Cancel>
              <Modal.Confirm
                onClick={() => onSubmit({ preventDefault() {} } as React.FormEvent)}
                disabled={createMut.isPending || updateMut.isPending}
              >
                {editor.id === null ? tc("add") : tc("save")}
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
        title={t("delete.title")}
        description={pendingDelete ? t("delete.description", { name: pendingDelete.name }) : ""}
        confirmLabel={t("delete.confirm")}
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
