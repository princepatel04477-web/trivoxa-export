"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
import { DURATION, EASE } from "@/lib/motion";
import { onPreloaderDone, markPreloaderDone, isPreloaderDone } from "@/lib/site-events";

/**
 * A COUNTER, not a spinner.
 *
 * The two say different things. A spinner says "something is happening and you
 * cannot tell how long"; a counter says "this is a measured amount of work and
 * here is where it has got to". On a site whose opening is a three-second
 * camera push into a 34,000-point field, the counter is also the thing that
 * makes the wait feel authored rather than incurred — it is the first frame of
 * the sequence, not an apology for it.
 *
 * Deliberately plain: a wordmark, a rule that fills, and a percentage. The
 * brand is a credibility promise, so the loading screen is the one place on the
 * site with no flourish at all.
 */

/** Where the synthetic ramp parks while it waits for the real ready signal. */
const RAMP_CEILING = 92;
/** How long the ramp takes to reach the ceiling. */
const RAMP_SECONDS = 2.2;

export default function Preloader() {
  // `preloader:done` is latched for the life of the tab, so on a client-side
  // return to this route the overlay must not mount at all. It is an opaque,
  // full-bleed layer at z-index 1000 — remounting it would black the hero out
  // and swallow every click for the length of its fade, on a visit where
  // nothing is actually loading. Read once, in the initialiser, so the first
  // client render matches the server's (the flag is always false during SSR).
  const [visible] = useState(() => !isPreloaderDone());
  const ref = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible) return;
    const el = ref.current;
    const countEl = countRef.current;
    const barEl = barRef.current;
    if (!el || !countEl || !barEl) return;

    let hideTimer = 0;
    // The scene reports one thing — ready — and reports it once, so there is no
    // genuine 0..100 progress stream to display. Rather than invent a fake one
    // that claims precision it does not have, the counter runs a decelerating
    // ramp that PARKS below 100 and only completes when the real signal lands.
    // It therefore never overstates: the number can stall, and it can only
    // reach 100 when the page actually is ready.
    const progress = { value: 0 };
    const paint = () => {
      const n = Math.round(progress.value);
      countEl.textContent = String(n);
      barEl.style.transform = `scaleX(${progress.value / 100})`;
    };
    paint();

    const ramp = gsap.to(progress, {
      value: RAMP_CEILING,
      duration: RAMP_SECONDS,
      ease: "power1.out",
      onUpdate: paint,
    });

    const dismiss = () => {
      ramp.kill();
      gsap
        .timeline()
        .to(progress, {
          value: 100,
          duration: DURATION.short,
          ease: EASE.emphatic,
          onUpdate: paint,
        })
        .to(el, {
          autoAlpha: 0,
          duration: DURATION.standard,
          ease: EASE.travel,
          // Clicks pass through the moment the fade starts — the fade is
          // decorative and the hero underneath it is already live.
          onStart: () => {
            el.style.pointerEvents = "none";
          },
        });
      hideTimer = window.setTimeout(
        () => {
          el.style.display = "none";
        },
        (DURATION.short + DURATION.standard) * 1000 + 60
      );
    };

    const unsub = onPreloaderDone(dismiss);

    // Safety net: never leave the hero gated if the particle scene fails to
    // report ready.
    //
    // NOT TRANSITION.failSafeMs (2500ms), and knowingly so. The scene's own
    // compile gate is allowed up to COMPILE_GATE_MAX_MS (2500ms) before it
    // starts regardless, and the hero copy then waits a further 900ms reveal
    // beat — so a 2500ms fail-safe here would fire BEFORE a legitimate cold
    // start had finished, on every cold start, and the "safety net" would
    // become the normal path. 3600ms clears the gate's own worst case with
    // margin and is still a bounded wait.
    const fallback = window.setTimeout(() => markPreloaderDone(), 3600);
    return () => {
      unsub();
      ramp.kill();
      window.clearTimeout(fallback);
      window.clearTimeout(hideTimer);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div id="preloader" ref={ref} role="status" aria-live="polite" aria-label="Loading">
      <div className="preloader-inner">
        <div className="preloader-mark">TRIVOXA</div>
        <div className="preloader-rule">
          <div className="preloader-rule__fill" ref={barRef} />
        </div>
        <div className="preloader-count">
          <span ref={countRef}>0</span>%
        </div>
      </div>
    </div>
  );
}
