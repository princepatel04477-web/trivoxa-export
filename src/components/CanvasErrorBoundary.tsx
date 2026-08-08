"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import ParticleFallback from "@/components/ParticleFallback";

interface CanvasErrorBoundaryProps {
  /** Which canvas system this guards — appears in the console line so a
   *  degraded surface is identifiable without a stack read. */
  system: string;
  /** What to render instead of the canvas once it has thrown. Defaults to the
   *  static field — the same design state reduced-motion and no-WebGL clients
   *  already land on, so a degraded page is never a blank rectangle. */
  fallback?: ReactNode;
  /** Fired once, when the subtree is torn down. Some hosts style themselves
   *  around a live canvas (hiding their own static substitute while it runs);
   *  without this they would keep that state after the canvas had gone. */
  onFail?: () => void;
  children: ReactNode;
}

interface CanvasErrorBoundaryState {
  failed: boolean;
}

/**
 * The blast wall between a decorative canvas and the page it decorates.
 *
 * Every WebGL surface on this site is ornamental: the copy, the navigation and
 * the forms are all complete without it. Before this existed a throw anywhere
 * inside a canvas subtree — a shader that failed to compile, a null returned
 * from getContext, a NaN that reached buffer sizing — unmounted the whole React
 * tree above it and took the route down with it. A decorative layer must never
 * be able to do that, so this is permanent and not conditional on any flag.
 *
 * Scope note: React error boundaries only see throws raised during render,
 * during a lifecycle, or inside a constructor. A rejection from an async scene
 * factory or a throw inside a requestAnimationFrame tick never reaches here —
 * those are caught at their own source (see ParticleCanvas's .catch and the
 * engine's degrade path). This covers the synchronous half; together they cover
 * the surface.
 */
export default class CanvasErrorBoundary extends Component<
  CanvasErrorBoundaryProps,
  CanvasErrorBoundaryState
> {
  state: CanvasErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): CanvasErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Loud, but only here. The page stays interactive, so this is the only
    // signal that anything degraded at all.
    console.error(
      `[CanvasErrorBoundary] "${this.props.system}" threw and was unmounted. The page remains interactive; the static fallback is now showing.`,
      error,
      info.componentStack
    );
    this.props.onFail?.();
  }

  render(): ReactNode {
    if (this.state.failed) {
      return this.props.fallback ?? <ParticleFallback />;
    }
    return this.props.children;
  }
}
