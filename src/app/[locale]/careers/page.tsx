import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import TrivoxaShell from "@/components/trivoxa/TrivoxaShell";
import { PageHero, Section, CtaBand } from "@/components/trivoxa/ui";
import HorizontalTimeline from "@/components/patterns/HorizontalTimeline";
import JobBoard from "@/components/careers/JobBoard";
import CareersTeam from "@/components/careers/CareersTeam";
import "@/app/styles/patterns.css";
import "@/app/styles/careers-page.css";
import "@/app/styles/signature-canvas.css";

export const metadata: Metadata = {
  title: "Careers | Trivoxa Group",
  description:
    "Build a long-term career at Trivoxa Group — a culture driven by curiosity, integrity, innovation, and continuous growth.",
};

export default async function CareersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("careers");

  const values = [
    { icon: "🚀", title: t("culture.values.v1Title"), description: t("culture.values.v1Desc") },
    { icon: "🤝", title: t("culture.values.v2Title"), description: t("culture.values.v2Desc") },
    { icon: "✦", title: t("culture.values.v3Title"), description: t("culture.values.v3Desc") },
    { icon: "🌱", title: t("culture.values.v4Title"), description: t("culture.values.v4Desc") },
  ];

  const areas = [
    { icon: "🌐", title: t("areas.a1Title"), description: t("areas.a1Desc") },
    { icon: "💻", title: t("areas.a2Title"), description: t("areas.a2Desc") },
    { icon: "📈", title: t("areas.a3Title"), description: t("areas.a3Desc") },
  ];

  /** What working here actually offers — growth mechanics, not perks theatre. */
  const benefits = [
    { title: t("benefits.b1Title"), description: t("benefits.b1Desc") },
    { title: t("benefits.b2Title"), description: t("benefits.b2Desc") },
    { title: t("benefits.b3Title"), description: t("benefits.b3Desc") },
    { title: t("benefits.b4Title"), description: t("benefits.b4Desc") },
    { title: t("benefits.b5Title"), description: t("benefits.b5Desc") },
    { title: t("benefits.b6Title"), description: t("benefits.b6Desc") },
  ];

  /** Real leadership voices from the master content doc — not invented
   * employee testimonials. */
  const voices = [
    { quote: t("voices.v1Quote"), name: "Parth Mangukiya", role: t("voices.v1Role") },
    { quote: t("voices.v2Quote"), name: "Dhruv Patel", role: t("voices.v2Role") },
    { quote: t("voices.v3Quote"), name: "Tirth Kalathiya", role: t("voices.v3Role") },
  ];

  /** Where the work happens — the group's real manufacturing floor. */
  const culturePhotos = [
    { src: "/images/foundation/exterior.jpg", caption: t("photoEssay.caption1") },
    { src: "/images/foundation/weaving.jpg", caption: t("photoEssay.caption2") },
    { src: "/images/foundation/inspection.jpg", caption: t("photoEssay.caption3") },
  ];

  return (
    <TrivoxaShell>
      {/* Signature animation: one persistent canvas behind every section. A single
          abstract silhouette in the hero is joined by a second, then multiplies into
          a connected team formation behind the open roles, then relaxes. Replaces
          the GLSL shader background this page used to carry — one WebGL context
          per page. */}
      <div className="gp-canvas" aria-hidden="true">
        <CareersTeam />
      </div>

      <PageHero
        eyebrow={t("hero.eyebrow")}
        title={t("hero.title")}
        description={t("hero.description")}
        actions={[{ label: t("hero.ctaExplore"), href: "#opportunities" }, { label: t("hero.ctaContact"), href: "/contact/", variant: "ghost" }]}
      />

      <Section id="culture" eyebrow={t("culture.eyebrow")} title={t("culture.title")} lead={t("culture.lead")}>
        <div className="careers-values-list">
          {values.map((v, i) => (
            <div className="careers-value-row" key={v.title}>
              <span className="careers-value-row__index">{String(i + 1).padStart(2, "0")}</span>
              <span className="careers-value-row__title">{v.title}</span>
              <p className="careers-value-row__desc">{v.description}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Culture photo essay + leadership voices (spec §4 — Careers) */}
      <Section eyebrow={t("photoEssay.eyebrow")} title={t("photoEssay.title")}>
        <div className="careers-photo-essay">
          {culturePhotos.map((p) => (
            <figure key={p.src}>
              {/* Intrinsic 1200x900; the stylesheet still drives the rendered
                  size (width:100%, aspect-ratio 4/3, object-fit cover). */}
              <Image src={p.src} alt={p.caption} width={1200} height={900} sizes="(max-width: 700px) 100vw, 33vw" />
              <figcaption>{p.caption}</figcaption>
            </figure>
          ))}
        </div>
        <div className="careers-voices">
          {voices.map((v) => (
            <blockquote key={v.name} className="careers-voice">
              <p>&ldquo;{v.quote}&rdquo;</p>
              <footer>
                <strong>{v.name}</strong> — {v.role}
              </footer>
            </blockquote>
          ))}
        </div>
      </Section>

      <Section id="areas" eyebrow={t("areas.eyebrow")} title={t("areas.title")} lead={t("areas.lead")}>
        <div className="careers-dept-strip">
          {areas.map((a, i) => (
            <div className="careers-dept" key={a.title}>
              <span className="careers-dept__index">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="careers-dept__name">{a.title}</h3>
              <p className="careers-dept__desc">{a.description}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Benefits & growth paths (spec §4 — Careers) */}
      <Section eyebrow={t("benefits.eyebrow")} title={t("benefits.title")}>
        <div className="tvx-statements">
          {benefits.map((b) => (
            <div className="tvx-statement" key={b.title}>
              <span className="tvx-statement__rule" aria-hidden="true" />
              <h3 className="tvx-statement__title">{b.title}</h3>
              <p className="tvx-statement__desc">{b.description}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="opportunities" eyebrow={t("opportunities.eyebrow")} title={t("opportunities.title")}>
        <JobBoard />
      </Section>

      <Section eyebrow={t("hiringProcess.eyebrow")} title={t("hiringProcess.title")}>
        <HorizontalTimeline
          steps={[
            { title: t("hiringProcess.s1Title"), description: t("hiringProcess.s1Desc") },
            { title: t("hiringProcess.s2Title"), description: t("hiringProcess.s2Desc") },
            { title: t("hiringProcess.s3Title"), description: t("hiringProcess.s3Desc") },
            { title: t("hiringProcess.s4Title"), description: t("hiringProcess.s4Desc") },
            { title: t("hiringProcess.s5Title"), description: t("hiringProcess.s5Desc") },
            { title: t("hiringProcess.s6Title"), description: t("hiringProcess.s6Desc") },
            { title: t("hiringProcess.s7Title"), description: t("hiringProcess.s7Desc") },
          ]}
        />
      </Section>

      <CtaBand
        title={t("cta.title")}
        description={t("cta.description")}
        actions={[{ label: t("cta.ctaContact"), href: "/contact/" }, { label: t("cta.ctaGroup"), href: "/group/", variant: "ghost" }]}
      />
    </TrivoxaShell>
  );
}
