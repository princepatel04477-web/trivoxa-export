import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import "@/app/styles/patterns.css";
import "@/app/styles/product-exports-page.css";
import "@/app/styles/product-grid.css";
import TrivoxaShell from "@/components/trivoxa/TrivoxaShell";
import { PageHero, Section, CtaBand } from "@/components/trivoxa/ui";
import HorizontalTimeline from "@/components/patterns/HorizontalTimeline";
import NumberedList from "@/components/patterns/NumberedList";
import IndustryManifest from "@/components/industries/IndustryManifest";
import ProductGrid from "@/components/products/ProductGrid";
import { exportCategories } from "@/lib/data/product-categories";
import { industries } from "@/lib/data/industries";

// Furniture & Interiors and Jewellery & Precious Products are confirmed
// active export lines (Chairman decision D4, 2026-07-31) — both are listed
// here and in site navigation. Their category pages show the honest
// "tell us what you need" state (see [category]/page.tsx) until real
// product data lands (CAS-03/CAS-04); they are not silently withheld.
const liveExportCategories = exportCategories;

/** Every published product across every industry — feeds the searchable,
 * filterable grid (spec §4). */
const allProducts = industries.flatMap((i) =>
  i.categories.map((p) => ({ ...p, industry: i.name, industrySlug: i.slug }))
);

export const metadata: Metadata = {
  title: "Product Exports | Trivoxa Group",
  description:
    "Trivoxa Group sources and delivers high-quality products through a trusted network of manufacturing partners across India.",
};

export default async function ProductExportsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("productExportsPage");
  const ti = await getTranslations("industries.items");

  const sourcing = [
    { title: t("sourcing.s1Title"), description: t("sourcing.s1Desc") },
    { title: t("sourcing.s2Title"), description: t("sourcing.s2Desc") },
    { title: t("sourcing.s3Title"), description: t("sourcing.s3Desc") },
    { title: t("sourcing.s4Title"), description: t("sourcing.s4Desc") },
    { title: t("sourcing.s5Title"), description: t("sourcing.s5Desc") },
  ];

  const quality = [
    { title: t("quality.q1Title"), description: t("quality.q1Desc") },
    { title: t("quality.q2Title"), description: t("quality.q2Desc") },
    { title: t("quality.q3Title"), description: t("quality.q3Desc") },
    { title: t("quality.q4Title"), description: t("quality.q4Desc") },
    { title: t("quality.q5Title"), description: t("quality.q5Desc") },
  ];

  return (
    <TrivoxaShell film="product-exports">
      {/* 1. HERO */}
      <PageHero
        crumb={[{ label: t("hero.crumbBusinesses"), href: "/businesses/" }, { label: t("hero.crumbSelf") }]}
        eyebrow={t("hero.eyebrow")}
        title={t("hero.title")}
        description={t("hero.description")}
        actions={[{ label: t("hero.ctaQuote"), modal: true }, { label: t("hero.ctaContact"), href: "/contact/", variant: "ghost" }]}
      />

      {/* 2. ABOUT PRODUCT EXPORTS */}
      <Section eyebrow={t("about.eyebrow")} title={t("about.title")} lead={t("about.lead")} />

      {/* 3. INDUSTRIES WE SERVE — 7-row manifest into category pages */}
      <Section eyebrow={t("industriesSection.eyebrow")} title={t("industriesSection.title")} lead={t("industriesSection.lead")}>
        <IndustryManifest
          rows={liveExportCategories.map((c) => ({
            name: ti(`${c.slug}.name`),
            description: ti(`${c.slug}.description`),
            href: `/businesses/product-exports/${c.slug}/`,
          }))}
        />
      </Section>

      {/* 3b. FULL PRODUCT PORTFOLIO — searchable, filterable, RFQ-ready */}
      <Section eyebrow={t("portfolio.eyebrow")} title={t("portfolio.title")} lead={t("portfolio.lead")}>
        <ProductGrid products={allProducts} showIndustryFilter />
      </Section>

      {/* 4. GLOBAL SOURCING PROCESS — horizontal timeline */}
      <Section eyebrow={t("sourcing.eyebrow")} title={t("sourcing.title")}>
        <HorizontalTimeline steps={sourcing} />
      </Section>

      {/* 5. QUALITY ASSURANCE */}
      <Section eyebrow={t("quality.eyebrow")} title={t("quality.title")} lead={t("quality.lead")}>
        <NumberedList items={quality} />
      </Section>

      {/* 6. CTA */}
      <CtaBand
        title={t("cta.title")}
        description={t("cta.description")}
        actions={[{ label: t("cta.ctaQuote"), modal: true }, { label: t("cta.ctaTextile"), href: "/businesses/product-exports/textile-apparel/", variant: "ghost" }]}
      />
    </TrivoxaShell>
  );
}
