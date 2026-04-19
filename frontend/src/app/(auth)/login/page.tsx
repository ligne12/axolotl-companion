"use client";

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
      toast.error("Invalid credentials");
      return;
    }
    router.push(callback);
    router.refresh();
  }

  return (
    <div className="relative w-full max-w-sm border-2 border-border bg-card p-6 shadow-[4px_4px_0_0_var(--border)]">
      <div className="mb-6 space-y-1">
        <div className="inline-flex items-center gap-2 border-2 border-border bg-background px-2.5 py-1 font-pixel text-[12px] uppercase tracking-[0.14em]">
          <span className="size-2 bg-[color:var(--lime)]" />
          Sign in
        </div>
        <h1 className="font-display text-3xl font-bold leading-tight">
          Welcome <span className="italic">back</span>.
        </h1>
        <p className="text-sm text-muted-foreground">
          Sign in to chat with your axolotl.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="username" className="block text-xs font-semibold uppercase tracking-wider">
            Username
          </label>
          <input
            id="username"
            name="username"
            autoComplete="username"
            required
            className={INPUT}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider">
            Password
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
          {submitting ? "Signing in..." : "Sign in"}
        </button>

        <p className="text-center text-sm text-muted-foreground">
          No account?{" "}
          <Link href="/register" className="font-medium text-foreground underline underline-offset-4">
            Create one
          </Link>
        </p>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background p-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 select-none opacity-[0.04]"
        style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Ctext x='12' y='44' font-size='36'%3E🪷%3C/text%3E%3C/svg%3E\")",
          backgroundSize: "120px 120px",
        }}
      />
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
