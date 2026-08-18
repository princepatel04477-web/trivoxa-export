import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import TrivoxaShell from "@/components/trivoxa/TrivoxaShell";
import { PageHero, Section, CtaBand } from "@/components/trivoxa/ui";
import SplitScreenSticky from "@/components/patterns/SplitScreenSticky";
import EditorialPanel from "@/components/patterns/EditorialPanel";
import NumberedList from "@/components/patterns/NumberedList";
import HorizontalTimeline from "@/components/patterns/HorizontalTimeline";
import IndustryManifest from "@/components/industries/IndustryManifest";
import IndustriesField from "@/components/industries/IndustriesField";
import { industries } from "@/lib/data/industries";
import "@/app/styles/patterns.css";
import "@/app/styles/industries-page.css";
import "@/app/styles/signature-canvas.css";

export const metadata: Metadata = {
  title: "Industries | Trivoxa Group",
  description:
    "Trivoxa Group serves diverse industries with tailored product sourcing and professional service solutions across global markets.",
};

export default async function IndustriesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("industries");

  const solutions = [
    { title: t("solutions.items.i1") },
    { title: t("solutions.items.i2") },
    { title: t("solutions.items.i3") },
    { title: t("solutions.items.i4") },
    { title: t("solutions.items.i5") },
    { title: t("solutions.items.i6") },
    { title: t("solutions.items.i7") },
    { title: t("solutions.items.i8") },
  ];

  const approach = [
    { title: t("approach.steps.step1Title"), description: t("approach.steps.step1Desc") },
    { title: t("approach.steps.step2Title"), description: t("approach.steps.step2Desc") },
    { title: t("approach.steps.step3Title"), description: t("approach.steps.step3Desc") },
    { title: t("approach.steps.step4Title"), description: t("approach.steps.step4Desc") },
  ];

  const strengths = [
    { title: t("why.strengths.s1Title"), description: t("why.strengths.s1Desc") },
    { title: t("why.strengths.s2Title"), description: t("why.strengths.s2Desc") },
    { title: t("why.strengths.s3Title"), description: t("why.strengths.s3Desc") },
    { title: t("why.strengths.s4Title"), description: t("why.strengths.s4Desc") },
    { title: t("why.strengths.s5Title"), description: t("why.strengths.s5Desc") },
    { title: t("why.strengths.s6Title"), description: t("why.strengths.s6Desc") },
  ];

  // TrivoxaShell takes no `film` here: this route runs its own particle field,
  // and a GLSL shader background would fight it for the same fixed z-index:-1
  // layer and a second WebGL context.
  return (
    <TrivoxaShell>
      {/* Signature animation: one persistent canvas behind every section. Eight
          scattered sectors resolve into an ordered manifest, thread together,
          then converge on a single spine and finally the shared eagle. */}
      <div className="gp-canvas" aria-hidden="true">
        <IndustriesField />
      </div>

      {/* 1. HERO */}
      <PageHero
        eyebrow={t("hero.eyebrow")}
        title={t("hero.title")}
        description={t("hero.description")}
        actions={[{ label: t("hero.ctaExplore"), href: "#industries" }, { label: t("hero.ctaQuote"), modal: true, variant: "ghost" }]}
      />

      {/* 2. INDUSTRIES OVERVIEW — split-screen sticky */}
      <div className="container">
        <SplitScreenSticky
          eyebrow={t("overview.eyebrow")}
          title={t("overview.title")}
          paragraphs={[t("overview.p1"), t("overview.p2"), t("overview.p3")]}
        />
      </div>

      {/* 3. INDUSTRIES WE SERVE — editorial manifest */}
      <Section id="industries" eyebrow={t("list.eyebrow")} title={t("list.title")} lead={t("list.lead")}>
        <IndustryManifest
          rows={industries.map((i) => ({
            name: t(`items.${i.slug}.name`),
            description: t(`items.${i.slug}.description`),
            href: `/industries/${i.slug}/`,
          }))}
        />
      </Section>

      {/* 4. INDUSTRY CHALLENGES — editorial prose */}
      <EditorialPanel
        eyebrow={t("challenges.eyebrow")}
        title={t("challenges.title")}
        paragraphs={[t("challenges.p1"), t("challenges.p2"), t("challenges.p3")]}
      />

      {/* 5. OUR INDUSTRY SOLUTIONS — numbered list */}
      <Section id="solutions" eyebrow={t("solutions.eyebrow")} title={t("solutions.title")} lead={t("solutions.lead")}>
        <NumberedList items={solutions} />
      </Section>

      {/* 6. HOW WE PARTNER WITH EVERY INDUSTRY — horizontal timeline */}
      <Section eyebrow={t("approach.eyebrow")} title={t("approach.title")} lead={t("approach.lead")}>
        <HorizontalTimeline steps={approach} />
      </Section>

      {/* 7. WHY INDUSTRIES CHOOSE TRIVOXA — numbered list */}
      <Section id="why" eyebrow={t("why.eyebrow")} title={t("why.title")} lead={t("why.lead")}>
        <NumberedList items={strengths} />
      </Section>

      {/* 8. LOOKING AHEAD — editorial prose */}
      <EditorialPanel
        eyebrow={t("lookingAhead.eyebrow")}
        title={t("lookingAhead.title")}
        paragraphs={[t("lookingAhead.p1"), t("lookingAhead.p2"), t("lookingAhead.p3")]}
      />

      {/* 9. CTA */}
      <CtaBand
        title={t("cta.title")}
        description={t("cta.description")}
        actions={[{ label: t("cta.ctaQuote"), modal: true }, { label: t("cta.ctaContact"), href: "/contact/", variant: "ghost" }]}
      />
    </TrivoxaShell>
  );
}
