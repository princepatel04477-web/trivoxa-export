import { notFound } from "next/navigation";

/**
 * Catch-all that exists purely to trigger `[locale]/not-found.tsx`.
 *
 * `not-found.tsx` is only rendered when `notFound()` is THROWN inside a route
 * segment — it is not a handler for URLs that match no route. Because this
 * app's root layout is a dynamic segment (`app/[locale]/layout.tsx`), an
 * unmatched path resolved past `[locale]` entirely and fell through to Next's
 * built-in bare 404, so the on-brand page never rendered in production no
 * matter what it contained.
 *
 * This gives every otherwise-unmatched path under a locale a route to land on,
 * whose only job is to throw — which puts the branded 404 inside the locale
 * layout, with its fonts, i18n provider and site shell intact. (The
 * alternative, experimental `global-not-found.js`, bypasses layouts entirely
 * and would lose the header, footer and contact modal.)
 *
 * More specific routes always win over a catch-all, so no real page is
 * affected by this.
 */
export default function CatchAllNotFound() {
  notFound();
}
