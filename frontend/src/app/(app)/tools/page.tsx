"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useApi } from "@/hooks/use-api";
import type { ToolInfo } from "@/types/api";

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
      <div className="mx-auto max-w-3xl space-y-4">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">Tools</h1>
          <p className="text-sm text-muted-foreground">
            Enable or disable the tools the assistant can call.
          </p>
        </header>
        {tools.isPending && <p className="text-sm text-muted-foreground">Loading...</p>}
        {tools.data?.map((tool) => (
          <Card key={tool.name}>
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <div className="space-y-1">
                <CardTitle className="text-base">{tool.title}</CardTitle>
                <CardDescription>{tool.description}</CardDescription>
              </div>
              <Switch
                checked={tool.enabled}
                onCheckedChange={(checked: boolean) =>
                  toggle.mutate({ name: tool.name, enabled: checked })
                }
              />
            </CardHeader>
            <CardContent className="pt-0 text-xs text-muted-foreground">
              category: <span className="font-mono">{tool.category}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
