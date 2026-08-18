import { match as matchLocale } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";
import { NextResponse, type NextRequest } from "next/server";

import { defaultLocale, locales, type Locale } from "./i18n/routing";

/**
 * Locale routing for all twelve locales — a hand-written replacement for
 * `next-intl/middleware`.
 *
 * WHY THIS EXISTS, AND WHY IT MUST STAY EDGE
 * ------------------------------------------
 * Next 16 renamed `middleware.ts` to `proxy.ts` and made the new name default
 * to the Node.js runtime; a `proxy` file may not declare a runtime of its own
 * (Next throws E1031). This app deploys to Cloudflare Workers through
 * @opennextjs/cloudflare, which supports EDGE middleware only and aborts the
 * build with "Node.js middleware is not currently supported". As `proxy.ts` the
 * Next build SUCCEEDED and only the deploy died — so production silently went on
 * serving an older bundle while every local check passed.
 *
 * The legacy `middleware` filename is still recognised (see isMiddlewareFile in
 * next/dist/build/utils.js) and still defaults to the edge runtime, which is
 * what the adapter needs. Do NOT rename this to `proxy.ts`, and do NOT add
 * `export const runtime` — an explicit "edge" is rejected here too, because the
 * guard that permits it is scoped to proxy files.
 *
 * `next-intl/middleware` itself could not simply be run under this name: on the
 * edge runtime it loads and executes but performs no rewriting, so every
 * unprefixed English URL 404s. The behaviour below was therefore derived from
 * the shipped Node implementation by probing it exhaustively — see
 * scripts/probe-locale-routing.mjs, which is the regression test for this file.
 *
 * THE BEHAVIOUR (localePrefix: "as-needed")
 * -----------------------------------------
 *   /group        -> rewrite to /en/group   (200, URL unchanged)
 *   /en/group     -> redirect 307 to /group (the default locale is never shown)
 *   /de/group     -> pass through           (200)
 *   /group        -> redirect 307 to /de/group when the reader prefers German
 *
 * THE EXIT
 * --------
 * When @opennextjs/cloudflare gains Node-middleware support, this file becomes
 * `proxy.ts` again with `export default createMiddleware(routing)` and this
 * whole comment goes with it. Track:
 * https://github.com/opennextjs/opennextjs-cloudflare/issues/566
 */

/** next-intl's cookie name and attributes, matched exactly (session cookie). */
const LOCALE_COOKIE = "NEXT_LOCALE";

function isLocale(value: string | undefined): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}

/**
 * The locale this request already expresses a preference for, or `undefined`
 * when it expresses none.
 *
 * The undefined case is load-bearing: it is what decides whether the locale
 * cookie gets written. next-intl writes the cookie whenever the locale it
 * settled on differs from the one the request asked for — and a request that
 * asked for nothing differs from everything, so a first visit always gets one.
 * A request whose Accept-Language already agrees with the URL does not.
 */
function detectLocale(req: NextRequest): Locale | undefined {
  const cookie = req.cookies.get(LOCALE_COOKIE)?.value;
  if (isLocale(cookie)) return cookie;

  const header = req.headers.get("accept-language");
  if (!header) return undefined;

  // Same two libraries next-intl negotiates with, so the ordering and the
  // quality-value handling are identical rather than merely similar. Both throw
  // on malformed tags, which a request header is fully entitled to contain.
  try {
    const languages = new Negotiator({ headers: { "accept-language": header } }).languages();
    const matched = matchLocale(languages, locales as unknown as string[], defaultLocale);
    return isLocale(matched) ? matched : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Record the locale, but only when the request did not already ask for it —
 * see detectLocale. Writing it unconditionally would set a cookie on every
 * request to every page, which makes the whole site uncacheable at the edge.
 */
function withLocaleCookie(
  res: NextResponse,
  effective: Locale,
  detected: Locale | undefined
): NextResponse {
  if (effective !== detected) {
    // Session cookie, no Max-Age — matching the shipped implementation exactly
    // (`NEXT_LOCALE=de; Path=/; SameSite=lax`).
    res.cookies.set(LOCALE_COOKIE, effective, { path: "/", sameSite: "lax" });
  }
  return res;
}

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Trailing slashes are Next's own normalisation and it does them before this
  // ever matters. Rewriting `/group/` to `/en/group/` would put a slash inside
  // the redirect Next then issues, and the reader would land on `/en/group`
  // rather than `/group`. Leave them alone.
  if (pathname.length > 1 && pathname.endsWith("/")) return NextResponse.next();

  const detected = detectLocale(req);
  const first = pathname.split("/")[1];

  // ── The URL already names a locale ────────────────────────────────────────
  if (isLocale(first)) {
    const rest = pathname.slice(first.length + 1); // "/de/group" -> "/group"

    if (first === defaultLocale) {
      // "as-needed": English is served on bare paths, so an explicit /en is
      // redirected away. This is the canonicalisation the site's SEO rests on —
      // every English page has exactly one address.
      const url = req.nextUrl.clone();
      url.pathname = rest === "" ? "/" : rest;
      return withLocaleCookie(NextResponse.redirect(url, 307), defaultLocale, detected);
    }

    return withLocaleCookie(NextResponse.next(), first, detected);
  }

  // ── Bare path: serve it in the reader's locale ────────────────────────────
  const locale = detected ?? defaultLocale;
  const url = req.nextUrl.clone();
  url.pathname = pathname === "/" ? `/${locale}` : `/${locale}${pathname}`;

  if (locale === defaultLocale) {
    // Rewritten, not redirected: the reader keeps the bare URL.
    return withLocaleCookie(NextResponse.rewrite(url), defaultLocale, detected);
  }
  return withLocaleCookie(NextResponse.redirect(url, 307), locale, detected);
}

export const config = {
  /**
   * Everything except API routes, Next internals, and any path containing a dot
   * (static assets).
   *
   * `[.]`, NOT `\.` — and this is not a style preference. A backslash escape is
   * lost when Next compiles the matcher into the middleware manifest, leaving
   * `.*..*`, in which the bare `.` matches ANY character. That turns the
   * negative lookahead into "exclude everything at least one character long",
   * so the middleware ran on `/` and nowhere else. The character class survives
   * compilation intact. Verified against the built manifest, not assumed.
   */
  matcher: ["/((?!api|_next|_vercel|.*[.].*).*)"],
};
