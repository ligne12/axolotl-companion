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

export default function ToolsPage() {
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

  return (
    <div className="h-full overflow-auto p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-2">
          <div className="inline-flex items-center gap-2 border-2 border-border bg-card px-2.5 py-1 font-pixel text-[12px] uppercase tracking-[0.14em]">
            <span className="size-2 bg-[color:var(--lime)]" />
            Tools
          </div>
          <h1 className="font-display text-3xl font-bold leading-tight">
            Pick what the axolotl can <span className="italic">reach for</span>.
          </h1>
          <p className="text-sm text-muted-foreground">
            Each tool is local-first. Toggle any off and the model will stop calling it.
          </p>
        </header>

        {tools.isPending && (
          <p className="text-sm text-muted-foreground">Loading...</p>
        )}

        <ul className="space-y-3">
          {tools.data?.map((tool) => (
            <li
              key={tool.name}
              className="flex items-start justify-between gap-4 border-2 border-border bg-card p-4 shadow-[3px_3px_0_0_var(--border)]"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-base font-semibold">{tool.title}</h2>
                  <span className="border-2 border-border bg-background px-1.5 py-0.5 font-pixel text-[11px] uppercase tracking-wider text-muted-foreground">
                    {tool.category}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{tool.description}</p>
              </div>
              <ToolToggle
                enabled={tool.enabled}
                onChange={(checked) => toggle.mutate({ name: tool.name, enabled: checked })}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
