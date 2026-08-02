"use client";

import dynamic from "next/dynamic";

// TrivoxaShell is a server component, so it cannot pass `ssr: false` itself —
// hence this client wrapper, the same shape ParticleCanvasWrapper already uses
// for the particle field. Without it the static import drags Three.js into the
// SSR bundle of every non-home route, for a component whose server output is
// unconditionally `null` (ShaderBackground returns null until `ready` flips
// after mount). Nothing rendered changes; the WebGL layer still mounts and
// animates exactly as before, just fetched after hydration.
const ShaderBackground = dynamic(() => import("@/components/ShaderBackground"), { ssr: false });

export default function ShaderBackgroundWrapper({ variant }: { variant: string }) {
  return <ShaderBackground variant={variant} />;
}
