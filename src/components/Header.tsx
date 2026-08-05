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

  // Escape closes any open panel; clicking a panel link also closes it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenu(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

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
  const rootRef = useRef<HTMLDivElement>(null);
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
              <Logo variant={condensed ? "mark" : "full"} slot="nav" tone={navLogoTone(condensed)} decorative />
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
                aria-current={isActive("/group/") ? "page" : undefined}
                aria-haspopup="true"
                aria-expanded={openMenu === "group"}
                onFocus={() => openNow("group")}
              >
                {t("theGroup")}
              </Link>
              <div className={`nav-drop${openMenu === "group" ? " is-open" : ""}`} aria-hidden={openMenu !== "group"}>
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
                aria-current={isActive("/businesses/") ? "page" : undefined}
                aria-haspopup="true"
                aria-expanded={openMenu === "biz"}
                onFocus={() => openNow("biz")}
              >
                {t("businesses")}
              </Link>
              <div className={`nav-drop${openMenu === "biz" ? " is-open" : ""}`} aria-hidden={openMenu !== "biz"}>
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
