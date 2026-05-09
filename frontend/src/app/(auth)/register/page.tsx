"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";

import { ApiError, apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { UserPublic } from "@/types/api";

const INPUT =
  "w-full border-2 border-border bg-card px-3 py-2.5 text-sm outline-none transition-[box-shadow] duration-100 focus:shadow-[3px_3px_0_0_var(--lime)] placeholder:text-muted-foreground";

const PRIMARY =
  "inline-flex w-full items-center justify-center gap-2 border-2 border-border bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-[3px_3px_0_0_var(--lime)] transition-[transform,box-shadow] duration-100 hover:shadow-[4px_4px_0_0_var(--lime)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_0_var(--lime)] disabled:cursor-not-allowed disabled:opacity-60";

export default function RegisterPage() {
  const router = useRouter();
  const t = useTranslations("auth");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const username = String(data.get("username") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");

    setSubmitting(true);
    try {
      await apiFetch<UserPublic>("/auth/register", {
        method: "POST",
        body: { username, email, password },
      });
      const res = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });
      if (!res || res.error) {
        throw new Error("auto-login failed");
      }
      toast.success(t("welcome"));
      router.push("/home");
      router.refresh();
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError && err.status === 409
          ? t("errExists")
          : t("errRegister");
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center p-4">
      <div className="relative w-full max-w-sm border-2 border-border bg-card p-6 shadow-[4px_4px_0_0_var(--border)]">
        <div className="mb-6 space-y-1">
          <div className="inline-flex items-center gap-2 border-2 border-border bg-background px-2.5 py-1 font-pixel text-[12px] uppercase tracking-[0.14em]">
            <span className="size-2 bg-[color:var(--lime)]" />
            {t("tagRegister")}
          </div>
          <h1 className="font-display text-3xl font-bold leading-tight">
            {t.rich("registerTitle", {
              em: (chunks) => <span className="italic">{chunks}</span>,
            })}
          </h1>
          <p className="text-sm text-muted-foreground">{t("registerIntro")}</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="username" className="block text-xs font-semibold uppercase tracking-wider">
              {t("username")}
            </label>
            <input
              id="username"
              name="username"
              autoComplete="username"
              minLength={3}
              maxLength={50}
              pattern="[a-zA-Z0-9_\-]+"
              required
              className={INPUT}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider">
              {t("email")}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className={INPUT}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider">
              {t("password")}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              className={INPUT}
            />
          </div>

          <button type="submit" disabled={submitting} className={cn(PRIMARY, "mt-2")}>
            {submitting ? t("creating") : t("createAccount")}
          </button>

          <p className="text-center text-sm text-muted-foreground">
            {t("haveAccount")}{" "}
            <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
              {t("signIn")}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
