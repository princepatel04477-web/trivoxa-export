import Link from "next/link";
import type { ReactNode } from "react";
import ActionButtons, { type Action } from "@/components/trivoxa/ActionButtons";
import SectionGrain from "@/components/patterns/SectionGrain";
import { Logo } from "@/components/brand/Logo";

export type { Action };

export function Eyebrow({ children }: { children: ReactNode }) {
  return <span className="tvx-eyebrow">{children}</span>;
}

/** Split a multi-paragraph string (\n\n separated) into <p> elements. */
function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {text.split("\n\n").map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </>
  );
}

export function PageHero({
  eyebrow,
  title,
  description,
  actions,
  crumb,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: Action[];
  crumb?: { label: string; href?: string }[];
}) {
  return (
    <section className="tvx-hero">
      <SectionGrain className="hero-grain" />
      <div className="container">
        <div className="tvx-hero__inner">
          {crumb && (
            <div className="tvx-crumb">
              {crumb.map((c, i) => (
                <span key={i} style={{ display: "contents" }}>
                  {i > 0 && <span>/</span>}
                  {c.href ? <Link href={c.href}>{c.label}</Link> : <span>{c.label}</span>}
                </span>
              ))}
            </div>
          )}
          {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
          <h1>{title}</h1>
          {description && (
            <div className="tvx-hero-desc">
              <Paragraphs text={description} />
            </div>
          )}
          {actions && <ActionButtons actions={actions} />}
        </div>
      </div>
    </section>
  );
}

export function Section({
  eyebrow,
  title,
  lead,
  children,
  tight,
  id,
}: {
  eyebrow?: string;
  title?: string;
  lead?: string;
  children?: ReactNode;
  tight?: boolean;
  id?: string;
}) {
  return (
    <section className={`tvx-section${tight ? " tvx-section--tight" : ""}`} id={id}>
      <div className="container">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        {title && <h2>{title}</h2>}
        {lead && (
          <div className="tvx-lead">
            <Paragraphs text={lead} />
          </div>
        )}
        {children}
      </div>
    </section>
  );
}

export function Checklist({ items }: { items: string[] }) {
  return (
    <div className="tvx-checklist">
      {items.map((t, i) => (
        <div key={i} className="tvx-check">
          {t}
        </div>
      ))}
    </div>
  );
}

export function Steps({ items, row }: { items: { title: string; desc?: string }[]; row?: boolean }) {
  return (
    <div className={`tvx-steps${row ? " tvx-steps--row" : ""}`}>
      {items.map((s, i) => (
        <div key={i} className="tvx-step">
          <div className="tvx-step__n">{String(i + 1).padStart(2, "0")}</div>
          <h4>{s.title}</h4>
          {s.desc && <p>{s.desc}</p>}
        </div>
      ))}
    </div>
  );
}

export function Pills({ items }: { items: string[] }) {
  return (
    <div className="tvx-pills">
      {items.map((p, i) => (
        <span key={i} className="tvx-pill">
          {p}
        </span>
      ))}
    </div>
  );
}

/**
 * THE closing band. Every route ends on one.
 *
 * It used to render a flat, 10%-opacity SVG eagle watermark behind the
 * headline. The particle field's own eagle finale converges at the same point
 * on the same page — so every CTA carried TWO eagles at slightly different
 * scales and orientations, one of them a static grey ghost sitting on top of
 * the mark the whole choreography exists to arrive at. The particle formation
 * is the only eagle.
 *
 * Deleted rather than hidden. `display: none` and `opacity: 0` both still ship
 * the geometry and both invite the next person to switch it back on.
 */
export function CtaBand({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions: Action[];
}) {
  return (
    <section className="tvx-cta">
      <div className="container">
        <h2>{title}</h2>
        {description && <p>{description}</p>}
        <ActionButtons actions={actions} />
      </div>
    </section>
  );
}

export function Split({ children, media }: { children: ReactNode; media?: ReactNode }) {
  return (
    <div className="tvx-split">
      <div>{children}</div>
      <div className="tvx-split--media">{media ?? <Logo variant="mark" decorative />}</div>
    </div>
  );
}
