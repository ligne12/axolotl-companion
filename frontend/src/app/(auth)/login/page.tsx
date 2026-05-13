"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Suspense, useState } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

const INPUT =
  "w-full border-2 border-border bg-card px-3 py-2.5 text-sm outline-none transition-[box-shadow] duration-100 focus:shadow-[3px_3px_0_0_var(--lime)] placeholder:text-muted-foreground";

const PRIMARY =
  "inline-flex w-full items-center justify-center gap-2 border-2 border-border bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-[3px_3px_0_0_var(--lime)] transition-[transform,box-shadow] duration-100 hover:shadow-[4px_4px_0_0_var(--lime)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_0_var(--lime)] disabled:cursor-not-allowed disabled:opacity-60";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callback = params.get("callbackUrl") ?? "/home";
  const t = useTranslations("auth");

  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const username = String(data.get("username") ?? "").trim();
    const password = String(data.get("password") ?? "");

    setSubmitting(true);
    const res = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });
    setSubmitting(false);

    if (!res || res.error) {
      toast.error(t("errInvalid"));
      return;
    }
    router.push(callback);
    router.refresh();
  }

  return (
    <div className="border-border bg-card relative w-full max-w-sm border-2 p-6 shadow-[4px_4px_0_0_var(--border)]">
      <div className="mb-6 space-y-1">
        <div className="border-border bg-background font-pixel inline-flex items-center gap-2 border-2 px-2.5 py-1 text-[12px] tracking-[0.14em] uppercase">
          <span className="size-2 bg-[color:var(--lime)]" />
          {t("tagSignIn")}
        </div>
        <h1 className="font-display text-3xl leading-tight font-bold">
          {t.rich("loginTitle", {
            em: (chunks) => <span className="italic">{chunks}</span>,
          })}
        </h1>
        <p className="text-muted-foreground text-sm">{t("loginIntro")}</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="username"
            className="block text-xs font-semibold tracking-wider uppercase"
          >
            {t("username")}
          </label>
          <input id="username" name="username" autoComplete="username" required className={INPUT} />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="block text-xs font-semibold tracking-wider uppercase"
          >
            {t("password")}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className={INPUT}
          />
        </div>

        <button type="submit" disabled={submitting} className={cn(PRIMARY, "mt-2")}>
          {submitting ? t("signingIn") : t("signIn")}
        </button>

        <p className="text-muted-foreground text-center text-sm">
          {t("noAccount")}{" "}
          <Link
            href="/register"
            className="text-foreground font-medium underline underline-offset-4"
          >
            {t("createOne")}
          </Link>
        </p>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-dvh items-center justify-center p-4">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
