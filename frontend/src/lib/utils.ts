import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Base URL for the Axolotl API.
 *
 * - **Server-side** (RSC, route handlers, Auth.js ``authorize()``) runs inside
 *   the Next.js container and must reach the backend through the Docker network
 *   (``http://backend:8001``). Exposed via ``INTERNAL_API_URL``.
 * - **Client-side** (browser) hits the backend through the host-forwarded port
 *   (``http://localhost:8001``), set via ``NEXT_PUBLIC_API_URL``.
 */
export const API_BASE =
  typeof window === "undefined"
    ? (process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://backend:8001")
    : (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001");

/** Format a millisecond duration like "340ms", "2.4s", or "1m 12s". */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(seconds < 10 ? 1 : 0)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds - m * 60);
  return `${m}m ${s}s`;
}
