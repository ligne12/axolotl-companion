import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Serwist compiles the service worker from src/app/sw.ts and emits it to
// public/sw.js (gitignored). Disabled in dev so HMR isn't shadowed by a
// stale precache; enabled in prod / production-mode `make dev` builds so
// the PWA is installable.
const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  // ``cacheOnNavigation`` would re-cache every page on visit — we want
  // navigations to always hit the network so middleware + Auth.js can
  // arbitrate against the current JWT secret (see sw.ts for the loop
  // story).
  cacheOnNavigation: false,
  reloadOnOnline: true,
});

/**
 * Content-Security-Policy.
 *
 * The chrome is server-rendered + same-origin for both the API
 * (``/api/*`` is proxied to FastAPI) and the SSE stream, so the policy
 * stays tight:
 *
 *   - ``script-src 'self' 'unsafe-inline'`` — Next.js 15 streams RSC
 *     hydration data + bootstrap scripts inline (``<script>foo</script>``
 *     with literal content). Strict-CSP with a per-request nonce would
 *     require a middleware that defeats static caching; the trade-off
 *     isn't worth it here because ``default-src 'self'`` already blocks
 *     every cross-origin script load. The dev fork keeps ``'unsafe-eval'``
 *     for HMR.
 *   - ``style-src 'self' 'unsafe-inline'`` — Tailwind + Radix UI both
 *     inject inline ``<style>`` blocks; Google Fonts + Fontshare each
 *     serve a stylesheet from their CDN.
 *   - ``img-src`` covers our own assets, MCP-returned ``data:`` images
 *     (``MCPToolCard``), and the user-uploaded avatar URLs.
 *   - ``connect-src`` is same-origin (the chat SSE) plus the runtime
 *     config endpoint — backend is reached via the same hostname.
 *   - ``font-src`` Google Fonts + Fontshare CDN + ``data:`` for the
 *     pixel font's inlined woff2.
 *   - ``frame-ancestors 'none'`` doubles up with ``X-Frame-Options:
 *     DENY``.
 *   - ``worker-src 'self' blob:`` — Serwist registers the service
 *     worker via ``blob:`` in dev, ``/sw.js`` in prod.
 */
const CSP_DIRECTIVES: Record<string, string[]> = {
  "default-src": ["'self'"],
  "script-src":
    process.env.NODE_ENV === "production"
      ? ["'self'", "'unsafe-inline'"]
      : ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
  "style-src": [
    "'self'",
    "'unsafe-inline'",
    "https://fonts.googleapis.com",
    "https://api.fontshare.com",
  ],
  "img-src": ["'self'", "data:", "blob:", "https:"],
  "font-src": ["'self'", "data:", "https://fonts.gstatic.com", "https://cdn.fontshare.com"],
  // 'self' + blob: (Three.js GLTFLoader fetches embedded textures via blob: URLs)
  // + data: (small inline textures); localhost:8001 in dev for the FastAPI
  // backend when running `npm run dev` outside the Caddy reverse proxy.
  "connect-src":
    process.env.NODE_ENV === "production"
      ? ["'self'", "blob:", "data:"]
      : ["'self'", "blob:", "data:", "http://localhost:8001", "ws://localhost:*"],
  "worker-src": ["'self'", "blob:"],
  "frame-ancestors": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
  "object-src": ["'none'"],
  "upgrade-insecure-requests": [],
};

const CSP_HEADER = Object.entries(CSP_DIRECTIVES)
  .map(([k, v]) => (v.length ? `${k} ${v.join(" ")}` : k))
  .join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: "standalone",
  experimental: {
    reactCompiler: false,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "Content-Security-Policy", value: CSP_HEADER },
        ],
      },
      {
        // Service worker must be served with no caching so a new build
        // takes effect on next page load.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default withSerwist(withNextIntl(nextConfig));
