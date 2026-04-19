"use client";

import { useSession } from "next-auth/react";
import { useCallback } from "react";

import { apiFetch } from "@/lib/api";

/** A fetch helper bound to the current session's access token. */
export function useApi() {
  const { data: session } = useSession();
  const token = session?.accessToken ?? null;

  return useCallback(
    function call<T>(
      path: string,
      opts: Parameters<typeof apiFetch>[1] = {},
    ): Promise<T> {
      return apiFetch<T>(path, { ...opts, token });
    },
    [token],
  );
}

export function useAccessToken(): string | null {
  const { data: session } = useSession();
  return session?.accessToken ?? null;
}
