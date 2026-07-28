"use client";

import { type ReactNode, useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import { MotionConfig } from "framer-motion";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { on, emit } from "@/lib/site-events";

let lenisInstance: Lenis | null = null;
export function getLenis(): Lenis | null {
  return lenisInstance;
}

export default function LenisProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Lenis + every ScrollTrigger outlive client-side navigations (this provider
  // sits in the root layout), so without this the new page inherits the old
  // page's scroll offset and stale trigger positions — content gated behind
  // scroll-reveal animations stays hidden until a hard refresh. On each route
  // change: snap back to the top (unless deep-linking to an anchor) and
  // re-measure triggers after the new page has painted.
  useEffect(() => {
    if (!window.location.hash) {
      const lenis = lenisInstance;
      if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
      else window.scrollTo(0, 0);
    }
    const id = window.setTimeout(() => ScrollTrigger.refresh(), 100);
    return () => window.clearTimeout(id);
  }, [pathname]);

  // Webfonts land after first paint and reflow every block they touch, which
  // moves every trigger boundary measured before they arrived — the symptom is
  // an animation firing a few hundred pixels early or late on a cold load and
  // being "fixed" by a resize. Re-measure once the font set is settled.
  // Runs unconditionally: triggers exist under reduced motion too (pinned
  // sections, sticky rails), so this must not sit behind the Lenis guard.
  useEffect(() => {
    if (!("fonts" in document)) return;
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (!cancelled) ScrollTrigger.refresh();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;

    const lenis = new Lenis({
      lerp: 0.09,
      duration: 1.2,
      smoothWheel: true,
    });
    lenisInstance = lenis;
    emit("lenis:init");

    lenis.on("scroll", ScrollTrigger.update);

    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    const unsubOpen = on("modal:open", () => lenis.stop());
    const unsubClose = on("modal:close", () => lenis.start());

    ScrollTrigger.refresh();

    return () => {
      unsubOpen();
      unsubClose();
      gsap.ticker.remove(raf);
      lenis.destroy();
      lenisInstance = null;
    };
  }, []);

  // Framer Motion (used by the job board, product drawer, category tables,
  // RFQ form, world map and values list) defaults to `reducedMotion: "never"`
  // — it ignores the OS setting unless told otherwise. Those seven components
  // were therefore the one part of the site still animating for a reader who
  // had opted out. "user" makes Framer honour the media query itself, so
  // transform and layout animations resolve to their end state while opacity
  // fades are kept (the accessible behaviour Framer documents).
  //
  // This configures the animation library already in the codebase; it does not
  // introduce one, and nothing here touches the GSAP/Lenis stack above.
  return (
    <MotionConfig reducedMotion="user">
      {children}
    </MotionConfig>
  );
}
