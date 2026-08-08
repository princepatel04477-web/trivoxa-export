"use client";

import dynamic from "next/dynamic";
import CanvasErrorBoundary from "@/components/CanvasErrorBoundary";

// TrivoxaShell is a server component, so it cannot pass `ssr: false` itself —
// hence this client wrapper, the same shape ParticleCanvasWrapper already uses
// for the particle field. Without it the static import drags Three.js into the
// SSR bundle of every non-home route, for a component whose server output is
// unconditionally `null` (ShaderBackground returns null until `ready` flips
// after mount). Nothing rendered changes; the WebGL layer still mounts and
// animates exactly as before, just fetched after hydration.
const ShaderBackground = dynamic(() => import("@/components/ShaderBackground"), { ssr: false });

export default function ShaderBackgroundWrapper({ variant }: { variant: string }) {
  // `fallback={null}` deliberately: this layer is an ambient film behind the
  // page, and its healthy absent-state is already nothing at all (ShaderBackground
  // returns null until it is ready). Substituting the particle globe here would
  // paint a shape the route never asked for.
  return (
    <CanvasErrorBoundary system={`ShaderBackground:${variant}`} fallback={null}>
      <ShaderBackground variant={variant} />
    </CanvasErrorBoundary>
  );
}
