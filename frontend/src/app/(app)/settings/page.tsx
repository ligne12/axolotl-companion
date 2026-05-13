"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useApi } from "@/hooks/use-api";
import { useHaptic } from "@/hooks/use-haptic";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { UserPublic } from "@/types/api";

const INPUT =
  "w-full border-2 border-border bg-card px-3 py-2.5 text-sm outline-none transition-[box-shadow] duration-100 focus:shadow-[3px_3px_0_0_var(--lime)] placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60";

const LABEL = "block text-xs font-semibold uppercase tracking-wider";

type TimeFormat = "12h" | "24h";
type TemperatureUnit = "C" | "F";

type ProfileFields = {
  username: string;
  locality: string;
  time_format: TimeFormat;
  temperature_unit: TemperatureUnit;
};

/** Small 2-option segmented control, DA-styled. Same pattern as the ThemeToggle. */
function Segmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (next: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="border-border bg-card inline-flex items-center border-2 p-0.5"
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "font-pixel inline-flex min-w-[3rem] items-center justify-center px-3 py-1.5 text-[12px] tracking-[0.14em] uppercase transition-colors",
              active
                ? "bg-[color:var(--lime)] text-[color:var(--lime-foreground)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default function ProfilePage() {
  const api = useApi();
  const qc = useQueryClient();
  const t = useTranslations("profile");
  const tc = useTranslations("common");

  const meQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => api<UserPublic>("/auth/me"),
  });

  const [form, setForm] = useState<ProfileFields>({
    username: "",
    locality: "",
    time_format: "24h",
    temperature_unit: "C",
  });
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (meQuery.data) {
      setForm({
        username: meQuery.data.username ?? "",
        locality: meQuery.data.locality ?? "",
        time_format: (meQuery.data.time_format ?? "24h") as TimeFormat,
        temperature_unit: (meQuery.data.temperature_unit ?? "C") as TemperatureUnit,
      });
      setDirty(false);
    }
  }, [meQuery.data]);

  const haptic = useHaptic();
  const save = useMutation({
    mutationFn: (body: Partial<ProfileFields>) =>
      api<UserPublic>("/auth/me", { method: "PATCH", body }),
    onSuccess: (next) => {
      qc.setQueryData<UserPublic>(["auth", "me"], next);
      setDirty(false);
      haptic("success");
      toast.success(t("toasts.saved"));
    },
    onError: (err: unknown) => {
      haptic("error");
      const msg =
        err instanceof ApiError && err.status === 409
          ? t("toasts.errUsername")
          : t("toasts.errSave");
      toast.error(msg);
    },
  });

  const update = (patch: Partial<ProfileFields>) => {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!meQuery.data || !dirty) return;
    const body: Partial<ProfileFields> = {};
    if (form.username !== meQuery.data.username) body.username = form.username.trim();
    if ((form.locality ?? "") !== (meQuery.data.locality ?? "")) {
      body.locality = form.locality.trim();
    }
    if (form.time_format !== meQuery.data.time_format) body.time_format = form.time_format;
    if (form.temperature_unit !== meQuery.data.temperature_unit) {
      body.temperature_unit = form.temperature_unit;
    }
    if (Object.keys(body).length === 0) return;
    save.mutate(body);
  };

  return (
    <form onSubmit={onSubmit} className="relative space-y-8">
      <header className="space-y-2">
        <h1 className="font-display text-3xl leading-tight font-bold">
          {t.rich("title", {
            em: (chunks) => <span className="italic">{chunks}</span>,
          })}
        </h1>
        <p className="text-muted-foreground text-sm">{t("intro")}</p>
      </header>

      <div className="space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="username" className={LABEL}>
            {t("username")}
          </label>
          <input
            id="username"
            className={cn(INPUT, "max-w-sm")}
            value={form.username}
            onChange={(e) => update({ username: e.target.value })}
            minLength={3}
            maxLength={50}
            pattern="[a-zA-Z0-9_\-]+"
            required
            disabled={meQuery.isPending}
          />
          <p className="text-muted-foreground text-xs">
            {t.rich("usernameHelp", {
              code: (chunks) => <code>{chunks}</code>,
            })}
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="email" className={LABEL}>
            {t("email")}
          </label>
          <input
            id="email"
            className={cn(INPUT, "max-w-sm")}
            value={meQuery.data?.email ?? ""}
            disabled
            readOnly
          />
          <p className="text-muted-foreground text-xs">{t("emailHelp")}</p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="locality" className={LABEL}>
            {t("locality")}
          </label>
          <input
            id="locality"
            className={cn(INPUT, "max-w-sm")}
            value={form.locality}
            onChange={(e) => update({ locality: e.target.value })}
            maxLength={80}
            placeholder="Montpellier"
            disabled={meQuery.isPending}
          />
          <p className="text-muted-foreground text-xs">
            {t.rich("localityHelp", {
              code: (chunks) => <code>{chunks}</code>,
            })}
          </p>
        </div>

        <div className="space-y-1.5">
          <div className={LABEL}>{t("timeFormat")}</div>
          <Segmented
            ariaLabel={t("timeFormat")}
            value={form.time_format}
            onChange={(v) => update({ time_format: v })}
            options={[
              { value: "24h", label: "24h" },
              { value: "12h", label: "AM / PM" },
            ]}
          />
          <p className="text-muted-foreground text-xs">{t("timeFormatHelp")}</p>
        </div>

        <div className="space-y-1.5">
          <div className={LABEL}>{t("temperature")}</div>
          <Segmented
            ariaLabel={t("temperature")}
            value={form.temperature_unit}
            onChange={(v) => update({ temperature_unit: v })}
            options={[
              { value: "C", label: "°C" },
              { value: "F", label: "°F" },
            ]}
          />
          <p className="text-muted-foreground text-xs">{t("temperatureHelp")}</p>
        </div>
      </div>

      {dirty && (
        <div
          className={cn(
            // Mobile: full-width, sticky at bottom of the scroll container
            // so it stays in reach while filling the form. Desktop: inline,
            // right-aligned under the input column.
            "border-border bg-background sticky bottom-0 -mx-4 flex justify-stretch border-t-2 px-4 py-3 md:static md:mx-0 md:max-w-sm md:justify-end md:border-0 md:bg-transparent md:p-0 md:pt-2",
          )}
        >
          <button
            type="submit"
            disabled={save.isPending}
            className={cn(
              "border-border bg-primary text-primary-foreground inline-flex w-full items-center justify-center gap-2 border-2 px-5 py-2.5 text-sm font-semibold md:w-auto",
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
            {save.isPending ? tc("saving") : tc("saveChanges")}
          </button>
        </div>
      )}
    </form>
  );
}
