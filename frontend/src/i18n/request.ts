/**
 * next-intl server-side request config.
 *
 * The app is auth-gated and conversation URLs already carry UUIDs, so we
 * skip ``next-intl``'s URL-prefix routing and resolve the locale on the
 * server from a cookie (``axo-locale``), falling back to the
 * ``Accept-Language`` header on the very first visit.
 *
 * Wired through ``next.config.ts`` via ``createNextIntlPlugin('./src/i18n/request.ts')``.
 */

import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "./config";

function pickFromAcceptLanguage(header: string | null): Locale | null {
  if (!header) return null;
  // Cheap parse: only the first tag we recognise is enough — ranking by
  // q-value would be over-engineered for two locales.
  for (const tag of header.split(",")) {
    const code = tag.trim().split(/[-;]/)[0]?.toLowerCase();
    if (isLocale(code)) return code;
  }
  return null;
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value;

  let locale: Locale;
  if (isLocale(fromCookie)) {
    locale = fromCookie;
  } else {
    const headerStore = await headers();
    locale = pickFromAcceptLanguage(headerStore.get("accept-language")) ?? DEFAULT_LOCALE;
  }

  const messages = (await import(`../../messages/${locale}.json`)).default;
  return { locale, messages };
});
