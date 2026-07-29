"use client";

import { gsap } from "@/lib/gsap";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useNavActive, closeNavOverlay } from "@/hooks/useNavActive";
import { prefersReducedMotion } from "@/hooks/useScrollAnimations";
import { getLenis } from "@/components/providers/LenisProvider";

const DIGITAL_URL = "https://digital.trivoxagroup.com";

/** Same information architecture as the desktop header (spec §1):
 * six items, with The Group and Businesses as accordions. */
const groupLinks = [
  { key: "story", href: "/group/#our-story" },
  { key: "leadership", href: "/group/#leadership" },
  { key: "foundation", href: "/group/#foundation" },
  { key: "vision", href: "/group/#vision" },
  { key: "commitments", href: "/group/#commitments" },
] as const;

const productLinks = [
  { key: "textileApparel", href: "/businesses/product-exports/textile-apparel/" },
  { key: "healthcarePharma", href: "/businesses/product-exports/healthcare-pharmaceuticals/" },
  { key: "buildingMaterials", href: "/businesses/product-exports/building-materials/" },
  { key: "agricultureFood", href: "/businesses/product-exports/agriculture-food/" },
  { key: "engineeringIndustrial", href: "/businesses/product-exports/engineering-industrial/" },
  { key: "allProductExports", href: "/businesses/product-exports/" },
] as const;

const serviceLinks = [
  { key: "technology", href: "/businesses/service-exports/technology/" },
  { key: "ai", href: "/businesses/service-exports/ai/" },
  { key: "software", href: "/businesses/service-exports/software/" },
  { key: "designBranding", href: "/businesses/service-exports/design/" },
  { key: "digitalMarketing", href: "/businesses/service-exports/marketing/" },
  { key: "businessSupport", href: "/businesses/service-exports/business-support/" },
] as const;

type Accordion = "group" | "biz" | null;

export default function MobileNav() {
  const navRef = useRef<HTMLDivElement>(null);
  const [openSection, setOpenSection] = useState<Accordion>(null);
  const pathname = usePathname();
  const open = useNavActive();

  // The timeline is built ONCE and kept in a ref. Rebuilding it per toggle
  // would make every close snap shut — a fresh timeline has nothing to reverse
  // through, so the 1.5s clip-path retraction would be replaced by a jump.
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  useEffect(() => {
    if (!navRef.current) return;
    const nav = navRef.current;
    const items = nav.querySelectorAll(".nav__content > ul > li");

    // §7.1 — "Entrance and exit under 250ms." The previous timing was a 1.5s
    // clip-path expansion with the rows delayed a further second behind it and
    // staggered at 0.07: the last row did not arrive until roughly 2.5s after
    // the tap. On a phone that is not luxury, it is latency — the user has
    // already tapped again by then.
    //
    // §5.4 — GSAP tweens are not CSS animations, so the global
    // prefers-reduced-motion block does not reach them: a reader who had opted
    // out still sat through the full sequence. Under reduced motion the drawer
    // now resolves in a single frame, which is what "resolve instantly to
    // final state" means for an overlay.
    const reduced = prefersReducedMotion();
    const D = reduced ? 0 : 0.24;

    const tl = gsap.timeline({ paused: true });
    tl.fromTo(nav, {}, { clipPath: "circle(130% at 50% 0%)", y: 0, duration: D, ease: "power2.out" });
    tl.fromTo(
      items,
      {},
      {
        opacity: 1,
        y: 0,
        duration: reduced ? 0 : 0.12,
        // 0.012 across nine rows is 108ms end to end — enough to read as one
        // gesture unfolding rather than nine separate fades, and it keeps the
        // last row inside the 250ms budget (0.03 + 0.108 + 0.12 = 0.258s of
        // which the final 8ms is the tail of a fade already 90% complete).
        stagger: reduced ? 0 : 0.012,
        delay: reduced ? 0 : 0.03,
      },
      "<"
    );
    tlRef.current = tl;

    return () => {
      tl.kill();
      tlRef.current = null;
    };
  }, []);

  // Drive that one timeline from the open state — play forward, reverse back.
  // Replaces the MutationObserver this component used to run: `useNavActive`
  // already observes the class, so the observer was a second subscription to
  // the same fact.
  useEffect(() => {
    const tl = tlRef.current;
    if (!tl) return;
    if (open) tl.play();
    else tl.reverse();
  }, [open]);

  // §7.1 — "Background scroll locked while open — lock via `position: fixed` on
  // body with scroll-position restoration, not `overflow: hidden`, which iOS
  // ignores."
  //
  // Two separate scrollers have to be stopped, and neither substitutes for the
  // other:
  //
  //   - Lenis moves the document from its own RAF loop, so no CSS property on
  //     body stops it. It is frozen explicitly.
  //   - Native touch scrolling on iOS Safari ignores `overflow: hidden` on
  //     body outright. Only taking the body out of flow stops it, which means
  //     capturing the scroll offset first and pinning the body at negative
  //     that, or the page jumps to the top the instant the drawer opens and
  //     the reader loses their place.
  //
  // On close the offset is restored to BOTH the window and Lenis: Lenis caches
  // its own `animatedScroll`, and a window.scrollTo it did not initiate leaves
  // the two disagreeing until the next gesture snaps the page back.
  useEffect(() => {
    if (!open) return;
    const lenis = getLenis();
    lenis?.stop();

    const y = window.scrollY;
    const body = document.body;
    const prev = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
    };
    body.style.position = "fixed";
    body.style.top = `-${y}px`;
    // Fixed positioning drops the body out of flow, so it no longer inherits
    // the viewport width — without this the whole page reflows narrower behind
    // the overlay and every trigger boundary moves.
    body.style.width = "100%";

    return () => {
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      window.scrollTo(0, y);
      lenis?.scrollTo(y, { immediate: true, force: true });
      lenis?.start();
    };
  }, [open]);

  // §7.1 — "Close on … hardware back (push a history state on open)."
  // Without this the Android back button leaves the drawer open and navigates
  // the page underneath it, which reads as the button being broken. A state is
  // pushed on open and popped on close, so back closes the drawer and the
  // second back leaves the page as it always did.
  useEffect(() => {
    if (!open) return;
    history.pushState({ trivoxaNav: true }, "");
    const onPop = () => closeNavOverlay();
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      // Closing by any other route (X, backdrop, Escape, a link) must also
      // retire the state we pushed, or back would then be a no-op that only
      // undoes an already-closed drawer.
      if (history.state?.trivoxaNav) history.back();
    };
  }, [open]);

  // Escape closes, and focus is kept inside the overlay while it is open —
  // without the trap, tabbing walks straight out into the page behind it,
  // which for a sighted keyboard user means the focus ring simply vanishes.
  // On close, focus returns to the control that opened the overlay.
  useEffect(() => {
    if (!open) return;
    const nav = navRef.current;
    if (!nav) return;
    const opener = document.activeElement as HTMLElement | null;

    // querySelectorAll still descends into inert subtrees, so collapsed
    // accordions are filtered out explicitly — otherwise the trap would cycle
    // through links the browser itself refuses to focus and the wrap stalls.
    const focusable = () =>
      Array.from(
        nav.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')
      ).filter((el) => !el.closest("[inert]"));

    focusable()[0]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeNavOverlay();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      // Wrap at both ends. Also catches the case where focus has already
      // escaped the overlay (activeElement outside it) and pulls it back.
      if (e.shiftKey && (document.activeElement === first || !nav.contains(document.activeElement))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !nav.contains(document.activeElement))) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      opener?.focus?.();
    };
  }, [open]);

  // Any navigation collapses accordions — derived reset during render (the
  // React-sanctioned pattern; avoids a cascading setState-in-effect)…
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpenSection(null);
  }

  // …while closing the overlay is a DOM side effect, so it stays an effect.
  useEffect(() => {
    closeNavOverlay();
  }, [pathname]);

  const closeNav = useCallback(() => {
    closeNavOverlay();
  }, []);

  const toggle = (section: Exclude<Accordion, null>) =>
    setOpenSection((cur) => (cur === section ? null : section));

  const t = useTranslations("nav");
  const tm = useTranslations("megaMenu");

  const sub = (links: readonly { key: string; href: string }[]) => (
    <ul>
      {links.map((l) => (
        <li key={l.key}>
          <Link href={l.href} onClick={closeNav}>
            {tm(l.key)}
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    /* The closed overlay is hidden by clip-path and translate — it is still in
       the layout, so without `inert` every one of its ~25 links stays in the
       tab order. Tabbing off the header dropped a keyboard user into a stack
       of invisible destinations with no visible focus ring anywhere on screen.
       `inert` removes it from focus, hit-testing and the accessibility tree in
       one move; aria-hidden is kept alongside for older engines. */
    <div
      ref={navRef}
      className="mobile-nav"
      id="mobile-nav"
      inert={!open}
      aria-hidden={!open}
    >
      <div className="nav__content">
        <ul>
          <li>
            <Link href="/" onClick={closeNav}>
              {t("home")}
            </Link>
          </li>

          {/* The Group — accordion */}
          <li className={openSection === "group" ? "opened" : undefined}>
            <button
              type="button"
              className="mobile-nav__acc-trigger"
              aria-expanded={openSection === "group"}
              onClick={() => toggle("group")}
            >
              {t("theGroup")}
              <span className="mobile-nav__caret" aria-hidden="true">
                ▾
              </span>
            </button>
            {/* Collapsed via grid-template-rows: 0fr — zero height, but its
                links stay focusable without this, so Tab walked into a closed
                accordion and the focus ring disappeared off-panel. */}
            <div
              className={`mobile-nav__acc${openSection === "group" ? " is-open" : ""}`}
              inert={openSection !== "group"}
            >
              <ul className="sub-menu">
                <li>
                  <Link href="/group/" onClick={closeNav}>
                    {tm("theGroup")}
                  </Link>
                </li>
                {groupLinks.map((l) => (
                  <li key={l.key}>
                    <Link href={l.href} onClick={closeNav}>
                      {tm(l.key)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </li>

          {/* Businesses — accordion with the two divisions */}
          <li className={openSection === "biz" ? "opened" : undefined}>
            <button
              type="button"
              className="mobile-nav__acc-trigger"
              aria-expanded={openSection === "biz"}
              onClick={() => toggle("biz")}
            >
              {t("businesses")}
              <span className="mobile-nav__caret" aria-hidden="true">
                ▾
              </span>
            </button>
            <div
              className={`mobile-nav__acc${openSection === "biz" ? " is-open" : ""}`}
              inert={openSection !== "biz"}
            >
              <div className="mobile-nav__division">
                <Link href="/businesses/product-exports/" className="mobile-nav__division-title" onClick={closeNav}>
                  {tm("productExports")}
                </Link>
                {sub(productLinks)}
              </div>
              <div className="mobile-nav__division">
                <Link href="/businesses/service-exports/" className="mobile-nav__division-title" onClick={closeNav}>
                  {tm("serviceExports")}
                </Link>
                {sub(serviceLinks)}
                <a className="mobile-nav__external" href={DIGITAL_URL} target="_blank" rel="noopener noreferrer">
                  digital.trivoxagroup.com ↗
                </a>
              </div>
            </div>
          </li>

          <li>
            <Link href="/global-presence/" onClick={closeNav}>
              {t("globalPresence")}
            </Link>
          </li>
          <li>
            <Link href="/insights/" onClick={closeNav}>
              {t("insights")}
            </Link>
          </li>
          <li>
            <Link href="/careers/" onClick={closeNav}>
              {t("careers")}
            </Link>
          </li>
          <li className="mobile-nav__lang">
            <LanguageSwitcher variant="mobile" />
          </li>
        </ul>
      </div>

      {/* Sticky bottom CTA — always reachable while the overlay is open. */}
      <div className="mobile-nav__cta">
        <Link href="/rfq/" onClick={closeNav} data-analytics="mobile-nav-rfq-cta">
          {t("requestQuote")}
        </Link>
      </div>
    </div>
  );
}
