/// <reference lib="webworker" />

/**
 * Service worker — Serwist v9 (App Router convention).
 *
 * Strategy:
 *  - Precache the Next.js build manifest emitted via __SW_MANIFEST.
 *  - Use Serwist's defaultCache for static assets (Google Fonts, images,
 *    JS/CSS chunks) — sane NetworkFirst / CacheFirst defaults.
 *  - Bypass the cache entirely for /api/* — auth tokens, SSE streams and
 *    chat data must always hit the backend.
 *  - skipWaiting + clientsClaim so a new build takes effect on the next
 *    page load without a hard refresh.
 *
 * Built with `make dev` via the @serwist/next wrapper (next.config.ts).
 */

import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import { NetworkOnly, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const apiBypass: RuntimeCaching = {
  matcher: ({ url }) => url.pathname.startsWith("/api/"),
  handler: new NetworkOnly(),
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [apiBypass, ...defaultCache],
});

serwist.addEventListeners();
