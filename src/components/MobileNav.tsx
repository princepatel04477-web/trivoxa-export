"use client";

import { gsap } from "@/lib/gsap";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useNavActive, closeNavOverlay } from "@/hooks/useNavActive";
import { getLenis } from "@/components/providers/LenisProvider";

/** Same information architecture as the desktop header (ORDER 01): logo
 * (persistent header, not listed here) is home; Group and Businesses are
 * accordions, Businesses reduced to exactly two items (ORDER 02). */
const groupLinks = [
  { key: "story", href: "/group/#our-story" },
  { key: "leadership", href: "/group/#leadership" },
  { key: "foundation", href: "/group/#foundation" },
  { key: "vision", href: "/group/#vision" },
  { key: "commitments", href: "/group/#commitments" },
] as const;

const businessesLinks = [
  { key: "productExports", href: "/businesses/product-exports/" },
  { key: "serviceExports", href: "/businesses/service-exports/" },
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

    const tl = gsap.timeline({ paused: true });
    tl.fromTo(nav, {}, { clipPath: "circle(130% at 50% 0%)", y: 0, duration: 1.5 });
    tl.fromTo(items, {}, { opacity: 1, y: 0, delay: 1, stagger: 0.07, duration: 1 }, "<");
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

  // Lenis is a virtual scroller: it moves the page from its own RAF loop, so
  // `body { overflow: hidden }` alone does not stop a wheel gesture from
  // scrolling the document underneath the open overlay. Freeze it explicitly,
  // the same way the contact modal does.
  useEffect(() => {
    if (!open) return;
    const lenis = getLenis();
    lenis?.stop();
    return () => lenis?.start();
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

          {/* Businesses — accordion, exactly two items (ORDER 02) */}
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
              {sub(businessesLinks)}
            </div>
          </li>

          <li>
            <Link href="/industries/" onClick={closeNav}>
              {t("industries")}
            </Link>
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
