import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import TrivoxaShell from "@/components/trivoxa/TrivoxaShell";
import { PageHero, Section, Pills, CtaBand } from "@/components/trivoxa/ui";
import InsightsTeaser from "@/components/insights/InsightsTeaser";
import InsightsNetwork from "@/components/insights/InsightsNetwork";
import "@/app/styles/insights-page.css";
import "@/app/styles/signature-canvas.css";

export const metadata: Metadata = {
  title: "Insights | Trivoxa Group",
  description:
    "Perspectives on global trade, sourcing strategies, emerging industries, and market intelligence from Trivoxa Group.",
};

export default async function InsightsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("insightsPage");

  const categories = [t("categories.c1"), t("categories.c2"), t("categories.c3")];

  /** Planned topics for the teaser (spec §4 — no articles exist yet, so no
   * dead "Read Insight" links; readers vote on what publishes first). */
  const upcomingTopics = [
    { title: t("topics.t1Title"), category: t("topics.t1Category"), readingTime: t("topics.t1Reading"), description: t("topics.t1Desc") },
    { title: t("topics.t2Title"), category: t("topics.t2Category"), readingTime: t("topics.t2Reading"), description: t("topics.t2Desc") },
    { title: t("topics.t3Title"), category: t("topics.t3Category"), readingTime: t("topics.t3Reading"), description: t("topics.t3Desc") },
    { title: t("topics.t4Title"), category: t("topics.t4Category"), readingTime: t("topics.t4Reading"), description: t("topics.t4Desc") },
    { title: t("topics.t5Title"), category: t("topics.t5Category"), readingTime: t("topics.t5Reading"), description: t("topics.t5Desc") },
    { title: t("topics.t6Title"), category: t("topics.t6Category"), readingTime: t("topics.t6Reading"), description: t("topics.t6Desc") },
  ];

  return (
    <TrivoxaShell>
      {/* Signature animation: one persistent canvas behind every section. A single
          point of light in the hero emits into knowledge nodes, organises into a
          connected web behind the article cards, densifies into an editorial
          lattice, then relaxes. Replaces the GLSL shader background this page used
          to carry — one WebGL context per page. */}
      <div className="gp-canvas" aria-hidden="true">
        <InsightsNetwork />
      </div>

      <PageHero
        eyebrow={t("hero.eyebrow")}
        title={t("hero.title")}
        description={t("hero.description")}
        actions={[{ label: t("hero.ctaExplore"), href: "#featured" }, { label: t("hero.ctaContact"), href: "/contact/", variant: "ghost" }]}
      />

      <Section id="categories" eyebrow={t("categories.eyebrow")} title={t("categories.title")} lead={t("categories.lead")}>
        <Pills items={categories} />
      </Section>

      <Section id="featured" eyebrow={t("featured.eyebrow")} title={t("featured.title")} lead={t("featured.lead")}>
        <InsightsTeaser topics={upcomingTopics} />
      </Section>

      <CtaBand
        title={t("cta.title")}
        description={t("cta.description")}
        actions={[{ label: t("cta.ctaQuote"), modal: true }, { label: t("cta.ctaContact"), href: "/contact/", variant: "ghost" }]}
      />
    </TrivoxaShell>
  );
}
