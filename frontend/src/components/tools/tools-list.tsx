"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useApi } from "@/hooks/use-api";
import { cn } from "@/lib/utils";
import type { ToolInfo } from "@/types/api";

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

/**
 * Live list of available tools with per-tool on/off toggles. Reused both
 * by the Settings → Tools tab and the in-chat controls drawer.
 *
 * Writes go to ``PUT /v1/tools/{name}`` and are optimistically reflected
 * in the ``["tools"]`` query cache so the UI stays responsive.
 */
export function ToolsList({ compact = false }: { compact?: boolean }) {
  const api = useApi();
  const qc = useQueryClient();

  const tools = useQuery({
    queryKey: ["tools"],
    queryFn: () => api<ToolInfo[]>("/v1/tools"),
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
      toast.error("Could not update the tool");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["tools"] }),
  });

  if (tools.isPending) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (!tools.data || tools.data.length === 0) {
    return (
      <p className="font-pixel text-[11px] uppercase tracking-wider text-muted-foreground">
        No tools installed.
      </p>
    );
  }

  return (
    <ul className={compact ? "space-y-2" : "space-y-3"}>
      {tools.data.map((tool) => (
        <li
          key={tool.name}
          className={cn(
            "flex items-start justify-between gap-4 border-2 border-border bg-card shadow-[3px_3px_0_0_var(--border)]",
            compact ? "p-3" : "p-4",
          )}
        >
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <h3 className={cn("font-display font-semibold", compact ? "text-sm" : "text-base")}>
                {tool.title}
              </h3>
              <span className="border-2 border-border bg-background px-1.5 py-0.5 font-pixel text-[11px] uppercase tracking-wider text-muted-foreground">
                {tool.category}
              </span>
            </div>
            <p className={cn("text-muted-foreground", compact ? "text-xs" : "text-sm")}>
              {tool.description}
            </p>
          </div>
          <ToolToggle
            enabled={tool.enabled}
            onChange={(checked) => toggle.mutate({ name: tool.name, enabled: checked })}
          />
        </li>
      ))}
    </ul>
  );
}
