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
    ? (process.env.INTERNAL_API_URL ??
      process.env.NEXT_PUBLIC_API_URL ??
      "http://backend:8001")
    : (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001");
