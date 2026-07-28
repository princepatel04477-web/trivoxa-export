"use client";

import { useEffect, useRef, useState } from "react";
import { onPreloaderDone, markPreloaderDone, isPreloaderDone } from "@/lib/site-events";

export default function Preloader() {
  // `preloader:done` is latched for the life of the tab, so on a client-side
  // return to this route the overlay must not mount at all. It is an opaque,
  // full-bleed layer at z-index 1000 — remounting it would black the hero out
  // and swallow every click for the length of its fade, on a visit where
  // nothing is actually loading. Read once, in the initialiser, so the first
  // client render matches the server's (the flag is always false during SSR).
  const [visible] = useState(() => !isPreloaderDone());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible) return;
    let hideTimer = 0;
    const unsub = onPreloaderDone(() => {
      const el = ref.current;
      if (!el) return;
      // Clicks pass through the moment the fade starts — the second of opacity
      // is decorative, and the hero underneath is already live.
      el.style.pointerEvents = "none";
      el.style.transition = "opacity 1s";
      el.style.opacity = "0";
      hideTimer = window.setTimeout(() => {
        el.style.display = "none";
      }, 1000);
    });
    // Safety net: never leave the hero gated if the particle scene is slow to
    // load or WebGL is unavailable. markPreloaderDone() is latched/idempotent.
    const fallback = window.setTimeout(() => markPreloaderDone(), 1200);
    return () => {
      unsub();
      window.clearTimeout(fallback);
      window.clearTimeout(hideTimer);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div id="preloader" ref={ref}>
      <div id="loader" />
    </div>
  );
}
