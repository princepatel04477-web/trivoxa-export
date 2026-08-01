"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { gsap } from "@/lib/gsap";
import { TitleChars, PChars } from "@/lib/split-text";

export interface CinematicPanelProps {
  id?: string;
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  cta: string;
  /** Sub-label chip row, pipe-separated in the bottom corner. */
  categories: string[];
  /** Still background — always rendered (poster, mobile, reduced-motion,
   * and while the video loads). */
  image: string;
  /** Optional looping background video. Lazy: only mounts on desktop for
   * users without prefers-reduced-motion, preload none, plays when the
   * panel scrolls into view. */
  videoSrc?: string;
  align?: "left" | "right";
}

/** Full-bleed 100vh cinematic division panel. Base `.arm-panel` styles live
 * in businesses-page.css (right-aligned variant, video bg, corner chips
 * included). */
export default function CinematicPanel({
  id,
  eyebrow,
  title,
  description,
  href,
  cta,
  categories,
  image,
  videoSrc,
  align = "left",
}: CinematicPanelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [wantsVideo, setWantsVideo] = useState(false);

  useEffect(() => {
    // Video only on desktop pointers without reduced-motion preference.
    if (!videoSrc) return;
    const ok =
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
      window.matchMedia("(min-width: 900px)").matches;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWantsVideo(ok);
  }, [videoSrc]);

  useEffect(() => {
    if (!ref.current) return;
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference) and (min-width: 900px)", () => {
        // Background parallax — slow drift against scroll.
        gsap.fromTo(
          ".arm-panel__bg",
          { yPercent: -8 },
          { yPercent: 8, ease: "none", scrollTrigger: { trigger: ref.current, scrub: true } }
        );
      });
      // Text entrance (same treatment as the homepage arms).
      gsap.fromTo(
        ref.current!.querySelectorAll(".word_inner"),
        { opacity: 0, filter: "blur(6px)" },
        { opacity: 1, filter: "blur(0px)", stagger: 0.03, scrollTrigger: { trigger: ref.current, start: "top 70%" } }
      );
      gsap.fromTo(
        ref.current!.querySelectorAll(".p_inner"),
        { opacity: 0 },
        { opacity: 1, stagger: 0.015, scrollTrigger: { trigger: ref.current, start: "top 70%" } }
      );
      // Lazy-play the video only while the panel is on screen.
      if (videoRef.current) {
        const video = videoRef.current;
        const io = new IntersectionObserver(
          ([entry]) => {
            if (entry.isIntersecting) video.play().catch(() => {});
            else video.pause();
          },
          { threshold: 0.15 }
        );
        io.observe(video);
        return () => io.disconnect();
      }
    }, ref);
    return () => ctx.revert();
  }, [wantsVideo]);

  return (
    <div id={id} ref={ref} className={`arm-panel${align === "right" ? " arm-panel--right" : ""}`}>
      <div className="arm-panel__bg" style={{ backgroundImage: `url(${image})` }}>
        {wantsVideo && videoSrc && (
          <video
            ref={videoRef}
            className="arm-panel__video"
            src={videoSrc}
            poster={image}
            muted
            loop
            playsInline
            preload="none"
            aria-hidden="true"
          />
        )}
      </div>
      <div className="arm-panel__overlay" />
      <div className="arm-panel__content">
        <span className="arm-panel__eyebrow">{eyebrow}</span>
        <h2 className="arm-panel__title title-anim">
          <TitleChars text={title} />
        </h2>
        <div className="arm-panel__thesis p-anim">
          <PChars text={description} />
        </div>
        <Link href={href} className="arm-panel__link">
          {cta} →
        </Link>
      </div>
      <div className="arm-panel__cats arm-panel__cats--corner">
        {categories.map((cat, i) => (
          <span key={cat} className="arm-panel__cat">
            {i > 0 && <span className="arm-panel__pipe">|</span>}
            {cat}
          </span>
        ))}
      </div>
    </div>
  );
}
