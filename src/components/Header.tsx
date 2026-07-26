"use client";
import { useTranslations } from "next-intl";

import { gsap } from "@/lib/gsap";
import { useCallback, useEffect, useRef, useState } from "react";
import { on } from "@/lib/site-events";
import { getLenis } from "@/components/providers/LenisProvider";
import { Link, usePathname } from "@/i18n/navigation";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Logo } from "@/components/brand/Logo";
import { HEADER_CONDENSE_AT, navLogoTone } from "@/lib/logo";

/** External URL of the dedicated Trivoxa Digital site. */
const DIGITAL_URL = "https://digital.trivoxagroup.com";

/** "The Group" simple dropdown — anchors into /group/ chapters. */
const groupDropdown = [
  { key: "story", href: "/group/#our-story" },
  { key: "leadership", href: "/group/#leadership" },
  { key: "foundation", href: "/group/#foundation" },
  { key: "vision", href: "/group/#vision" },
  { key: "commitments", href: "/group/#commitments" },
] as const;

/** "Businesses" mega-menu — exactly two columns (spec §1). */
const productColumn = [
  { key: "textileApparel", href: "/businesses/product-exports/textile-apparel/" },
  { key: "healthcarePharma", href: "/businesses/product-exports/healthcare-pharmaceuticals/" },
  { key: "buildingMaterials", href: "/businesses/product-exports/building-materials/" },
  { key: "agricultureFood", href: "/businesses/product-exports/agriculture-food/" },
  { key: "engineeringIndustrial", href: "/businesses/product-exports/engineering-industrial/" },
  { key: "allProductExports", href: "/businesses/product-exports/" },
] as const;

const serviceColumn = [
  { key: "technology", href: "/businesses/service-exports/technology/" },
  { key: "ai", href: "/businesses/service-exports/ai/" },
  { key: "software", href: "/businesses/service-exports/software/" },
  { key: "designBranding", href: "/businesses/service-exports/design/" },
  { key: "digitalMarketing", href: "/businesses/service-exports/marketing/" },
  { key: "businessSupport", href: "/businesses/service-exports/business-support/" },
] as const;

type OpenMenu = "group" | "biz" | null;

export default function Header() {
  const t = useTranslations("nav");
  const tm = useTranslations("megaMenu");
  const pathname = usePathname();
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const closeTimer = useRef<number | null>(null);

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

  /** Active-trail detection for the underline + aria-current. */
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
  // take its tone from it. It flips once per crossing, not per frame.
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
      gsap.to(el, { yPercent: next ? -130 : 0, duration: 0.4, ease: "power2.out", overwrite: "auto" });
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
        {/* Left cluster — first half of the primary nav. */}
        <div className="h-left">
          <ul className="header-links header-links--left d-flex">
            <li className={isActive("/") && pathname === "/" ? "current-menu-item" : undefined}>
              <Link href="/" aria-current={pathname === "/" ? "page" : undefined}>
                {t("home")}
              </Link>
            </li>

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

            {/* Businesses — two-column mega-menu */}
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
            </li>

            <li className={isActive("/global-presence/") ? "current-menu-item" : undefined}>
              <Link href="/global-presence/" aria-current={isActive("/global-presence/") ? "page" : undefined}>
                {t("globalPresence")}
              </Link>
            </li>
          </ul>
        </div>

        {/* Centered logo. Always the full lockup, at the navbar height token —
            scrolling changes the tone, never the variant or the size. */}
        <div className="logo">
          <Link href="/" aria-label="Trivoxa Group — home">
            <Logo variant="full" slot="nav" tone={navLogoTone(condensed)} decorative />
          </Link>
        </div>

        {/* Right cluster — second half of the nav, then utilities. */}
        <div className="h-right">
          <ul className="header-links header-links--right d-flex">
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
            aria-expanded={undefined}
            onClick={() => {
              document.body.classList.toggle("nav-active");
            }}
          >
            <div />
            <div />
          </button>
          <Link className="mobile-contact" href="/rfq/" aria-label={t("requestQuote")}>
            <div>
              <img src="/images/icons/envelope-send.svg" alt="" />
            </div>
          </Link>
        </div>
      </div>

      {/* Businesses mega-menu panel — two columns only (spec §1). */}
      <div
        className={`mega-menu d-flex${openMenu === "biz" ? " is-open" : ""}`}
        aria-hidden={openMenu !== "biz"}
        onMouseEnter={() => openNow("biz")}
        onMouseLeave={scheduleClose}
        onBlur={blurGuard("biz")}
      >
        <div className="m-left" />
        <div className="m-right d-flex">
          <div className="mega-col">
            <Link href="/businesses/product-exports/" className="mega-col__title" tabIndex={openMenu === "biz" ? 0 : -1} onClick={() => setOpenMenu(null)}>
              {tm("productExports")}
            </Link>
            <ul className="sub-menu">
              {productColumn.map((link) => (
                <li key={link.key}>
                  <Link href={link.href} tabIndex={openMenu === "biz" ? 0 : -1} onClick={() => setOpenMenu(null)}>
                    {tm(link.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="mega-col">
            <Link href="/businesses/service-exports/" className="mega-col__title" tabIndex={openMenu === "biz" ? 0 : -1} onClick={() => setOpenMenu(null)}>
              {tm("serviceExports")}
            </Link>
            <ul className="sub-menu">
              {serviceColumn.map((link) => (
                <li key={link.key}>
                  <Link href={link.href} tabIndex={openMenu === "biz" ? 0 : -1} onClick={() => setOpenMenu(null)}>
                    {tm(link.key)}
                  </Link>
                </li>
              ))}
              <li className="mega-external">
                <a href={DIGITAL_URL} target="_blank" rel="noopener noreferrer" tabIndex={openMenu === "biz" ? 0 : -1}>
                  digital.trivoxagroup.com ↗
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
