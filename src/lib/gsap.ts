"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
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

export { gsap, ScrollTrigger };
