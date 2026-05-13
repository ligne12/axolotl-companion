"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Brain, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { useApi } from "@/hooks/use-api";
import { SAMPLING_DEFAULTS } from "@/lib/hyperparams";
import { cn } from "@/lib/utils";
import type { HyperParams, UserPublic } from "@/types/api";

type Choice = "on" | "off" | "default";

function choiceFromDefaults(defaults: HyperParams | null | undefined): Choice {
  const v = defaults?.enable_thinking;
  if (v === true) return "on";
  if (v === false) return "off";
  return "default";
}

export default function ReasoningSettingsPage() {
  const api = useApi();
  const qc = useQueryClient();
  const t = useTranslations("reasoning");

  const meQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => api<UserPublic>("/auth/me"),
  });

  const current = choiceFromDefaults(meQuery.data?.defaults);

  const save = useMutation({
    mutationFn: (choice: Choice) => {
      const next: HyperParams = { ...(meQuery.data?.defaults ?? {}) };
      if (choice === "on") next.enable_thinking = true;
      else if (choice === "off") next.enable_thinking = false;
      else delete next.enable_thinking;
      return api<UserPublic>("/auth/me", {
        method: "PATCH",
        body: { defaults: next },
      });
    },
    onSuccess: (next) => {
      qc.setQueryData<UserPublic>(["auth", "me"], next);
      toast.success(t("saved"));
    },
    onError: () => toast.error(t("errSave")),
  });

  const OPTIONS: { value: Choice; label: string; sub: string }[] = [
    { value: "on", label: t("options.on"), sub: t("options.onSub") },
    { value: "off", label: t("options.off"), sub: t("options.offSub") },
    {
      value: "default",
      label: t("options.default"),
      sub: SAMPLING_DEFAULTS.enable_thinking
        ? t("options.defaultSubOn")
        : t("options.defaultSubOff"),
    },
  ];

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="font-display text-3xl leading-tight font-bold">
          {t.rich("title", {
            em: (chunks) => <span className="italic">{chunks}</span>,
          })}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t.rich("intro", {
            code: (chunks) => <code>{chunks}</code>,
          })}
        </p>
      </header>

      <div className="border-border bg-card flex items-start gap-3 border-2 p-4 shadow-[3px_3px_0_0_var(--border)]">
        <Brain className="mt-0.5 size-5 shrink-0 text-[color:var(--lime)]" />
        <div className="space-y-0.5 text-xs">
          <p className="font-display text-sm font-semibold">
            {t.rich("explainerTitle", {
              em: (chunks) => <span className="italic">{chunks}</span>,
            })}
          </p>
          <p className="text-muted-foreground">{t("explainerBody")}</p>
        </div>
      </div>

      <div className="space-y-3">
        {OPTIONS.map((opt) => {
          const active = current === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => save.mutate(opt.value)}
              disabled={save.isPending || meQuery.isPending}
              className={cn(
                "flex w-full items-start gap-3 border-2 px-4 py-3 text-left transition-[transform,box-shadow] duration-100",
                active
                  ? "border-border bg-card shadow-[3px_3px_0_0_var(--lime)]"
                  : "border-border bg-card/60 shadow-[2px_2px_0_0_var(--border)] hover:shadow-[3px_3px_0_0_var(--border)]",
                "disabled:cursor-not-allowed disabled:opacity-60",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "border-border mt-1 size-3 shrink-0 border-2",
                  active ? "bg-[color:var(--lime)]" : "bg-background",
                )}
              />
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-pixel text-[12px] tracking-[0.14em] uppercase">
                    {opt.label}
                  </span>
                  {opt.value === "default" && (
                    <RotateCcw className="text-muted-foreground size-3.5" />
                  )}
                </div>
                <p className="text-muted-foreground text-xs">{opt.sub}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
