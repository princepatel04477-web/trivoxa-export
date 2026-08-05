"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { gsap } from "@/lib/gsap";
import { DURATION, EASE } from "@/lib/motion";
import { revealBody } from "@/hooks/useScrollAnimations";
import { Eyebrow } from "@/components/trivoxa/ui";

export interface LeadershipPanelProps {
  /** Section landmark label (e.g. "Leadership") — rendered as the section's
   * heading so it appears in heading-navigation, matching every other
   * flat section on the page. Set only on the first panel of a founders
   * wall so the wall reads as one section with one landmark. */
  eyebrow?: string;
  /** Omit photoSrc until a real portrait is ready — the panel collapses to a
   * single-column, text-only layout rather than showing a "profile pending"
   * placeholder in the photo's place. Name/role/message stay real either way. */
  name?: string;
  role?: string;
  email?: string;
  photoSrc?: string;
  message: string;
  align: "left" | "right";
}

/** Full-viewport founders-wall panel. Portrait mask-reveals in on scroll and
 * desaturates by default, resolving to color on hover; text staggers in
 * beside it. Alternate `align` to mirror portrait/text sides down the wall. */
export default function LeadershipPanel({ eyebrow, name, role, email, photoSrc, message, align }: LeadershipPanelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const portraitRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const ctx = gsap.context(() => {
      revealBody(ref.current!);
      if (portraitRef.current) {
        gsap.fromTo(
          portraitRef.current,
          { clipPath: "inset(100% 0 0 0)" },
          {
            clipPath: "inset(0% 0 0 0)",
            duration: DURATION.long,
            ease: EASE.entry,
            scrollTrigger: {
              trigger: portraitRef.current,
              start: "top 85%",
              invalidateOnRefresh: true,
            },
          }
        );
      }
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <section
      className={`leadership-panel leadership-panel--${align}${photoSrc ? "" : " leadership-panel--no-photo"}`}
      ref={ref}
    >
      {photoSrc && (
        <div ref={portraitRef} className="leadership-panel__portrait">
          {/* .leadership-panel__portrait is a fixed 90vh box, so fill holds
              the layout regardless of when the portrait decodes. */}
          <Image
            src={photoSrc}
            alt={name ?? "Leadership portrait"}
            fill
            sizes="(max-width: 900px) 100vw, 50vw"
          />
        </div>
      )}
      <div className="leadership-panel__text">
        {eyebrow && (
          <h2 data-reveal-body className="leadership-panel__eyebrow">
            <Eyebrow>{eyebrow}</Eyebrow>
          </h2>
        )}
        {name && (
          <h3 data-reveal-body className="leadership-panel__name">
            {name}
          </h3>
        )}
        {role && (
          <p data-reveal-body className="leadership-panel__role">
            {role}
          </p>
        )}
        {email && (
          <a data-reveal-body href={`mailto:${email}`} className="leadership-panel__email">
            {email}
          </a>
        )}
        <blockquote data-reveal-body className="leadership-panel__message">
          <p>{message}</p>
        </blockquote>
      </div>
    </section>
  );
}
