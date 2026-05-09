"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, RotateCcw, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ParamSlider } from "@/components/hyperparams/param-slider";
import { useApi } from "@/hooks/use-api";
import { hyperParamsEqual, pruneHyperParams, SAMPLING_FIELDS } from "@/lib/hyperparams";
import { cn } from "@/lib/utils";
import type { HyperParams, UserPublic } from "@/types/api";

export default function ModelSettingsPage() {
  const api = useApi();
  const qc = useQueryClient();

  const meQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => api<UserPublic>("/auth/me"),
  });

  const [draft, setDraft] = useState<HyperParams>({});

  useEffect(() => {
    if (meQuery.data?.defaults) {
      setDraft(pruneHyperParams(meQuery.data.defaults));
    }
  }, [meQuery.data]);

  const dirty = meQuery.data?.defaults
    ? !hyperParamsEqual(draft, meQuery.data.defaults)
    : Object.keys(draft).length > 0;

  const save = useMutation({
    mutationFn: (body: HyperParams) =>
      api<UserPublic>("/auth/me", { method: "PATCH", body: { defaults: body } }),
    onSuccess: (next) => {
      qc.setQueryData<UserPublic>(["auth", "me"], next);
      toast.success("Defaults saved");
    },
    onError: () => toast.error("Could not save"),
  });

  const setValue = (key: keyof HyperParams, value: number | boolean) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };
  const clearValue = (key: keyof HyperParams) => {
    setDraft((d) => {
      const next = { ...d };
      delete next[key];
      return next;
    });
  };
  const resetAll = () => setDraft({});

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dirty) return;
    save.mutate(pruneHyperParams(draft));
  };

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-bold leading-tight">
          Model &amp; <span className="italic">generation</span>.
        </h1>
        <p className="text-sm text-muted-foreground">
          Your baseline sampling parameters. Any value you don&apos;t set
          falls back to the server default. Every new session starts from
          these, and you can override them per-conversation from the chat
          drawer (<kbd className="font-pixel text-[11px]">⌘,</kbd>).
        </p>
      </header>

      <div className="space-y-6">
        {SAMPLING_FIELDS.map((field) => (
          <ParamSlider
            key={field.key}
            field={field}
            value={draft[field.key] ?? null}
            onChange={(v) => setValue(field.key, v)}
            onClear={() => clearValue(field.key)}
            disabled={meQuery.isPending}
          />
        ))}
      </div>

      <div
        className={cn(
          // Mobile: sticky bottom action bar so the buttons stay in reach
          // even with all 8 sliders scrolled past. Desktop: inline border-top.
          "sticky bottom-0 -mx-4 flex flex-col-reverse gap-2 border-t-2 border-border bg-background px-4 py-3 md:static md:mx-0 md:flex-row md:flex-wrap md:items-center md:gap-3 md:bg-transparent md:p-0 md:pt-5",
        )}
      >
        <button
          type="button"
          onClick={resetAll}
          disabled={Object.keys(draft).length === 0}
          className={cn(
            "inline-flex w-full items-center justify-center gap-2 border-2 border-border bg-card px-3.5 py-2 text-xs font-pixel uppercase tracking-[0.14em] md:w-auto",
            "shadow-[2px_2px_0_0_var(--border)] transition-[transform,box-shadow] duration-100",
            "hover:shadow-[3px_3px_0_0_var(--border)]",
            "active:translate-x-[1px] active:translate-y-[1px] active:shadow-none",
            "disabled:cursor-not-allowed disabled:opacity-40",
          )}
        >
          <RotateCcw className="size-3.5" />
          Reset all
        </button>

        {dirty && (
          <button
            type="submit"
            disabled={save.isPending}
            className={cn(
              "inline-flex w-full items-center justify-center gap-2 border-2 border-border bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground md:w-auto",
              "shadow-[3px_3px_0_0_var(--lime)] transition-[transform,box-shadow] duration-100",
              "hover:shadow-[4px_4px_0_0_var(--lime)]",
              "active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_0_var(--lime)]",
              "disabled:cursor-not-allowed disabled:opacity-60",
            )}
          >
            {save.isPending ? (
              <Check className="size-4 animate-pulse" />
            ) : (
              <Save className="size-4" />
            )}
            {save.isPending ? "Saving…" : "Save defaults"}
          </button>
        )}
      </div>
    </form>
  );
}
