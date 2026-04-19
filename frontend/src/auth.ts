/**
 * Auth.js v5 — Credentials provider calling the FastAPI backend.
 *
 * Access tokens are short-lived (15 min). The ``jwt`` callback refreshes
 * them silently using the refresh token when needed. Tokens are stored
 * inside the encrypted session JWT and never exposed to client JS in
 * plain text.
 */

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import { authConfig } from "@/auth.config";
import { apiFetch } from "@/lib/api";
import type { TokenPair, UserPublic } from "@/types/api";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

async function login(username: string, password: string) {
  const tokens = await apiFetch<TokenPair>("/auth/login", {
    method: "POST",
    body: { username, password },
  });
  const me = await apiFetch<UserPublic>("/auth/me", { token: tokens.access_token });
  return { tokens, user: me };
}

async function refreshAccessToken(refreshToken: string): Promise<TokenPair> {
  return apiFetch<TokenPair>("/auth/refresh", {
    method: "POST",
    body: { refresh_token: refreshToken },
  });
}

// Consider the token expired 60 s before its stated expiry so we don't race
// with the backend.
const REFRESH_SKEW_MS = 60_000;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        try {
          const { tokens, user } = await login(parsed.data.username, parsed.data.password);
          return {
            id: String(user.id),
            name: user.username,
            email: user.email,
            image: user.avatar_url,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            accessTokenExpiresAt: tokens.access_expires_at,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      // Initial sign-in
      if (user) {
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        token.accessTokenExpiresAt = user.accessTokenExpiresAt;
        return token;
      }

      // Silent refresh when the access token is about to expire
      if (
        typeof token.accessTokenExpiresAt === "string" &&
        typeof token.refreshToken === "string"
      ) {
        const expiresAt = new Date(token.accessTokenExpiresAt).getTime();
        if (Date.now() < expiresAt - REFRESH_SKEW_MS) {
          return token; // still valid
        }

        try {
          const fresh = await refreshAccessToken(token.refreshToken);
          token.accessToken = fresh.access_token;
          token.refreshToken = fresh.refresh_token;
          token.accessTokenExpiresAt = fresh.access_expires_at;
          delete token.error;
        } catch {
          token.error = "RefreshAccessTokenError";
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (typeof token.accessToken === "string") session.accessToken = token.accessToken;
      if (typeof token.refreshToken === "string") session.refreshToken = token.refreshToken;
      if (typeof token.error === "string") session.error = token.error;
      return session;
    },
  },
});
