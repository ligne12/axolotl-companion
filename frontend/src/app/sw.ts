/// <reference lib="webworker" />

/**
 * Service worker — Serwist v9 (App Router convention).
 *
 * Strategy:
 *  - Precache only immutable, hash-keyed assets (``/_next/static/*``,
 *    icons, fonts). HTML / page shells are deliberately *not*
 *    precached — they encode auth-driven redirects, and a stale
 *    precache trapped users in a navigation loop after every rebuild
 *    until they nuked the browser cache. Live navigations always go
 *    to the network so middleware + Auth.js can arbitrate against the
 *    current JWT secret.
 *  - ``/api/*`` is NetworkOnly (auth, SSE, chat data — never cache).
 *  - Everything else falls through to Serwist's defaultCache (Google
 *    Fonts, images, JS / CSS chunks).
 *  - skipWaiting + clientsClaim so a new build takes over on the next
 *    page load without a hard refresh; Serwist's PrecacheController
 *    cleans outdated precaches on activation.
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

/**
 * Keep precache to immutable assets only. HTML pages — including the
 * App Router's page shells — get filtered out so auth-aware navigation
 * never serves a stale redirect chain.
 */
const precacheEntries = (self.__SW_MANIFEST ?? []).filter((entry) => {
  const url = typeof entry === "string" ? entry : entry.url;
  return (
    url.startsWith("/_next/static/") ||
    url.startsWith("/icons/") ||
    /\.(?:png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|otf)$/i.test(url)
  );
});

const apiBypass: RuntimeCaching = {
  matcher: ({ url }) => url.pathname.startsWith("/api/"),
  handler: new NetworkOnly(),
};

/**
 * Page navigations always hit the network. Without this, a stale SW
 * could serve a cached redirect from before the last rebuild — the
 * exact loop we used to see when the JWT secret rotated between
 * deploys and every cached ``/home`` shell pointed back at ``/login``.
 */
const navigationOnly: RuntimeCaching = {
  matcher: ({ request }) => request.mode === "navigate",
  handler: new NetworkOnly(),
};

const serwist = new Serwist({
  precacheEntries,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [apiBypass, navigationOnly, ...defaultCache],
});

serwist.addEventListeners();
