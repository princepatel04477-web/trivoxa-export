"use client";

import { type ReactNode, useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import { MotionConfig } from "framer-motion";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { LENIS } from "@/lib/motion";
import { on, emit } from "@/lib/site-events";

let lenisInstance: Lenis | null = null;
export function getLenis(): Lenis | null {
  return lenisInstance;
}

export default function LenisProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    sessionStorage.removeItem("trivoxa:chunk-reload");
  }, [pathname]);

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
  //
  // §8.3: fonts ready PLUS one rAF. `fonts.ready` resolves when the font set is
  // loaded, not when the reflow it causes has been laid out — refreshing in the
  // same frame measures the pre-reflow boxes, which is the measurement error
  // §8 exists to close. One frame later the layout is settled. Exactly one
  // refresh, never a loop.
  useEffect(() => {
    if (!("fonts" in document)) return;
    let cancelled = false;
    let raf = 0;
    document.fonts.ready.then(() => {
      if (cancelled) return;
      raf = requestAnimationFrame(() => {
        if (!cancelled) ScrollTrigger.refresh();
      });
    });
    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // §8.1 — scroll authority. The browser restores the previous scroll offset on
  // reload BEFORE any trigger exists, so a reader who reloads midway down the
  // page lands past the intro and the scrubbed sequence resolves to whatever
  // stage that offset selects. Taking manual control and forcing the top is
  // what makes "first load" and "reload" the same event.
  //
  // Set in its own effect, ahead of the Lenis effect below, so the offset is
  // already zero before a single ScrollTrigger is created.
  useEffect(() => {
    if (!("scrollRestoration" in history)) return;
    const previous = history.scrollRestoration;
    history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    return () => {
      history.scrollRestoration = previous;
    };
  }, []);

  // §8.5 — bfcache restore. A back-navigation out of the bfcache resumes a
  // fully-built page with its old scroll offset and its triggers already
  // resolved, so nothing re-runs and the reader arrives at a formed state with
  // no sequence. Reset to the top and re-measure once; the scene's own
  // pageshow handler resets its uniforms to stage zero and re-runs its gate.
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      const lenis = lenisInstance;
      if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
      else window.scrollTo(0, 0);
      requestAnimationFrame(() => ScrollTrigger.refresh());
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;

    // A mobile browser fires `resize` every time the URL bar moves, and every
    // one of those makes ScrollTrigger re-measure the whole page mid-scroll.
    // That refresh storm is indistinguishable from scrub jitter at the point of
    // use. Height-driven refreshes are the ones being suppressed; a real
    // rotation still refreshes, because it changes the width.
    ScrollTrigger.config({ ignoreMobileResize: true });

    // ONE smoothing mode. `lerp` and `duration` are alternatives in Lenis, not
    // complements — it takes the duration+easing path when `duration` is set
    // and the exponential-lerp path otherwise — so passing both left the shipped
    // feel dependent on which branch the installed version happened to take.
    // The duration path is what reproduces ScrollSmoother's weighted glide.
    const lenis = new Lenis({ ...LENIS });
    lenisInstance = lenis;
    emit("lenis:init");

    // ONE update loop, and one only.
    //
    // Lenis defaults to `autoRaf: false`, so it runs no rAF of its own; GSAP's
    // ticker drives it and ScrollTrigger updates from Lenis's own scroll event.
    // Two loops contending for the same surface is the primary cause of scrub
    // jitter — verify this stays a single path before adding anything here.
    // ScrollTrigger.normalizeScroll is deliberately NOT enabled, and this is a
    // knowing departure from the amplitude directive's item 9.3.
    //
    // normalizeScroll takes over wheel/touch handling and drives the scroll
    // position itself. So does Lenis. Two normalizers on one surface is the
    // documented incompatibility, and enabling both produces exactly the
    // symptom item 9.3 exists to remove — a scrub that fights the scroll — with
    // touch on mobile the worst affected.
    //
    // The stated goal (iOS address-bar jitter must not reach the scrubbed
    // morph) is already met by other means and both are in force here:
    // `ignoreMobileResize` above suppresses the refresh storm the URL bar
    // causes, and the scene's own re-fit ignores height-only deltas below
    // CHROME_HEIGHT_TOLERANCE_PX on a coarse pointer. Revisit only if Lenis is
    // ever removed.
    lenis.on("scroll", ScrollTrigger.update);

    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);

    // §5.1 — lag smoothing RESTORED. This is the primary cold-start defect.
    //
    // `lagSmoothing(0)` is the line almost every Lenis integration ships with,
    // and it removes GSAP's only protection against a long frame. On a cold
    // cache the main thread stalls for one to four seconds while shader
    // programs link, attribute buffers upload and fonts decode; when the ticker
    // resumes, the first tick hands the whole stalled interval to every running
    // tween as a single delta. A 2.1s opening assemble consumes its entire
    // duration in that one frame and the form is simply *there* — no assemble,
    // no settling, the machine revealed on exactly the load where it matters
    // most. Reload is cached, the stall does not occur, and it "works" — which
    // is the asymmetry that makes this so easy to miss.
    //
    // Lenis does not require smoothing disabled. It is driven from this ticker
    // either way; with smoothing intact a >500ms frame is clamped to 33ms
    // instead of being passed through whole.
    //
    // The amplitude directive asks for lagSmoothing(500, 33) in its item 9.3
    // and for lagSmoothing(0) in its item 9.4 — the two contradict, and 9.4's
    // is the boilerplate every Lenis integration ships with. (500, 33) is the
    // one kept, for the reason above: it is the whole defence against a cold
    // start depositing the 2.1s assemble in a single frame, and the scrubbed
    // morph the directive is trying to protect is driven by scroll position,
    // not by ticker delta, so smoothing cannot desynchronise it.
    gsap.ticker.lagSmoothing(500, 33);

    const unsubOpen = on("modal:open", () => lenis.stop());
    const unsubClose = on("modal:close", () => lenis.start());

    // §8.1/§8.2 — fixed initialisation order: Lenis exists, scroll wiring is
    // attached, the offset is forced to zero, and only then is anything
    // measured. Triggers are created by the scenes themselves (which defer to
    // their own rAF), so this is the one refresh that closes the sequence.
    lenis.scrollTo(0, { immediate: true, force: true });
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
