"use client";
import { useTranslations } from "next-intl";

import { gsap } from "@/lib/gsap";
import { DURATION, EASE } from "@/lib/motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { on } from "@/lib/site-events";
import { getLenis } from "@/components/providers/LenisProvider";
import { Link, usePathname } from "@/i18n/navigation";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Logo } from "@/components/brand/Logo";
import { HEADER_CONDENSE_AT, navLogoTone } from "@/lib/logo";
import { useNavActive, toggleNavOverlay } from "@/hooks/useNavActive";

/** "The Group" simple dropdown — anchors into /group/ chapters. */
const groupDropdown = [
  { key: "story", href: "/group/#our-story" },
  { key: "leadership", href: "/group/#leadership" },
  { key: "foundation", href: "/group/#foundation" },
  { key: "vision", href: "/group/#vision" },
  { key: "commitments", href: "/group/#commitments" },
] as const;

/** "Businesses" simple dropdown — exactly two items (ORDER 02). Deep
 * category/product routes stay live, routable, and in sitemap.xml; they are
 * only removed from this menu. */
const businessesDropdown = [
  { key: "productExports", href: "/businesses/product-exports/" },
  { key: "serviceExports", href: "/businesses/service-exports/" },
] as const;

type OpenMenu = "group" | "biz" | null;

export default function Header() {
  const t = useTranslations("nav");
  const tm = useTranslations("megaMenu");
  const pathname = usePathname();
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const closeTimer = useRef<number | null>(null);
  // Declared here rather than beside the scroll effect that also uses it: the
  // outside-click guard above needs it too, and a ref used by two effects
  // belongs above both of them.
  const rootRef = useRef<HTMLDivElement>(null);
  // Read from the same body class the overlay and stylesheet already use, so
  // the hamburger's reported state can never disagree with the visible one.
  const navOpen = useNavActive();

  // Hover intent: a short grace period before closing so the pointer can
  // travel from the trigger into the panel without the menu snapping shut.
  const scheduleClose = useCallback(() => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpenMenu(null), 160);
  }, []);
  const openNow = useCallback((menu: OpenMenu) => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setOpenMenu(menu);
  }, []);

  // Dropdown items stagger in, rather than the panel simply appearing with its
  // contents already in place.
  //
  // The panel's own fade-and-rise is CSS (see .nav-drop) and stays there — this
  // adds the second layer the audit found missing: the CONTENTS arriving in
  // sequence, which is what makes a menu read as opening rather than as being
  // switched on.
  //
  // `back.out` is used here and essentially nowhere else on the site. A small
  // overshoot on a nav item reads as spring; the same curve on a card or a
  // panel reads as bouncy, and this brand's promise is credibility. The travel
  // is 18px, not the reference's 50 — these panels are ~40px per row, so a 50px
  // rise starts each item above the trigger that opened it.
  useEffect(() => {
    if (!openMenu) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const panel = rootRef.current?.querySelector<HTMLElement>(".nav-drop.is-open");
    if (!panel) return;
    const items = panel.querySelectorAll("li");
    if (!items.length) return;
    const tween = gsap.from(items, {
      // `opacity`, NOT `autoAlpha`. autoAlpha drives visibility alongside
      // opacity, so for the ~0.55s the stagger runs every item was
      // `visibility: hidden` — and a visibility:hidden element cannot take
      // focus. A keyboard reader pressing ArrowDown on the trigger landed
      // nowhere, because the items they were being sent to did not exist to
      // the focus system yet. The panel's closed state is already enforced by
      // `pointer-events: none` and `aria-hidden` on .nav-drop, so visibility
      // was never doing work here that something else was not already doing.
      opacity: 0,
      y: -18,
      duration: DURATION.short,
      ease: "back.out(1.7)",
      stagger: { amount: 0.2 },
      overwrite: "auto",
      // Inline opacity left behind would outrank the panel's own closed state
      // and the link hover colours.
      clearProps: "opacity,visibility,transform",
    });
    return () => {
      tween.kill();
      gsap.set(items, { clearProps: "opacity,visibility,transform" });
    };
  }, [openMenu]);

  // Escape closes any open panel and returns focus to the trigger that opened
  // it; clicking a panel link also closes it.
  //
  // Focus restoration matters because the panel is opened on hover AND on
  // focus: a keyboard reader who tabs into "The Group", opens the panel, then
  // presses Escape was previously left with focus on a link inside a panel that
  // had just become `aria-hidden` and untabbable, which strands the tab order.
  const triggerRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpenMenu((current) => {
        if (current) triggerRefs.current[current]?.focus();
        return null;
      });
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Outside click. The panel opens on hover, so a reader can open it with the
  // pointer, move away without crossing the trigger's mouseleave (a fast
  // diagonal off the top of the viewport does exactly this), and leave it
  // hanging over the page — which is the state screenshot 1 caught, the panel
  // sitting on top of the "01 CURIOSITY" row.
  //
  // `pointerdown` rather than `click`: the panel must be gone before whatever
  // was clicked underneath begins responding, and a click that starts inside
  // the panel and ends outside it should not count as an outside click.
  useEffect(() => {
    if (!openMenu) return;
    const onDown = (e: PointerEvent) => {
      const root = rootRef.current;
      if (root && !root.contains(e.target as Node)) setOpenMenu(null);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [openMenu]);

  // Arrow-key navigation inside an open panel, and Home/End to its ends.
  //
  // Without this the panel is a list a keyboard reader can only walk with Tab,
  // which also walks straight out of it into the rest of the navbar — the
  // panel behaves like loose links that happen to be positioned together
  // rather than like a menu.
  const onPanelKeyDown = (menu: OpenMenu) => (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (openMenu !== menu) return;
    const items = Array.from(
      e.currentTarget.querySelectorAll<HTMLAnchorElement>("a[href]")
    );
    if (!items.length) return;
    const here = items.indexOf(document.activeElement as HTMLAnchorElement);
    let next = -1;
    if (e.key === "ArrowDown") next = here < 0 ? 0 : (here + 1) % items.length;
    else if (e.key === "ArrowUp") next = here <= 0 ? items.length - 1 : here - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = items.length - 1;
    else return;
    e.preventDefault();
    items[next].focus();
  };

  /** ArrowDown on a trigger opens its panel and moves into the first item. */
  const onTriggerKeyDown = (menu: OpenMenu) => (e: React.KeyboardEvent<HTMLAnchorElement>) => {
    if (e.key !== "ArrowDown") return;
    e.preventDefault();
    // Resolve the panel NOW. React nulls `currentTarget` once the handler
    // returns, so reading it inside the callback below finds nothing.
    const li = e.currentTarget.closest("li");
    openNow(menu);
    // The panel's items are `tabIndex={-1}` until it is open, and that state
    // change has not committed yet — so focus on the next frame.
    requestAnimationFrame(() => {
      li?.querySelector<HTMLAnchorElement>(".nav-drop a[href]")?.focus();
    });
  };

  // Route change always dismisses panels — derived reset during render (the
  // React-sanctioned pattern; avoids a cascading setState-in-effect).
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpenMenu(null);
  }

  /** Active-trail detection for aria-current (ORDER 02: no more hover-line). */
  const isActive = useCallback(
    (href: string) => {
      const clean = href.replace(/\/$/, "");
      if (clean === "") return pathname === "/";
      return pathname === clean || pathname.startsWith(clean + "/");
    },
    [pathname]
  );

  // Solid chrome once the page scrolls — without this the home hero's fixed
  // header floats transparent over section content (nav becomes unreadable).
  // It also auto-hides on scroll-down and reveals on scroll-up, so the fixed
  // bar never sits on top of / overlaps section content while reading. GSAP
  // drives the hide (it owns the header's inline transform via the hero intro
  // tween), so a plain CSS class can't fight it.
  //
  // Lenis is the scroll driver on this site, so we subscribe to its scroll
  // event (fires every frame with the real position). window's native scroll
  // is kept as a fallback for the reduced-motion path where Lenis is disabled.
  //
  // `condensed` mirrors the same threshold into React state so the logo can
  // take its tone AND size (ORDER 03) from it. It flips once per crossing,
  // not per frame.
  const [condensed, setCondensed] = useState(false);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    let lastY = window.scrollY;
    let hidden = false;
    let isCondensed = false;
    const REVEAL_ZONE = 120; // always show near the very top
    const DELTA = 6; // ignore sub-pixel jitter
    const setHidden = (next: boolean) => {
      if (next === hidden) return;
      hidden = next;
      if (next) setOpenMenu(null); // close panels when the bar slides away
      gsap.to(el, {
        yPercent: next ? -130 : 0,
        duration: DURATION.short,
        ease: EASE.entry,
        overwrite: "auto",
      });
    };
    const apply = (y: number) => {
      const nextCondensed = y > HEADER_CONDENSE_AT;
      el.classList.toggle("header--scrolled", nextCondensed);
      if (nextCondensed !== isCondensed) {
        isCondensed = nextCondensed;
        setCondensed(nextCondensed);
      }
      if (y <= REVEAL_ZONE) setHidden(false);
      else if (y > lastY + DELTA) setHidden(true); // scrolling down
      else if (y < lastY - DELTA) setHidden(false); // scrolling up
      lastY = y;
    };

    // Primary: Lenis scroll event (the real driver).
    let lenisOff = () => {};
    const hookLenis = () => {
      const lenis = getLenis();
      if (!lenis) return;
      const cb = () => apply(lenis.animatedScroll ?? window.scrollY);
      lenis.on("scroll", cb);
      lenisOff = () => lenis.off("scroll", cb);
    };
    hookLenis();
    const offInit = on("lenis:init", hookLenis); // Lenis may init after Header mounts

    // Fallback: native window scroll (reduced-motion path, no Lenis).
    let raf = 0;
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; apply(window.scrollY); });
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    apply(window.scrollY);
    return () => {
      lenisOff();
      offInit();
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  /** Close when keyboard focus leaves a trigger+panel pair entirely. */
  const blurGuard = (menu: OpenMenu) => (e: React.FocusEvent<HTMLElement>) => {
    if (openMenu === menu && !e.currentTarget.contains(e.relatedTarget as Node)) {
      setOpenMenu(null);
    }
  };

  return (
    <div className="header" ref={rootRef}>
      <div className="header-wrapper">
        {/* Left zone — logo only (ORDER 01: replaces the old "Home" item). */}
        <div className="h-left">
          <div className="logo">
            <Link href="/" aria-label="Trivoxa Group — home">
              {/* ONE mark, ONE height, every route and every scroll state.
                  This used to swap to the eagle-only `mark` variant on scroll
                  and shrink 42px → 34px with it, so the masthead carried two
                  different logos at two different sizes depending on where the
                  reader happened to be on the page. The eagle alone is also not
                  identifiable at 42px — it reads as a bird, not as Trivoxa —
                  so the full lockup is the one that stays. */}
              <Logo variant="full" slot="nav" tone={navLogoTone(condensed)} decorative />
            </Link>
          </div>
        </div>

        {/* Centre zone — the full primary nav. */}
        <div className="h-center">
          <ul className="header-links header-links--center d-flex">
            {/* The Group — simple dropdown */}
            <li
              className={`has-drop${isActive("/group/") ? " current-menu-item" : ""}${openMenu === "group" ? " menu-active" : ""}`}
              onMouseEnter={() => openNow("group")}
              onMouseLeave={scheduleClose}
              onBlur={blurGuard("group")}
            >
              <Link
                href="/group/"
                ref={(el: HTMLAnchorElement | null) => {
                  triggerRefs.current.group = el;
                }}
                aria-current={isActive("/group/") ? "page" : undefined}
                aria-haspopup="true"
                aria-expanded={openMenu === "group"}
                onFocus={() => openNow("group")}
                onKeyDown={onTriggerKeyDown("group")}
              >
                {t("theGroup")}
              </Link>
              <div
                className={`nav-drop${openMenu === "group" ? " is-open" : ""}`}
                aria-hidden={openMenu !== "group"}
                onKeyDown={onPanelKeyDown("group")}
              >
                <ul>
                  {groupDropdown.map((item) => (
                    <li key={item.key}>
                      <Link href={item.href} tabIndex={openMenu === "group" ? 0 : -1} onClick={() => setOpenMenu(null)}>
                        {tm(item.key)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </li>

            {/* Businesses — simple dropdown, exactly two items (ORDER 02) */}
            <li
              className={`has-drop${isActive("/businesses/") ? " current-menu-item" : ""}${openMenu === "biz" ? " menu-active" : ""}`}
              onMouseEnter={() => openNow("biz")}
              onMouseLeave={scheduleClose}
              onBlur={blurGuard("biz")}
            >
              <Link
                href="/businesses/"
                ref={(el: HTMLAnchorElement | null) => {
                  triggerRefs.current.biz = el;
                }}
                aria-current={isActive("/businesses/") ? "page" : undefined}
                aria-haspopup="true"
                aria-expanded={openMenu === "biz"}
                onFocus={() => openNow("biz")}
                onKeyDown={onTriggerKeyDown("biz")}
              >
                {t("businesses")}
              </Link>
              <div
                className={`nav-drop${openMenu === "biz" ? " is-open" : ""}`}
                aria-hidden={openMenu !== "biz"}
                onKeyDown={onPanelKeyDown("biz")}
              >
                <ul>
                  {businessesDropdown.map((item) => (
                    <li key={item.key}>
                      <Link href={item.href} tabIndex={openMenu === "biz" ? 0 : -1} onClick={() => setOpenMenu(null)}>
                        {tm(item.key)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </li>

            <li className={isActive("/industries/") ? "current-menu-item" : undefined}>
              <Link href="/industries/" aria-current={isActive("/industries/") ? "page" : undefined}>
                {t("industries")}
              </Link>
            </li>

            <li className={isActive("/global-presence/") ? "current-menu-item" : undefined}>
              <Link href="/global-presence/" aria-current={isActive("/global-presence/") ? "page" : undefined}>
                {t("globalPresence")}
              </Link>
            </li>

            <li className={isActive("/insights/") ? "current-menu-item" : undefined}>
              <Link href="/insights/" aria-current={isActive("/insights/") ? "page" : undefined}>
                {t("insights")}
              </Link>
            </li>
            <li className={isActive("/careers/") ? "current-menu-item" : undefined}>
              <Link href="/careers/" aria-current={isActive("/careers/") ? "page" : undefined}>
                {t("careers")}
              </Link>
            </li>
          </ul>
        </div>

        {/* Right zone — language switcher + primary CTA only (ORDER 01: mail icon removed). */}
        <div className="h-right">
          <LanguageSwitcher />
          <Link href="/rfq/" className="primary-button nav-cta" data-analytics="nav-rfq-cta">
            <span className="d-flex">
              <span>{t("requestQuote")}</span>
              <div className="img d-flex">
                <img src="/images/icons/envelope-send.svg" alt="" />
              </div>
            </span>
          </Link>

          <button
            className="hamburger d-flex"
            type="button"
            aria-label={t("menu")}
            aria-expanded={navOpen}
            aria-controls="mobile-nav"
            onClick={toggleNavOverlay}
          >
            <div />
            <div />
          </button>
        </div>
      </div>
    </div>
  );
}
