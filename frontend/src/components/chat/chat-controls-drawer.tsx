"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IdCard, RotateCcw, Save, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ParamSlider } from "@/components/hyperparams/param-slider";
import { ToolsList } from "@/components/tools/tools-list";
import { useApi } from "@/hooks/use-api";
import {
  hyperParamsEqual,
  pruneHyperParams,
  SAMPLING_DEFAULTS,
  SAMPLING_FIELDS,
} from "@/lib/hyperparams";
import { cn } from "@/lib/utils";
import type {
  HyperParams,
  PersonaPublic,
  SessionPublic,
  UserPublic,
} from "@/types/api";

type ThinkingChoice = "on" | "off" | "inherit";

function thinkingChoice(v: boolean | null | undefined): ThinkingChoice {
  if (v === true) return "on";
  if (v === false) return "off";
  return "inherit";
}

type Draft = {
  persona_id: number | null;
  model: string;
  overrides: HyperParams;
};

/**
 * Slide-in side drawer anchored to the right of the main column. Gives
 * the chat fast access to per-session knobs without leaving the conversation.
 *
 * Per-session layering: slider values fall back to ``user.defaults`` (set in
 * Settings → Model), which fall back to the server defaults. Clearing an
 * override restores the user default; the pill next to each slider says so.
 */
export function ChatControlsDrawer({
  sessionId,
  open,
  onOpenChange,
}: {
  sessionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const api = useApi();
  const qc = useQueryClient();

  const sessionQuery = useQuery({
    queryKey: ["session", sessionId],
    queryFn: () => api<SessionPublic>(`/v1/sessions/${sessionId}`),
    enabled: open,
  });
  const personasQuery = useQuery({
    queryKey: ["personas"],
    queryFn: () => api<PersonaPublic[]>("/v1/personas"),
    enabled: open,
  });
  const meQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => api<UserPublic>("/auth/me"),
    enabled: open,
  });

  const userDefaults = meQuery.data?.defaults ?? {};

  const serverSnapshot = useMemo<Draft | null>(() => {
    if (!sessionQuery.data) return null;
    return {
      persona_id: sessionQuery.data.persona_id ?? null,
      model: sessionQuery.data.model ?? "",
      overrides: pruneHyperParams(sessionQuery.data.overrides ?? {}),
    };
  }, [sessionQuery.data]);

  const [draft, setDraft] = useState<Draft | null>(null);
  useEffect(() => {
    if (serverSnapshot) setDraft(serverSnapshot);
  }, [serverSnapshot]);

  const dirty =
    !!draft &&
    !!serverSnapshot &&
    (draft.persona_id !== serverSnapshot.persona_id ||
      draft.model !== serverSnapshot.model ||
      !hyperParamsEqual(draft.overrides, serverSnapshot.overrides));

  const apply = useMutation({
    mutationFn: (d: Draft) =>
      api<SessionPublic>(`/v1/sessions/${sessionId}`, {
        method: "PATCH",
        body: {
          persona_id: d.persona_id,
          model: d.model.trim() ? d.model.trim() : null,
          overrides: pruneHyperParams(d.overrides),
        },
      }),
    onSuccess: (next) => {
      qc.setQueryData<SessionPublic>(["session", sessionId], next);
      qc.invalidateQueries({ queryKey: ["sessions"] });
      toast.success("Session controls updated");
    },
    onError: () => toast.error("Could not update session"),
  });

  const setOverride = (key: keyof HyperParams, value: number | boolean) => {
    setDraft((d) => (d ? { ...d, overrides: { ...d.overrides, [key]: value } } : d));
  };
  const clearOverride = (key: keyof HyperParams) => {
    setDraft((d) => {
      if (!d) return d;
      const next = { ...d.overrides };
      delete next[key];
      return { ...d, overrides: next };
    });
  };
  const resetAll = () => {
    setDraft((d) => (d ? { ...d, overrides: {} } : d));
  };
  const setPersona = (id: number | null) => {
    setDraft((d) => (d ? { ...d, persona_id: id } : d));
  };
  const setModel = (m: string) => {
    setDraft((d) => (d ? { ...d, model: m } : d));
  };

  const onApply = () => {
    if (!draft || !dirty) return;
    apply.mutate(draft);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/55 data-[state=open]:animate-[axo-fade-in_200ms_ease-out] data-[state=closed]:animate-[axo-fade-out_180ms_ease-in]" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed right-0 top-0 z-50 flex h-dvh w-[min(94vw,26rem)] flex-col border-l-2 border-border bg-card shadow-[-4px_0_0_0_var(--border)] data-[state=open]:animate-[axo-slide-in-right_200ms_ease-out] data-[state=closed]:animate-[axo-slide-out-right_180ms_ease-in] focus:outline-none"
        >
          <div className="flex items-center justify-between border-b-2 border-border px-4 py-3">
            <Dialog.Title asChild>
              <h2 className="font-display text-lg font-bold">
                Chat <span className="italic">controls</span>
              </h2>
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="text-muted-foreground transition-colors hover:text-destructive"
              >
                <X className="size-5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-5">
            <PersonaSection
              personas={personasQuery.data ?? []}
              selected={draft?.persona_id ?? null}
              onChange={setPersona}
              disabled={!draft}
            />

            <ModelSection
              value={draft?.model ?? ""}
              onChange={setModel}
              disabled={!draft}
            />

            <ReasoningSection
              value={thinkingChoice(draft?.overrides.enable_thinking)}
              userDefault={userDefaults.enable_thinking}
              onChange={(choice) => {
                if (choice === "inherit") clearOverride("enable_thinking");
                else setOverride("enable_thinking", choice === "on");
              }}
              disabled={!draft}
            />

            <section className="mt-8 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-pixel text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  Sampling
                </h3>
                <button
                  type="button"
                  onClick={resetAll}
                  disabled={!draft || Object.keys(draft.overrides).length === 0}
                  className="inline-flex items-center gap-1 font-pixel text-[10px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
                >
                  <RotateCcw className="size-3" />
                  Reset
                </button>
              </div>
              <div className="space-y-5">
                {SAMPLING_FIELDS.map((field) => {
                  const userValue = userDefaults[field.key];
                  const hasUserOverride =
                    typeof userValue === "number" && !Number.isNaN(userValue);
                  return (
                    <ParamSlider
                      key={field.key}
                      field={field}
                      value={(draft?.overrides[field.key] as number | undefined) ?? null}
                      onChange={(v) => setOverride(field.key, v)}
                      onClear={() => clearOverride(field.key)}
                      defaultValue={
                        hasUserOverride
                          ? (userValue as number)
                          : (SAMPLING_DEFAULTS[field.key] as number)
                      }
                      defaultLabel={hasUserOverride ? "your default" : "server"}
                      disabled={!draft}
                    />
                  );
                })}
              </div>
              <p className="pt-1 text-[11px] leading-relaxed text-muted-foreground">
                Overrides apply to this session only.{" "}
                <Link
                  href="/settings/model"
                  className="underline underline-offset-2"
                  onClick={() => onOpenChange(false)}
                >
                  Edit your defaults →
                </Link>
              </p>
            </section>

            <section className="mt-8 space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="font-pixel text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  Tools
                </h3>
                <span className="border-2 border-border bg-background px-1.5 py-0.5 font-pixel text-[9px] uppercase tracking-widest text-muted-foreground">
                  user-level
                </span>
              </div>
              <ToolsList compact />
            </section>
          </div>

          <div className="flex items-center justify-between gap-3 border-t-2 border-border px-4 py-3">
            <span className="font-pixel text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              ⌘, to toggle
            </span>
            <button
              type="button"
              onClick={onApply}
              disabled={!dirty || apply.isPending}
              className={cn(
                "inline-flex items-center gap-2 border-2 border-border bg-primary px-4 py-2 text-xs font-pixel uppercase tracking-[0.14em] text-primary-foreground",
                "shadow-[2px_2px_0_0_var(--lime)] transition-[transform,box-shadow] duration-100",
                "hover:shadow-[3px_3px_0_0_var(--lime)]",
                "active:translate-x-[1px] active:translate-y-[1px] active:shadow-none",
                "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none",
              )}
            >
              <Save className="size-3.5" />
              {apply.isPending ? "Applying…" : "Apply"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// -----------------------------------------------------------------------------
// Sub-sections
// -----------------------------------------------------------------------------
function PersonaSection({
  personas,
  selected,
  onChange,
  disabled,
}: {
  personas: PersonaPublic[];
  selected: number | null;
  onChange: (id: number | null) => void;
  disabled?: boolean;
}) {
  return (
    <section className="space-y-3">
      <h3 className="font-pixel text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        Persona
      </h3>
      <div className="space-y-1.5">
        <button
          type="button"
          onClick={() => onChange(null)}
          disabled={disabled}
          className={cn(
            "flex w-full items-center gap-3 border-2 px-3 py-2 text-left text-sm",
            selected === null
              ? "border-border bg-card shadow-[2px_2px_0_0_var(--lime)]"
              : "border-border bg-card/60 hover:shadow-[2px_2px_0_0_var(--border)]",
            "disabled:cursor-not-allowed disabled:opacity-60",
          )}
        >
          <span
            aria-hidden
            className={cn(
              "size-2 shrink-0 border-2 border-border",
              selected === null ? "bg-[color:var(--lime)]" : "bg-background",
            )}
          />
          <span className="flex-1 truncate">None</span>
        </button>
        {personas.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange(p.id)}
            disabled={disabled}
            className={cn(
              "flex w-full items-center gap-3 border-2 px-3 py-2 text-left text-sm",
              selected === p.id
                ? "border-border bg-card shadow-[2px_2px_0_0_var(--lime)]"
                : "border-border bg-card/60 hover:shadow-[2px_2px_0_0_var(--border)]",
              "disabled:cursor-not-allowed disabled:opacity-60",
            )}
          >
            <IdCard className="size-4 shrink-0 text-muted-foreground" />
            <span className="flex-1 truncate">{p.name}</span>
            {p.is_builtin && (
              <span className="border-2 border-border bg-background px-1.5 py-0.5 font-pixel text-[9px] uppercase tracking-widest text-muted-foreground">
                built-in
              </span>
            )}
          </button>
        ))}
      </div>
    </section>
  );
}

function ModelSection({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  return (
    <section className="mt-8 space-y-3">
      <h3 className="font-pixel text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        Model
      </h3>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="server default"
        disabled={disabled}
        className="w-full border-2 border-border bg-card px-3 py-2 text-sm outline-none transition-[box-shadow] duration-100 focus:shadow-[2px_2px_0_0_var(--lime)] placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60"
      />
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Blank = whatever vLLM is serving. Override per session if you point at
        a second model.
      </p>
    </section>
  );
}

function ReasoningSection({
  value,
  userDefault,
  onChange,
  disabled,
}: {
  value: ThinkingChoice;
  userDefault: boolean | null | undefined;
  onChange: (next: ThinkingChoice) => void;
  disabled?: boolean;
}) {
  const inheritText =
    userDefault === true
      ? "inherit · on"
      : userDefault === false
        ? "inherit · off"
        : `inherit · ${SAMPLING_DEFAULTS.enable_thinking ? "on" : "off"} (server)`;

  const OPTS: { value: ThinkingChoice; label: string }[] = [
    { value: "on", label: "On" },
    { value: "off", label: "Off" },
    { value: "inherit", label: inheritText },
  ];

  return (
    <section className="mt-8 space-y-3">
      <h3 className="font-pixel text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        Reasoning
      </h3>
      <div className="flex flex-col gap-1.5">
        {OPTS.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              disabled={disabled}
              className={cn(
                "flex items-center gap-3 border-2 px-3 py-2 text-left text-sm",
                active
                  ? "border-border bg-card shadow-[2px_2px_0_0_var(--lime)]"
                  : "border-border bg-card/60 hover:shadow-[2px_2px_0_0_var(--border)]",
                "disabled:cursor-not-allowed disabled:opacity-60",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "size-2 shrink-0 border-2 border-border",
                  active ? "bg-[color:var(--lime)]" : "bg-background",
                )}
              />
              <span className="flex-1 truncate font-pixel text-[12px] uppercase tracking-[0.12em]">
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
