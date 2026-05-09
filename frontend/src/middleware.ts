import NextAuth from "next-auth";

import { authConfig } from "@/auth.config";

export const { auth: middleware } = NextAuth(authConfig);

export default middleware;

// PWA assets (manifest, icons, the Serwist-generated service worker) and
// Next's static output bypass the auth middleware — they're public by
// design and shouldn't be redirected to /login.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|favicon\\.svg|icon\\.svg|icon-maskable\\.svg|manifest\\.json|sw\\.js|swe-worker-.*\\.js|workbox-.*\\.js|.*\\.png$).*)",
  ],
};
