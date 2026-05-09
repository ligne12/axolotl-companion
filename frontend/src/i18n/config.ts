/**
 * Single source of truth for the locale roster.
 *
 * Used by both ``request.ts`` (server-side message resolution) and the
 * ``LocaleSwitcher`` UI. Add a locale here and it shows up in the menu —
 * but you also need to ship the matching ``messages/<code>.json``.
 */

export const LOCALES = ["fr", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "fr";

export const LOCALE_COOKIE = "axo-locale";

/** Human label for each locale, displayed in the switcher. */
export const LOCALE_LABELS: Record<Locale, string> = {
  fr: "Français",
  en: "English",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}
