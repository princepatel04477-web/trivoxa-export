import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import "@/app/styles/patterns.css";
import "@/app/styles/businesses-page.css";
import "@/app/styles/signature-canvas.css";
import TrivoxaShell from "@/components/trivoxa/TrivoxaShell";
import BusinessesCube from "@/components/businesses/BusinessesCube";
import { PageHero, Section, CtaBand } from "@/components/trivoxa/ui";
import SplitScreenSticky from "@/components/patterns/SplitScreenSticky";
import CinematicPanel from "@/components/patterns/CinematicPanel";
import HorizontalTimeline from "@/components/patterns/HorizontalTimeline";
import NumberedList from "@/components/patterns/NumberedList";
import { taxonomy } from "@/lib/data/taxonomy";

export const metadata: Metadata = {
  title: "Businesses | Trivoxa Group",
  description:
    "Trivoxa Group operates through two divisions — Product Exports and Service Exports — delivering integrated solutions across global markets.",
};

const SERVICE_CATEGORY_KEYS = ["technology", "ai", "software", "designBranding", "digitalMarketing", "businessSupport"] as const;

export default async function BusinessesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("businesses");
  const tm = await getTranslations("megaMenu");

  /** Product Exports division tags — every taxonomy entry with a live catalog
   * route, translated canonical full names (PTO-02). */
  const productExportTags = taxonomy.filter((tx) => tx.catalogHref).map((tx) => (tx.megaMenuKey ? tm(tx.megaMenuKey) : tx.displayName));

  /* Division panels. Drop looping b-roll at /videos/product-exports.mp4 and
   * /videos/service-exports.mp4 and set `videoSrc` on each entry — until then
   * the still image is the background everywhere. */
  const divisions = [
    {
      id: "divisions",
      eyebrow: t("division1.eyebrow"),
      title: t("division1.title"),
      description: t("division1.description"),
      href: "/businesses/product-exports/",
      cta: t("division1.cta"),
      image: "/images/businesses/product-exports-editorial.webp",
      categories: productExportTags,
      align: "left" as const,
    },
    {
      eyebrow: t("division2.eyebrow"),
      title: t("division2.title"),
      description: t("division2.description"),
      href: "/businesses/service-exports/",
      cta: t("division2.cta"),
      image: "/images/businesses/service-exports-editorial.webp",
      categories: SERVICE_CATEGORY_KEYS.map((key) => tm(key)),
      align: "right" as const,
    },
  ];

  const steps = [
    { title: t("process.steps.step1Title"), description: t("process.steps.step1Desc") },
    { title: t("process.steps.step2Title"), description: t("process.steps.step2Desc") },
    { title: t("process.steps.step3Title"), description: t("process.steps.step3Desc") },
    { title: t("process.steps.step4Title"), description: t("process.steps.step4Desc") },
    { title: t("process.steps.step5Title"), description: t("process.steps.step5Desc") },
  ];

  const strengths = [
    { title: t("why.strengths.s1Title"), description: t("why.strengths.s1Desc") },
    { title: t("why.strengths.s2Title"), description: t("why.strengths.s2Desc") },
    { title: t("why.strengths.s3Title"), description: t("why.strengths.s3Desc") },
    { title: t("why.strengths.s4Title"), description: t("why.strengths.s4Desc") },
    { title: t("why.strengths.s5Title"), description: t("why.strengths.s5Desc") },
    { title: t("why.strengths.s6Title"), description: t("why.strengths.s6Desc") },
  ];

  return (
    <TrivoxaShell>
      {/* Signature animation: one persistent canvas behind every section. A solid
          cube loosens, cleaves into the two divisions, resolves into the process
          chain, then converges into the shared eagle. Replaces the GLSL shader
          background this page used to carry — one WebGL context per page. */}
      <div className="gp-canvas" aria-hidden="true">
        <BusinessesCube />
      </div>

      {/* 1. HERO */}
      <PageHero
        eyebrow={t("hero.eyebrow")}
        title={t("hero.title")}
        description={t("hero.description")}
        actions={[{ label: t("hero.ctaQuote"), modal: true }, { label: t("hero.ctaDivisions"), href: "#divisions", variant: "ghost" }]}
      />

      {/* 2. BUSINESS OVERVIEW — split-screen sticky */}
      <div className="container" id="overview">
        <SplitScreenSticky
          eyebrow={t("overview.eyebrow")}
          title={t("overview.title")}
          paragraphs={[t("overview.p1"), t("overview.p2"), t("overview.p3")]}
        />
      </div>

      {/* 3. OUR BUSINESS DIVISIONS — full-bleed cinematic panels, no gap */}
      <section className="business-arms" id="divisions" aria-label="Our Business Divisions">
        {divisions.map((d) => (
          <CinematicPanel key={d.title} {...d} />
        ))}
      </section>

      {/* 4. HOW WE WORK — pinned horizontal process timeline */}
      <Section id="process" eyebrow={t("process.eyebrow")} title={t("process.title")} lead={t("process.lead")}>
        <HorizontalTimeline steps={steps} />
      </Section>

      {/* 5. WHY BUSINESSES CHOOSE TRIVOXA — numbered list */}
      <Section id="why" eyebrow={t("why.eyebrow")} title={t("why.title")}>
        <NumberedList items={strengths} />
      </Section>

      {/* 6. CONTACT CTA */}
      <CtaBand
        title={t("cta.title")}
        description={t("cta.description")}
        actions={[{ label: t("cta.ctaQuote"), modal: true }, { label: t("cta.ctaContact"), href: "/contact/", variant: "ghost" }]}
      />
    </TrivoxaShell>
  );
}
