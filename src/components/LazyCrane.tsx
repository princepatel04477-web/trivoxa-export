"use client";

import dynamic from "next/dynamic";
import type { CraneVariant } from "@/components/Crane";
import CanvasErrorBoundary from "@/components/CanvasErrorBoundary";

/** Lazy entry point for the crane (spec §2: lazy-load, stay under budget).
 * The SVG + GSAP timeline only ship when a page actually renders one. */
const Crane = dynamic(() => import("@/components/Crane"), { ssr: false });

export type { CraneVariant };

export default function LazyCrane(props: {
  variant: CraneVariant;
  className?: string;
  onComplete?: () => void;
}) {
  // `fallback={null}`: the crane is a flourish inside a form's success state and
  // on the presence page. If it dies the surrounding content is the point, and a
  // globe dropped into a "thank you" panel would be a non-sequitur.
  return (
    <CanvasErrorBoundary system={`Crane:${props.variant}`} fallback={null}>
      <Crane {...props} />
    </CanvasErrorBoundary>
  );
}
