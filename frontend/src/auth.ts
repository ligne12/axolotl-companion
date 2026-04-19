/**
 * Auth.js v5 — Credentials provider calling the FastAPI backend.
 *
 * On login the provider hits ``POST /auth/login`` and stores the access +
 * refresh tokens in the encrypted session JWT so the browser never sees them
 * in plain text.
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
      if (user) {
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        token.accessTokenExpiresAt = user.accessTokenExpiresAt;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.accessToken && typeof token.accessToken === "string") {
        session.accessToken = token.accessToken;
      }
      if (token.refreshToken && typeof token.refreshToken === "string") {
        session.refreshToken = token.refreshToken;
      }
      return session;
    },
  },
});
