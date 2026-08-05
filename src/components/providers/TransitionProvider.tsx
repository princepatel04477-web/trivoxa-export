"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { gsap } from "@/lib/gsap";
import { DURATION, EASE, TRANSITION } from "@/lib/motion";

/**
 * Page-to-page transition.
 *
 * A single panel travels UP across the viewport to cover the outgoing route,
 * and then keeps travelling in the same direction to reveal the incoming one.
 * One continuous gesture rather than two fades — the same continuity-of-
 * direction the hover rule is built on, at page scale.
 *
 * The App Router gives no "navigation started" event, so the cover has to be
 * driven from the click itself: internal link clicks are intercepted, the panel
 * closes, and only then is the navigation issued. `usePathname` changing is the
 * signal that the new route has committed, which is what opens the panel again.
 *
 * The particle canvas is `position: fixed` and outside the routed tree, so it
 * survives the swap untouched — the panel passes over it, the field does not
 * reinitialise, and no WebGL context is created or destroyed by a navigation.
 */
export default function TransitionProvider() {
  const panelRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  /** Set while a click-driven navigation is in flight. */
  const navigating = useRef(false);
  /** Skips the reveal on first paint — there is nothing to reveal from. */
  const mounted = useRef(false);
  const failSafe = useRef(0);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const reveal = () => {
      window.clearTimeout(failSafe.current);
      navigating.current = false;
      panel.dataset.active = "";
      gsap.killTweensOf(panel);
      // Continues UPWARD, off the top — it does not retreat back down the way
      // it came. Retreating would read as "nothing happened"; continuing reads
      // as having been carried somewhere.
      gsap.fromTo(
        panel,
        { yPercent: 0 },
        {
          yPercent: -100,
          duration: TRANSITION.reveal,
          ease: EASE.entry,
          onComplete: () => {
            // Re-parked below the viewport, ready for the next cover, and
            // un-promoted so the site is not holding a full-viewport layer
            // between navigations.
            gsap.set(panel, { yPercent: 100 });
            delete panel.dataset.active;
          },
        }
      );
    };

    const cover = (href: string) => {
      navigating.current = true;
      panel.dataset.active = "";
      gsap.killTweensOf(panel);
      gsap.fromTo(
        panel,
        { yPercent: 100 },
        {
          yPercent: 0,
          duration: TRANSITION.cover,
          ease: EASE.exit,
          onComplete: () => router.push(href),
        }
      );
      // If the route stalls, fails, or resolves to the path we are already on,
      // the pathname never changes and the reveal never fires. Without this the
      // reader is left staring at a black panel with no way out — the single
      // worst failure this component can have, so it is guarded explicitly
      // rather than assumed away.
      window.clearTimeout(failSafe.current);
      failSafe.current = window.setTimeout(reveal, TRANSITION.failSafeMs);
    };

    /**
     * Decides whether a click is ours to take.
     *
     * Every branch here is a way to break the site if it is missed: a modified
     * click must still open a tab, a download must still download, an external
     * link must still leave, and an in-page anchor must still scroll rather
     * than triggering a full navigation to the same page.
     */
    const onClick = (e: MouseEvent) => {
      if (navigating.current) return;
      if (e.defaultPrevented) return;
      if (e.button !== 0) return; // middle/right click
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // new tab/window, download

      const anchor = (e.target as Element | null)?.closest?.("a");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      if (anchor.dataset.noTransition !== undefined) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;

      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return; // external
      // Same page: an in-page anchor or a re-click on the current route. Let
      // the browser and Lenis handle it — covering the screen to arrive back
      // where you already are is the transition looking broken.
      if (url.pathname === window.location.pathname) return;

      e.preventDefault();
      cover(url.pathname + url.search + url.hash);
    };

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.clearTimeout(failSafe.current);
      gsap.killTweensOf(panel);
    };
  }, [router]);

  // The new route has committed. Open the panel.
  //
  // Also covers navigations this component never saw the click for — the back
  // and forward buttons, a programmatic push, a locale switch. Those arrive
  // with the panel already parked, so the reveal simply runs from off-screen
  // and costs nothing visible.
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    window.clearTimeout(failSafe.current);
    navigating.current = false;

    // One frame past the commit, so React has painted the incoming route before
    // the panel starts to lift off it. Revealing on the same frame shows the
    // outgoing page for a beat, which is the exact thing the panel is for.
    const id = requestAnimationFrame(() => {
      panel.dataset.active = "";
      gsap.killTweensOf(panel);
      gsap.fromTo(
        panel,
        { yPercent: 0 },
        {
          yPercent: -100,
          duration: TRANSITION.reveal,
          ease: EASE.entry,
          onComplete: () => {
            gsap.set(panel, { yPercent: 100 });
            delete panel.dataset.active;
          },
        }
      );
      // The incoming content settles the last of the way in under the panel, so
      // arrival has a beat of its own instead of the panel uncovering a screen
      // that is already finished. Transform and opacity only.
      const root = document.querySelector("main") ?? document.body.firstElementChild;
      if (root) {
        gsap.fromTo(
          root,
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: DURATION.standard, ease: EASE.entry, clearProps: "opacity,transform" }
        );
      }
    });
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  return <div ref={panelRef} className="tvx-transition" aria-hidden="true" />;
}
