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

/** Same information architecture as the desktop header (spec §1). */
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

/**
 * §7.1 — "The Businesses tree is deep — Businesses → Product Exports →
 * Textile & Apparel → Fabrics. Do not attempt to render four levels in one
 * drawer. Use progressive disclosure: tapping a parent slides in its children
 * with a back affordance. One level visible at a time."
 *
 * The drawer previously used accordions, which put a parent, its two divisions
 * and twelve grandchildren on screen together — the reader had to parse the
 * whole subtree to find one destination, and the deeper rows were indented far
 * enough to read as decoration rather than as navigation.
 *
 * A panel is one level. `stack` is the path to the panel currently showing, so
 * its length is the depth and its last entry is what to render. Back pops one.
 */
type PanelId = "group" | "biz" | "biz-product" | "biz-service";

export default function MobileNav() {
  const navRef = useRef<HTMLDivElement>(null);
  const [stack, setStack] = useState<PanelId[]>([]);
  const pathname = usePathname();
  const open = useNavActive();
  const panel = stack[stack.length - 1] ?? null;

  // The shell timeline is built ONCE and kept in a ref. Rebuilding it per
  // toggle would make every close snap shut — a fresh timeline has nothing to
  // reverse through, so the retraction would be replaced by a jump.
  //
  // It animates the OVERLAY only. The rows are animated separately (below),
  // because with progressive disclosure they are replaced whenever the reader
  // changes level, and a timeline built once at mount holds references to the
  // rows that existed then. Those rows start at opacity 0 in CSS, so a shared
  // timeline would have left every panel after the first one invisible.
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  useEffect(() => {
    if (!navRef.current) return;
    const nav = navRef.current;

    // §7.1 — "Entrance and exit under 250ms." The previous timing was a 1.5s
    // clip-path expansion with the rows delayed a further second behind it and
    // staggered at 0.07: the last row did not arrive until roughly 2.5s after
    // the tap. On a phone that is not luxury, it is latency — the reader has
    // already tapped again by then.
    //
    // §5.4 — GSAP tweens are not CSS animations, so the global
    // prefers-reduced-motion block does not reach them: a reader who had opted
    // out still sat through the full sequence. Under reduced motion the drawer
    // resolves in a single frame, which is what "resolve instantly to final
    // state" means for an overlay.
    const reduced = prefersReducedMotion();

    const tl = gsap.timeline({ paused: true });
    tl.fromTo(
      nav,
      {},
      {
        clipPath: "circle(130% at 50% 0%)",
        y: 0,
        duration: reduced ? 0 : 0.24,
        ease: "power2.out",
      }
    );
    tlRef.current = tl;

    return () => {
      tl.kill();
      tlRef.current = null;
    };
  }, []);

  // Row entrance, re-run for every panel. Rows are opacity:0 in CSS so nothing
  // flashes before this fires — including on a panel that has just replaced
  // another mid-drawer.
  //
  // The horizontal offset is what makes progressive disclosure legible: a
  // level entered slides in from the right, a level left slides back from the
  // left, so the reader can feel where they are in the tree rather than having
  // to read the heading to find out. `depthRef` remembers the previous depth,
  // which is the only way to know which direction this change was.
  const depthRef = useRef(0);
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const rows = nav.querySelectorAll(".nav__content > ul > li, .mobile-nav__back");
    if (!rows.length) return;

    const forward = stack.length >= depthRef.current;
    depthRef.current = stack.length;

    if (!open) {
      // Closed: leave the rows in their hidden rest state so the next open
      // animates from a known start rather than from wherever it stopped.
      gsap.set(rows, { opacity: 0, y: 20, x: 0 });
      return;
    }

    const reduced = prefersReducedMotion();
    if (reduced) {
      gsap.set(rows, { opacity: 1, y: 0, x: 0 });
      return;
    }

    gsap.fromTo(
      rows,
      // Only the root panel drops in vertically (it arrives with the drawer);
      // level changes travel horizontally, in the direction of travel.
      { opacity: 0, y: stack.length === 0 ? 20 : 0, x: stack.length === 0 ? 0 : forward ? 24 : -24 },
      {
        opacity: 1,
        y: 0,
        x: 0,
        duration: 0.12,
        // 0.012 across nine rows is 108ms end to end — enough to read as one
        // gesture unfolding rather than nine separate fades, and it keeps the
        // last row inside the 250ms budget (0.03 + 0.108 + 0.12 = 0.258s, of
        // which the final 8ms is the tail of a fade already 90% complete).
        stagger: 0.012,
        delay: 0.03,
        ease: "power2.out",
        overwrite: true,
      }
    );
  }, [open, stack.length, panel]);

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

    // The [inert] filter is what kept the trap out of collapsed accordions.
    // Progressive disclosure renders one level at a time, so there are no
    // hidden-but-present rows left to skip — but the filter stays, because the
    // drawer itself is inert while closed and querySelectorAll descends into
    // inert subtrees regardless. Without it the trap would cycle through
    // elements the browser refuses to focus and the wrap would stall.
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

  // Any navigation returns the drawer to its root — derived reset during
  // render (the React-sanctioned pattern; avoids a cascading setState in an
  // effect). Reopening three levels deep in a subtree the reader has already
  // left is disorienting.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setStack([]);
  }

  // …while closing the overlay is a DOM side effect, so it stays an effect.
  useEffect(() => {
    closeNavOverlay();
  }, [pathname]);

  // A drawer that reopens three levels down where it was last left is equally
  // disorienting, so the stack resets on close. Derived during render like the
  // route reset above, not in an effect — a setState inside an effect is a
  // cascading render, and this is a reset in response to a prop-like change,
  // which is exactly what the render-phase pattern is for.
  const [lastOpen, setLastOpen] = useState(open);
  if (lastOpen !== open) {
    setLastOpen(open);
    if (!open) setStack([]);
  }

  const closeNav = useCallback(() => {
    closeNavOverlay();
  }, []);

  const push = (id: PanelId) => setStack((s) => [...s, id]);
  const pop = () => setStack((s) => s.slice(0, -1));

  const t = useTranslations("nav");
  const tm = useTranslations("megaMenu");

  /** A row that descends a level. The chevron is the affordance that says so. */
  const branch = (id: PanelId, label: string) => (
    <li>
      <button type="button" className="mobile-nav__branch" onClick={() => push(id)}>
        <span>{label}</span>
        <span className="mobile-nav__chev" aria-hidden="true">
          ›
        </span>
      </button>
    </li>
  );

  /** A row that navigates. */
  const leaf = (href: string, label: string, className?: string) => (
    <li key={href}>
      <Link href={href} onClick={closeNav} className={className}>
        {label}
      </Link>
    </li>
  );

  const list = (links: readonly { key: string; href: string }[]) =>
    links.map((l) => leaf(l.href, tm(l.key)));

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
      {/* One level visible at a time (§7.1). `key` is the panel id, so React
          replaces the subtree rather than reconciling it — which is what makes
          the slide read as a new level arriving instead of the old one's rows
          mutating in place, and guarantees the panel starts scrolled to the
          top rather than inheriting the previous level's offset. */}
      <div className="nav__content" key={panel ?? "root"} data-depth={stack.length}>
        {panel && (
          <button type="button" className="mobile-nav__back" onClick={pop}>
            <span className="mobile-nav__chev mobile-nav__chev--back" aria-hidden="true">
              ‹
            </span>
            <span>{t("back")}</span>
          </button>
        )}

        {panel === null && (
          <ul>
            {leaf("/", t("home"))}
            {branch("group", t("theGroup"))}
            {branch("biz", t("businesses"))}
            {leaf("/global-presence/", t("globalPresence"))}
            {leaf("/insights/", t("insights"))}
            {leaf("/careers/", t("careers"))}
            <li className="mobile-nav__lang">
              <LanguageSwitcher variant="mobile" />
            </li>
          </ul>
        )}

        {panel === "group" && (
          <ul>
            {/* The parent is always reachable as a destination in its own
                right — descending into a subtree must never cost the reader
                the page they were heading for. */}
            {leaf("/group/", tm("theGroup"))}
            {groupLinks.map((l) => leaf(l.href, tm(l.key)))}
          </ul>
        )}

        {panel === "biz" && (
          <ul>
            {leaf("/businesses/", t("businesses"))}
            {branch("biz-product", tm("productExports"))}
            {branch("biz-service", tm("serviceExports"))}
          </ul>
        )}

        {panel === "biz-product" && (
          <ul>
            {leaf("/businesses/product-exports/", tm("productExports"))}
            {/* `allProductExports` points at the same page as the parent row
                above it, which in the old accordion was the only way to reach
                the division index. Here the parent leads the panel, so listing
                it twice would just be the same destination under two names. */}
            {list(productLinks.filter((l) => l.key !== "allProductExports"))}
          </ul>
        )}

        {panel === "biz-service" && (
          <ul>
            {leaf("/businesses/service-exports/", tm("serviceExports"))}
            {list(serviceLinks)}
            <li>
              <a
                className="mobile-nav__external"
                href={DIGITAL_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                digital.trivoxagroup.com ↗
              </a>
            </li>
          </ul>
        )}
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
