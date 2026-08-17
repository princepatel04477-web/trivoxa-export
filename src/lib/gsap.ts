"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
// SplitText ships inside the `gsap` package already in dependencies — it has
// been part of the free core since 3.13, so this adds no dependency and no
// licence obligation. Registered here rather than at each call site so there is
// one place the plugin list can be read.
import { SplitText } from "gsap/SplitText";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText);
}

/** JS behavior breakpoints used by advida.com (window.innerWidth at load). */
export const BP = {
  /** Lenis-driven pinned slider, mega menu */
  desktop: 991,
  /** left-text parallax, sec-4 follower */
  tablet: 767,
  /** hero scroll-to fade */
  mobile: 575,
} as const;

export { gsap, ScrollTrigger, SplitText };
