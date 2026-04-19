/**
 * Typed fetch wrapper for the Axolotl API (FastAPI backend).
 *
 * Handles auth header injection, JSON (de)serialisation and consistent error
 * shape. Use with Auth.js session on the server side; on the client side the
 * token is forwarded via the fetch call.
 */

import { API_BASE } from "@/lib/utils";

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown, message?: string) {
    super(message ?? `API error ${status}`);
    this.status = status;
    this.body = body;
  }
}

type ApiRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
  headers?: Record<string, string>;
};

export async function apiFetch<T>(path: string, opts: ApiRequestOptions = {}): Promise<T> {
  const { method = "GET", body, token, signal, headers = {} } = opts;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    signal,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const detail =
      data && typeof data === "object" && "detail" in data
        ? String((data as { detail: unknown }).detail)
        : res.statusText;
    throw new ApiError(res.status, data, detail);
  }

  return data as T;
}
