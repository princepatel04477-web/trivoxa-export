import type { CSSProperties } from "react";

import "@/app/styles/logo.css";
import type { LogoTone } from "@/lib/logo";
import { LOGO_GEOMETRY, type LogoVariant } from "./logo-geometry";

/**
 * Sized slots. A slot picks its height from a token in logo.css; pages never
 * size the logo themselves. Omit it only for decorative placements that own
 * their own dimensions (the CTA watermark, the crane's logo plate).
 */
export type LogoSlot = "nav" | "footer";

export interface LogoProps {
  /**
   * `full` — eagle + TRIVOXA + GROUP (navbar and footer, site-wide).
   * `wordmark` — eagle + TRIVOXA.
   * `mark` — eagle only, for tight or collapsed spots.
   */
  variant?: LogoVariant;
  /**
   * Tone of the SURFACE the logo stands on — `dark` renders the light logo.
   * Omit to inherit whatever `currentColor` the container already carries.
   */
  tone?: LogoTone;
  /** Sized slot; drives height from a token rather than from page CSS. */
  slot?: LogoSlot;
  /**
   * Hide from assistive tech. Use when an ancestor (a labelled home link, a
   * captioned section) already names the brand, so it isn't announced twice.
   */
  decorative?: boolean;
  className?: string;
  style?: CSSProperties;
  /**
   * SVG placement passthrough, for nesting the lockup inside another `<svg>`
   * (the crane's hoisted logo plate). Ignored in normal HTML placements.
   */
  x?: number;
  y?: number;
  width?: number | string;
  height?: number | string;
  preserveAspectRatio?: string;
}

const ACCESSIBLE_NAME = "Trivoxa Group";

/**
 * The Trivoxa logo — the single source of truth for the mark anywhere on the
 * site. Nothing else may render it.
 *
 * The geometry is inline SVG filled with `currentColor`, so the lockup is
 * always legible on whatever it is placed over: set the tone (or just let it
 * inherit the section's text colour) and the eagle and wordmark follow. No
 * colour is named on the logo, here or in logo.css — both resolve through the
 * existing theme tokens.
 *
 * Holes (the eagle's eye, the counters in R/O/A/G/P) come from a single
 * compound path under `fill-rule="evenodd"`, which is why there is one `<path>`
 * per variant rather than one per shape.
 */
export function Logo({
  variant = "full",
  tone,
  slot,
  decorative = false,
  className,
  style,
  x,
  y,
  width,
  height,
  preserveAspectRatio,
}: LogoProps) {
  const geometry = LOGO_GEOMETRY[variant];
  const classes = [
    "tvx-logo",
    slot ? `tvx-logo--${slot}` : null,
    tone ? `tvx-logo--on-${tone}` : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <svg
      className={classes}
      style={style}
      viewBox={`0 0 ${geometry.width} ${geometry.height}`}
      x={x}
      y={y}
      width={width ?? geometry.width}
      height={height ?? geometry.height}
      preserveAspectRatio={preserveAspectRatio}
      xmlns="http://www.w3.org/2000/svg"
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : ACCESSIBLE_NAME}
      focusable="false"
    >
      <path d={geometry.d} fill="currentColor" fillRule="evenodd" />
    </svg>
  );
}

export default Logo;
