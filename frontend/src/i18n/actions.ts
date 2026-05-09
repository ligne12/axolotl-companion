"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { isLocale, LOCALE_COOKIE } from "./config";

/**
 * Persist the user's preferred locale and revalidate so the next render
 * picks up the new ``messages/<code>.json``. Called from the locale
 * switcher in the user menu.
 */
export async function setLocale(value: string) {
  if (!isLocale(value)) return;
  const store = await cookies();
  store.set(LOCALE_COOKIE, value, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}
