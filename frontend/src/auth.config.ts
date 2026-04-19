/**
 * Edge-safe subset of the Auth.js config.
 *
 * The full config (including the DB/fetch calls of the Credentials provider)
 * lives in ``auth.ts``. This file is imported by ``middleware.ts`` which runs
 * in the Edge runtime and cannot execute Node-only code.
 */

import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = Boolean(auth?.user);
      const { pathname } = request.nextUrl;

      const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register");
      const isPublic = pathname === "/" || pathname.startsWith("/_next") || pathname.startsWith("/api/auth");

      if (isAuthPage) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/chat", request.nextUrl));
        }
        return true;
      }

      if (isPublic) return true;

      return isLoggedIn;
    },
  },
} satisfies NextAuthConfig;
