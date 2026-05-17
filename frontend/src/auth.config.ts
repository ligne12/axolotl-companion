/**
 * Edge-safe subset of the Auth.js config.
 *
 * The full config (including the DB/fetch calls of the Credentials provider)
 * lives in ``auth.ts``. This file is imported by ``middleware.ts`` which runs
 * in the Edge runtime and cannot execute Node-only code.
 */

import type { NextAuthConfig } from "next-auth";
import { NextResponse } from "next/server";

/**
 * Auth.js v5 cookie names — both the dev (``authjs.``) and prod
 * (``__Secure-authjs.``) variants. We delete both on every
 * cookie-clearing redirect so the cleanup also works for users
 * jumping between localhost and the public HTTPS host.
 */
const SESSION_COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "authjs.csrf-token",
  "__Host-authjs.csrf-token",
  "authjs.callback-url",
  "__Secure-authjs.callback-url",
];

/**
 * Build a redirect ``NextResponse`` that ALSO clears every NextAuth
 * cookie on its way out. Used whenever the session is unrecoverable
 * (refresh failed, JWT no longer decryptable, etc.) — without this,
 * the broken cookie survives the redirect and the next navigation
 * re-enters the same error path, looping forever until the user
 * clears their browser storage by hand.
 */
function redirectAndClearSession(url: URL): NextResponse {
  const response = NextResponse.redirect(url);
  for (const name of SESSION_COOKIE_NAMES) {
    response.cookies.delete(name);
  }
  return response;
}

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const hasError = auth?.error === "RefreshAccessTokenError";
      const isLoggedIn = Boolean(auth?.user) && !hasError;
      const { pathname } = request.nextUrl;

      const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register");
      const isPublic =
        pathname === "/" || pathname.startsWith("/_next") || pathname.startsWith("/api/auth");

      // Recovery path : a session whose refresh token died (typical
      // after a rebuild that rotated ``FERNET_KEY`` or invalidated
      // stored refresh tokens). Redirect to /login AND nuke the
      // corrupted cookies in the same response so the next navigation
      // sees a clean slate. Without the cookie wipe the /home → /login
      // → /home bounce loops indefinitely.
      if (hasError) {
        const target = new URL("/login?expired=1", request.nextUrl);
        return redirectAndClearSession(target);
      }

      if (isAuthPage) {
        if (isLoggedIn) {
          return NextResponse.redirect(new URL("/home", request.nextUrl));
        }
        return true;
      }

      if (isPublic) return true;

      return isLoggedIn;
    },
  },
} satisfies NextAuthConfig;
