"use client";

import { useEffect, useRef, useState } from "react";

export interface StatItem {
  value: number;
  suffix?: string;
  label: string;
}

/** Animated stat counters (spec §3 trust layer). The server-rendered value
 * is always the real, final number (progress defaults to 1) — ANT-01: a
 * visitor without JavaScript, or before hydration completes, must never see
 * "0" where a real figure belongs. With JS running and motion allowed, the
 * count-up is a decorative dip-then-rise on scroll into view; it enhances
 * the true value, it never supplies it. Reduced motion skips the dip. */
export default function PresenceStats({ stats }: { stats: StatItem[] }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(1); // 0..1 easing driver — starts at the correct, final value

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const DURATION = 1400;
        setProgress(0); // dip, then animate back up to the real value
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / DURATION);
          // easeOutCubic — the last digits settle instead of snapping.
          setProgress(1 - Math.pow(1 - t, 3));
          if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.35 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="presence-stats" ref={rootRef}>
      {stats.map((s) => (
        <div className="presence-stats__item" key={s.label}>
          <span className="presence-stats__value">
            {Math.round(s.value * progress)}
            {s.suffix ?? ""}
          </span>
          <span className="presence-stats__label">{s.label}</span>
        </div>
      ))}
    </div>
  );
}
