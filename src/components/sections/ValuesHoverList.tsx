"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { gsap } from "@/lib/gsap";
import { revealBody } from "@/hooks/useScrollAnimations";
import { BEZIER, DURATION } from "@/lib/motion";

const VALUE_KEYS = ["curiosity", "integrity", "innovation", "growth"] as const;

export default function ValuesHoverList() {
  const tr = useTranslations("home.values");
  const VALUES = VALUE_KEYS.map((k) => ({
    t: tr(`${k}Title`),
    d: tr(`${k}Desc`),
  }));
  const [hovered, setHovered] = useState<number | null>(null);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const ctx = gsap.context(() => {
      revealBody(ref.current!);
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <section className="hp-values values-hover" ref={ref}>
      <div className="container">
        <div className="values-hover__list" onMouseLeave={() => setHovered(null)}>
          {VALUES.map((v, i) => (
            <div
              key={v.t}
              data-reveal-body
              className={`values-hover__row${hovered === i ? " is-active" : ""}${hovered !== null && hovered !== i ? " is-dimmed" : ""}`}
              onMouseEnter={() => setHovered(i)}
            >
              <span className="values-hover__index">{String(i + 1).padStart(2, "0")}</span>
              <span className="values-hover__title">{v.t}</span>
              <AnimatePresence>
                {hovered === i && (
                  <motion.span
                    className="values-hover__desc"
                    initial={{ opacity: 0, x: 32 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 32 }}
                    transition={{ duration: DURATION.short, ease: BEZIER.entry }}
                  >
                    {v.d}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
