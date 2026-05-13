"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, IdCard, RotateCcw, Save, X } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { ParamSlider } from "@/components/hyperparams/param-slider";
import { ToolsList } from "@/components/tools/tools-list";
import { useApi } from "@/hooks/use-api";
import { useHaptic } from "@/hooks/use-haptic";
import {
  hyperParamsEqual,
  pruneHyperParams,
  SAMPLING_DEFAULTS,
  SAMPLING_FIELDS,
} from "@/lib/hyperparams";
import { cn } from "@/lib/utils";
import type { HyperParams, PersonaPublic, SessionPublic, UserPublic } from "@/types/api";

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
 * On mobile the drawer can grow tall (8 sliders + persona list), so each
 * section is a collapsible <details> accordion. Frequently-tweaked sections
 * (persona, reasoning) open by default; the heavy ones (sampling, tools)
 * stay closed until the user taps in.
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
  const haptic = useHaptic();
  const t = useTranslations("chat.drawer");
  const tc = useTranslations("common");

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
      haptic("success");
      toast.success(t("savedToast"));
    },
    onError: () => {
      haptic("error");
      toast.error(t("errToast"));
    },
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
    haptic("tap");
    setDraft((d) => (d ? { ...d, overrides: {} } : d));
  };
  const setPersona = (id: number | null) => {
    haptic("tap");
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
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/55 data-[state=closed]:animate-[axo-fade-out_180ms_ease-in] data-[state=open]:animate-[axo-fade-in_200ms_ease-out]" />
        <Dialog.Content
          aria-describedby={undefined}
          className="border-border bg-card fixed top-0 right-0 z-50 flex h-dvh w-[min(94vw,26rem)] flex-col border-l-2 shadow-[-4px_0_0_0_var(--border)] focus:outline-none data-[state=closed]:animate-[axo-slide-out-right_180ms_ease-in] data-[state=open]:animate-[axo-slide-in-right_200ms_ease-out]"
        >
          <div className="border-border flex items-center justify-between border-b-2 px-4 py-3">
            <Dialog.Title asChild>
              <h2 className="font-display text-lg font-bold">
                {t.rich("title", {
                  em: (chunks) => <span className="italic">{chunks}</span>,
                })}
              </h2>
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label={tc("close")}
                className="text-muted-foreground hover:text-destructive inline-flex size-9 items-center justify-center transition-[transform,colors] duration-75 active:scale-90"
              >
                <X className="size-5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3">
            <DrawerSection title={t("personaSection")} defaultOpen>
              <PersonaList
                personas={personasQuery.data ?? []}
                selected={draft?.persona_id ?? null}
                onChange={setPersona}
                disabled={!draft}
              />
            </DrawerSection>

            <DrawerSection title={t("modelSection")}>
              <input
                type="text"
                value={draft?.model ?? ""}
                onChange={(e) => setModel(e.target.value)}
                placeholder={t("modelPlaceholder")}
                disabled={!draft}
                className="border-border bg-card placeholder:text-muted-foreground w-full border-2 px-3 py-2 text-sm transition-[box-shadow] duration-100 outline-none focus:shadow-[2px_2px_0_0_var(--lime)] disabled:cursor-not-allowed disabled:opacity-60"
              />
              <p className="text-muted-foreground mt-2 text-[11px] leading-relaxed">
                {t("modelHelp")}
              </p>
            </DrawerSection>

            <DrawerSection title={t("reasoningSection")} defaultOpen>
              <ReasoningRadios
                value={thinkingChoice(draft?.overrides.enable_thinking)}
                userDefault={userDefaults.enable_thinking}
                onChange={(choice) => {
                  haptic("tap");
                  if (choice === "inherit") clearOverride("enable_thinking");
                  else setOverride("enable_thinking", choice === "on");
                }}
                disabled={!draft}
              />
            </DrawerSection>

            <DrawerSection
              title={t("samplingSection")}
              action={
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    resetAll();
                  }}
                  disabled={!draft || Object.keys(draft.overrides).length === 0}
                  className="font-pixel text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-[10px] tracking-[0.14em] uppercase transition-colors disabled:opacity-40"
                >
                  <RotateCcw className="size-3" />
                  {t("reset")}
                </button>
              }
            >
              <div className="space-y-5">
                {SAMPLING_FIELDS.map((field) => {
                  const userValue = userDefaults[field.key];
                  const hasUserOverride = typeof userValue === "number" && !Number.isNaN(userValue);
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
                      defaultLabel={
                        hasUserOverride ? t("userDefaultLabel") : t("serverDefaultLabel")
                      }
                      disabled={!draft}
                    />
                  );
                })}
              </div>
              <p className="text-muted-foreground pt-3 text-[11px] leading-relaxed">
                {t("samplingHelp")}{" "}
                <Link
                  href="/settings/model"
                  className="underline underline-offset-2"
                  onClick={() => onOpenChange(false)}
                >
                  {t("editDefaults")}
                </Link>
              </p>
            </DrawerSection>

            <DrawerSection
              title={t("toolsSection")}
              badge={
                <span className="border-border bg-background font-pixel text-muted-foreground border-2 px-1.5 py-0.5 text-[9px] tracking-widest uppercase">
                  {t("toolsBadge")}
                </span>
              }
            >
              <ToolsList compact />
            </DrawerSection>
          </div>

          <div className="border-border flex items-center justify-between gap-3 border-t-2 px-4 py-3">
            <span className="font-pixel text-muted-foreground text-[10px] tracking-[0.14em] uppercase">
              {t("toggleHint")}
            </span>
            <button
              type="button"
              onClick={onApply}
              disabled={!dirty || apply.isPending}
              className={cn(
                "border-border bg-primary font-pixel text-primary-foreground inline-flex min-h-11 items-center gap-2 border-2 px-4 py-2 text-xs tracking-[0.14em] uppercase",
                "shadow-[2px_2px_0_0_var(--lime)] transition-[transform,box-shadow] duration-100",
                "hover:shadow-[3px_3px_0_0_var(--lime)]",
                "active:translate-x-[1px] active:translate-y-[1px] active:shadow-none",
                "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none",
              )}
            >
              <Save className="size-3.5" />
              {apply.isPending ? t("applying") : t("apply")}
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

/** Collapsible section, native <details> for free a11y + keyboard support. */
function DrawerSection({
  title,
  badge,
  action,
  defaultOpen = false,
  children,
}: {
  title: string;
  badge?: ReactNode;
  action?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="group border-border/30 border-b-2 py-3 first:pt-0 last:border-b-0"
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 select-none [&::-webkit-details-marker]:hidden">
        <ChevronRight className="text-muted-foreground size-4 shrink-0 transition-transform duration-150 group-open:rotate-90" />
        <h3 className="font-pixel text-muted-foreground flex-1 text-[12px] tracking-[0.14em] uppercase">
          {title}
        </h3>
        {badge}
        {action}
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

function PersonaList({
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
  const t = useTranslations("chat.drawer");
  return (
    <div className="space-y-1.5">
      <PersonaRow active={selected === null} onClick={() => onChange(null)} disabled={disabled}>
        <span
          aria-hidden
          className={cn(
            "border-border size-2 shrink-0 border-2",
            selected === null ? "bg-[color:var(--lime)]" : "bg-background",
          )}
        />
        <span className="flex-1 truncate">{t("personaNone")}</span>
      </PersonaRow>
      {personas.map((p) => (
        <PersonaRow
          key={p.id}
          active={selected === p.id}
          onClick={() => onChange(p.id)}
          disabled={disabled}
        >
          <IdCard className="text-muted-foreground size-4 shrink-0" />
          <span className="flex-1 truncate">{p.name}</span>
          {p.is_builtin && (
            <span className="border-border bg-background font-pixel text-muted-foreground border-2 px-1.5 py-0.5 text-[9px] tracking-widest uppercase">
              {t("personaBuiltIn")}
            </span>
          )}
        </PersonaRow>
      ))}
    </div>
  );
}

function PersonaRow({
  active,
  onClick,
  disabled,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex min-h-11 w-full items-center gap-3 border-2 px-3 py-2 text-left text-sm transition-transform duration-75 active:scale-[0.99]",
        active
          ? "border-border bg-card shadow-[2px_2px_0_0_var(--lime)]"
          : "border-border bg-card/60 hover:shadow-[2px_2px_0_0_var(--border)]",
        "disabled:cursor-not-allowed disabled:opacity-60",
      )}
    >
      {children}
    </button>
  );
}

function ReasoningRadios({
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
  const t = useTranslations("chat.drawer.reasoning");
  const inheritText =
    userDefault === true
      ? t("inheritOn")
      : userDefault === false
        ? t("inheritOff")
        : SAMPLING_DEFAULTS.enable_thinking
          ? t("inheritServerOn")
          : t("inheritServerOff");

  const OPTS: { value: ThinkingChoice; label: string }[] = [
    { value: "on", label: t("on") },
    { value: "off", label: t("off") },
    { value: "inherit", label: inheritText },
  ];

  return (
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
              "flex min-h-11 items-center gap-3 border-2 px-3 py-2 text-left text-sm transition-transform duration-75 active:scale-[0.99]",
              active
                ? "border-border bg-card shadow-[2px_2px_0_0_var(--lime)]"
                : "border-border bg-card/60 hover:shadow-[2px_2px_0_0_var(--border)]",
              "disabled:cursor-not-allowed disabled:opacity-60",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "border-border size-2 shrink-0 border-2",
                active ? "bg-[color:var(--lime)]" : "bg-background",
              )}
            />
            <span className="font-pixel flex-1 truncate text-[12px] tracking-[0.12em] uppercase">
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
