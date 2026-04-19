"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Suspense, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    <Card className="w-full max-w-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Welcome back</CardTitle>
        <CardDescription>Sign in to chat with your axolotl.</CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input id="username" name="username" autoComplete="username" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign in"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            No account?{" "}
            <Link href="/register" className="text-primary underline-offset-4 hover:underline">
              Create one
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
