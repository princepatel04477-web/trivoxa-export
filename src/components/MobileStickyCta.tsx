"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

/** Survives route changes (the component remounts, and the decision should not
 * be re-asked) but not a new tab. §7.2: "Dismissible, and it stays dismissed
 * for the session." */
const DISMISS_KEY = "trivoxa:rfq-cta-dismissed";
const DISMISS_EVENT = "trivoxa:rfq-cta-dismiss";

/**
 * sessionStorage is an external store, so it is read through
 * useSyncExternalStore rather than copied into state by an effect — the same
 * pattern useNavActive uses against the body class, and for the same reason.
 * A `useState` seeded from storage would hydrate-mismatch on a session that
 * had already dismissed the bar, and seeding it in an effect would be a
 * synchronous setState inside an effect, which is a cascading render.
 *
 * getServerSnapshot returns false: nothing has been dismissed on the server.
 */
function subscribeDismissed(onChange: () => void): () => void {
  window.addEventListener(DISMISS_EVENT, onChange);
  return () => window.removeEventListener(DISMISS_EVENT, onChange);
}

function getDismissed(): boolean {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    // Private mode / storage disabled: the bar returns on the next route,
    // which is better than the dismiss tap appearing to do nothing.
    return false;
  }
}

const getDismissedOnServer = () => false;

/**
 * The persistent quote affordance (§7.2). Every page on this site exists to
 * produce an inbound enquiry, and on a document this long the CTA cannot be
 * something the visitor has to scroll to find.
 *
 * Mobile only (CSS-gated below the md rung). Appears once the hero has left,
 * hides while the soft keyboard is up, and never appears on the two routes
 * that ARE the enquiry.
 */
export default function MobileStickyCta() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [pastHero, setPastHero] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const dismissed = useSyncExternalStore(subscribeDismissed, getDismissed, getDismissedOnServer);

  useEffect(() => {
    const onScroll = () => setPastHero(window.scrollY > window.innerHeight * 0.6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => setKeyboardOpen(vv.height < window.innerHeight * 0.75);
    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, []);

  const onEnquiryRoute = pathname.startsWith("/rfq") || pathname.startsWith("/contact");
  const visible = pastHero && !keyboardOpen && !dismissed && !onEnquiryRoute;

  // §7.2 — "Must not obscure content: add corresponding bottom padding to the
  // page container while it is visible." Set as a class on <html> rather than
  // a style on one container, because the bar is fixed to the viewport and the
  // last element of ANY route can end up beneath it — including the footer's
  // legal row, which is precisely what a procurement reader goes looking for.
  // Removed the moment the bar is not showing, so the padding never outlives
  // the thing it compensates for.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("has-sticky-cta", visible);
    return () => root.classList.remove("has-sticky-cta");
  }, [visible]);

  if (!visible) return null;

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* see getDismissed() */
    }
    // The store has changed but nothing observes sessionStorage directly
    // (the `storage` event only fires in OTHER tabs), so the notification is
    // explicit.
    window.dispatchEvent(new Event(DISMISS_EVENT));
  };

  return (
    <div className="mobile-sticky-cta" role="complementary">
      <Link href="/rfq/" data-analytics="mobile-sticky-rfq-cta">
        {t("requestQuote")}
      </Link>
      {/* Labelled rather than a bare glyph: an unlabelled × in a bar is
          nothing to a screen reader, and this control removes the site's
          primary conversion path — it should be describable. */}
      <button
        type="button"
        className="mobile-sticky-cta__dismiss"
        onClick={dismiss}
        aria-label={t("dismissQuotePrompt")}
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}
