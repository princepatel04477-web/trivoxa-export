"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { DURATION, EASE, SCRUB } from "@/lib/motion";
import { CircleProgressIcon } from "@/components/icons";
import { on } from "@/lib/site-events";
import { getLenis } from "@/components/providers/LenisProvider";

const C = 153.93;

export default function ScrollTopWidget() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!wrapperRef.current) return;

    let cleanup: (() => void) | undefined;
    let ctx: gsap.Context | undefined;

    const init = () => {
      if (cleanup) cleanup();
      if (ctx) ctx.revert();

      ctx = gsap.context(() => {
        const circleFill = wrapperRef.current?.querySelector<SVGCircleElement>(".circle-fill");
        const lenis = getLenis();

        const setProgress = (scroll: number, limit: number) => {
          const progress = limit > 0 ? 1 - scroll / limit : 1;
          if (circleFill) {
            circleFill.style.strokeDashoffset = String(C * (1 - progress));
          }
        };

        const onLenisScroll = ({ scroll, limit }: { scroll: number; limit: number }) => setProgress(scroll, limit);
        const onNativeScroll = () =>
          setProgress(window.scrollY, document.documentElement.scrollHeight - window.innerHeight);

        if (lenis) {
          lenis.on("scroll", onLenisScroll);
          setProgress(lenis.scroll, lenis.limit);
        } else {
          window.addEventListener("scroll", onNativeScroll);
          onNativeScroll();
        }

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: ".footer",
            start: "top bottom",
            end: "bottom bottom",
            scrub: SCRUB,
            invalidateOnRefresh: true,
          },
        });
        if (arrowRef.current) {
          // ease: none on a scrub-linked child — the scroll supplies the curve.
          tl.to(arrowRef.current, { rotation: 180, duration: DURATION.long, ease: EASE.scrub }, 0);
        }
        tl.to(
          wrapperRef.current,
          {
            cursor: "pointer",
            pointerEvents: "auto",
            duration: DURATION.long,
            ease: EASE.scrub,
          },
          0
        );

        const clickHandler = () => {
          const current = getLenis();
          if (current) current.scrollTo(0, { duration: DURATION.long });
          else window.scrollTo({ top: 0, behavior: "smooth" });
        };
        wrapperRef.current?.addEventListener("click", clickHandler);

        cleanup = () => {
          if (lenis) lenis.off("scroll", onLenisScroll);
          else window.removeEventListener("scroll", onNativeScroll);
          wrapperRef.current?.removeEventListener("click", clickHandler);
          tl.kill();
        };
      }, wrapperRef);
    };

    init();
    const unsub = on("lenis:init", init);

    return () => {
      unsub();
      if (cleanup) cleanup();
      if (ctx) ctx.revert();
    };
  }, []);

  return (
    <div ref={wrapperRef} className="scroll-wrapper">
      <div className="scroll">
        <CircleProgressIcon />
        <div ref={arrowRef} className="arrow">
          <img src="/images/icons/chevron-down-lg.svg" alt="" />
        </div>
      </div>
    </div>
  );
}
