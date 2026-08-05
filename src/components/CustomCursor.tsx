"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { DURATION, EASE, PERIOD } from "@/lib/motion";

const INTERACTIVE_SELECTOR = "a, button, [role='button'], input, textarea, select, [data-cursor-hover]";

export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    if (isTouch || !dotRef.current || !ringRef.current) return;

    document.documentElement.classList.add("has-custom-cursor");

    const ctx = gsap.context(() => {
      const dot = dotRef.current!;
      const ring = ringRef.current!;

      gsap.set([dot, ring], { xPercent: -50, yPercent: -50 });

      // PERIOD, not DURATION: these are pointer-tracking time constants — how far
      // behind the cursor the dot and ring sit — not transition durations. Putting
      // them on the transition ladder would detach the dot from the pointer.
      const setDotX = gsap.quickTo(dot, "x", { duration: PERIOD.trackTight, ease: EASE.entry });
      const setDotY = gsap.quickTo(dot, "y", { duration: PERIOD.trackTight, ease: EASE.entry });
      const setRingX = gsap.quickTo(ring, "x", { duration: PERIOD.trackLoose, ease: EASE.entry });
      const setRingY = gsap.quickTo(ring, "y", { duration: PERIOD.trackLoose, ease: EASE.entry });

      const onMove = (e: MouseEvent) => {
        setDotX(e.clientX);
        setDotY(e.clientY);
        setRingX(e.clientX);
        setRingY(e.clientY);
      };
      window.addEventListener("mousemove", onMove);

      const onOver = (e: MouseEvent) => {
        if ((e.target as HTMLElement).closest(INTERACTIVE_SELECTOR)) {
          gsap.to(ring, { width: 48, height: 48, opacity: 0, duration: DURATION.short, ease: EASE.entry });
        }
      };
      const onOut = (e: MouseEvent) => {
        if ((e.target as HTMLElement).closest(INTERACTIVE_SELECTOR)) {
          gsap.to(ring, { width: 32, height: 32, opacity: 1, duration: DURATION.short, ease: EASE.entry });
        }
      };
      document.addEventListener("mouseover", onOver);
      document.addEventListener("mouseout", onOut);

      return () => {
        window.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseover", onOver);
        document.removeEventListener("mouseout", onOut);
      };
    });

    return () => {
      document.documentElement.classList.remove("has-custom-cursor");
      ctx.revert();
    };
  }, []);

  return (
    <>
      <div ref={dotRef} className="custom-cursor-dot" aria-hidden="true" />
      <div ref={ringRef} className="custom-cursor-ring" aria-hidden="true" />
    </>
  );
}
