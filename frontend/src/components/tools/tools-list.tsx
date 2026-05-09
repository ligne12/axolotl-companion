"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plug, Wrench } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { toast } from "sonner";

import { useApi } from "@/hooks/use-api";
import { cn } from "@/lib/utils";
import type { MCPServerPublic, ToolInfo } from "@/types/api";

function ToolToggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 items-center border-2 border-border transition-colors",
        enabled ? "bg-[color:var(--lime)]" : "bg-card",
      )}
    >
      <span
        className={cn(
          "inline-block size-4 border-2 border-border bg-background transition-transform",
          enabled ? "translate-x-[20px]" : "translate-x-[2px]",
        )}
      />
    </button>
  );
}

function SectionHeading({
  Icon,
  label,
  count,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  count?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-4 shrink-0" />
      <h2 className="font-pixel text-[11px] uppercase tracking-[0.14em]">{label}</h2>
      {typeof count === "number" && (
        <span className="border-2 border-border bg-background px-1.5 py-0.5 font-pixel text-[10px] uppercase tracking-wider text-muted-foreground">
          {count}
        </span>
      )}
    </div>
  );
}

/**
 * Live list of available tools, grouped by provenance.
 *
 *  - **Built-in** tools come from ``GET /v1/tools`` and are individually
 *    toggleable; writes go to ``PUT /v1/tools/{name}`` and are
 *    optimistically reflected in the ``["tools"]`` query cache.
 *  - **MCP** tools are sourced from each user-defined MCP server's last
 *    sync (``GET /v1/mcp/servers``). They render read-only here — the
 *    on/off granularity for MCP is at the *server* level, managed in
 *    Settings → MCP.
 *
 * Reused both by the Settings → Tools tab and the in-chat controls
 * drawer.
 */
export function ToolsList({ compact = false }: { compact?: boolean }) {
  const api = useApi();
  const qc = useQueryClient();
  const t = useTranslations("tools");
  const tc = useTranslations("common");

  const tools = useQuery({
    queryKey: ["tools"],
    queryFn: () => api<ToolInfo[]>("/v1/tools"),
  });

  const mcpServers = useQuery({
    queryKey: ["mcp-servers"],
    queryFn: () => api<MCPServerPublic[]>("/v1/mcp/servers"),
  });

  const toggle = useMutation({
    mutationFn: ({ name, enabled }: { name: string; enabled: boolean }) =>
      api<ToolInfo>(`/v1/tools/${name}`, {
        method: "PUT",
        body: { enabled },
      }),
    onMutate: async ({ name, enabled }) => {
      await qc.cancelQueries({ queryKey: ["tools"] });
      const previous = qc.getQueryData<ToolInfo[]>(["tools"]);
      qc.setQueryData<ToolInfo[] | undefined>(["tools"], (prev) =>
        prev?.map((t) => (t.name === name ? { ...t, enabled } : t)),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(["tools"], ctx.previous);
      toast.error(t("errToggle"));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["tools"] }),
  });

  if (tools.isPending) {
    return <p className="text-sm text-muted-foreground">{tc("loading")}</p>;
  }

  const builtIns = tools.data ?? [];
  const enabledServers = (mcpServers.data ?? []).filter((s) => s.enabled);

  if (builtIns.length === 0 && enabledServers.length === 0) {
    return (
      <p className="font-pixel text-[11px] uppercase tracking-wider text-muted-foreground">
        {t("noTools")}
      </p>
    );
  }

  return (
    <div className={compact ? "space-y-5" : "space-y-7"}>
      {builtIns.length > 0 && (
        <section className="space-y-3">
          <SectionHeading Icon={Wrench} label={t("builtIn")} count={builtIns.length} />
          <ul className={compact ? "space-y-2" : "space-y-3"}>
            {builtIns.map((tool) => (
              <li
                key={tool.name}
                className={cn(
                  "flex items-start justify-between gap-4 border-2 border-border bg-card shadow-[3px_3px_0_0_var(--border)]",
                  compact ? "p-3" : "p-4",
                )}
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3
                      className={cn(
                        "font-display font-semibold",
                        compact ? "text-sm" : "text-base",
                      )}
                    >
                      {/* If a translation key exists for this tool, use it;
                          otherwise fall back to the backend's English copy
                          so a newly-added tool keeps showing something. */}
                      {t.has(`builtIns.${tool.name}.title`)
                        ? t(`builtIns.${tool.name}.title`)
                        : tool.title}
                    </h3>
                    <span className="border-2 border-border bg-background px-1.5 py-0.5 font-pixel text-[11px] uppercase tracking-wider text-muted-foreground">
                      {t.has(`categories.${tool.category}`)
                        ? t(`categories.${tool.category}`)
                        : tool.category}
                    </span>
                  </div>
                  <p className={cn("text-muted-foreground", compact ? "text-xs" : "text-sm")}>
                    {t.has(`builtIns.${tool.name}.description`)
                      ? t(`builtIns.${tool.name}.description`)
                      : tool.description}
                  </p>
                </div>
                <ToolToggle
                  enabled={tool.enabled}
                  onChange={(checked) => toggle.mutate({ name: tool.name, enabled: checked })}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {enabledServers.map((server) => (
        <McpServerSection key={server.id} server={server} compact={compact} />
      ))}
    </div>
  );
}

function McpServerSection({
  server,
  compact,
}: {
  server: MCPServerPublic;
  compact: boolean;
}) {
  const t = useTranslations("tools");
  const synced = server.synced_tools ?? [];
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <SectionHeading
          Icon={Plug}
          label={t("mcpServer", { name: server.name })}
          count={synced.length}
        />
        <Link
          href="/settings/mcp"
          className="border-2 border-transparent px-2 py-1 font-pixel text-[10px] uppercase tracking-wider text-muted-foreground hover:border-border/40 hover:bg-card/60"
        >
          {t("manage")}
        </Link>
      </div>
      {synced.length === 0 ? (
        <p className="font-pixel text-[11px] uppercase tracking-wider text-muted-foreground">
          {server.last_sync_error ? t("syncFailed") : t("notSynced")}
        </p>
      ) : (
        <ul className={compact ? "space-y-2" : "space-y-3"}>
          {synced.map((tool) => (
            <li
              key={tool.name}
              className={cn(
                "flex items-start justify-between gap-4 border-2 border-border bg-card shadow-[3px_3px_0_0_var(--border)]",
                compact ? "p-3" : "p-4",
              )}
            >
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <h3
                    className={cn(
                      "truncate font-display font-semibold",
                      compact ? "text-sm" : "text-base",
                    )}
                  >
                    {tool.name}
                  </h3>
                  <span className="border-2 border-border bg-background px-1.5 py-0.5 font-pixel text-[11px] uppercase tracking-wider text-muted-foreground">
                    {t("mcpBadge")}
                  </span>
                </div>
                {tool.description && (
                  <p className={cn("text-muted-foreground", compact ? "text-xs" : "text-sm")}>
                    {tool.description}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
