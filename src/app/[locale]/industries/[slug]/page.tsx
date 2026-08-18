import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import TrivoxaShell from "@/components/trivoxa/TrivoxaShell";
import { PageHero, Section, CtaBand } from "@/components/trivoxa/ui";
import CategoryTable from "@/components/industries/CategoryTable";
import NumberedList from "@/components/patterns/NumberedList";
import IndustryManifest from "@/components/industries/IndustryManifest";
import { industries, getIndustryBySlug } from "@/lib/data/industries";
import { getExportCategory } from "@/lib/data/product-categories";
import "@/app/styles/patterns.css";
import "@/app/styles/industries-page.css";
import "@/app/styles/industry-page.css";

export function generateStaticParams() {
  return industries.map((i) => ({ slug: i.slug }));
}

export async function generateMetadata(props: PageProps<"/[locale]/industries/[slug]">): Promise<Metadata> {
  const { slug, locale } = await props.params;
  const industry = getIndustryBySlug(slug);
  if (!industry) return {};
  const ti = await getTranslations({ locale, namespace: "industries.items" });
  return {
    title: `${ti(`${slug}.name`)} | Trivoxa Group`,
    description: ti(`${slug}.description`),
  };
}

export default async function IndustryPage(props: PageProps<"/[locale]/industries/[slug]">) {
  const { slug, locale } = await props.params;
  setRequestLocale(locale);
  const industry = getIndustryBySlug(slug);
  if (!industry) notFound();

  const t = await getTranslations("industryDetail");
  const ti = await getTranslations("industries.items");
  const tw = await getTranslations("industries.why");
  const name = ti(`${slug}.name`);

  /** Shared "Why Trivoxa" strengths — reuses the copy already translated for
   * the Industries listing page, so the same six statements read identically
   * across both surfaces. */
  const strengths = [
    { title: tw("strengths.s1Title"), description: tw("strengths.s1Desc") },
    { title: tw("strengths.s2Title"), description: tw("strengths.s2Desc") },
    { title: tw("strengths.s3Title"), description: tw("strengths.s3Desc") },
    { title: tw("strengths.s4Title"), description: tw("strengths.s4Desc") },
    { title: tw("strengths.s5Title"), description: tw("strengths.s5Desc") },
    { title: tw("strengths.s6Title"), description: tw("strengths.s6Desc") },
  ];

  const exportCategory = industry.productCategorySlug ? getExportCategory(industry.productCategorySlug) : undefined;
  const offerHref = exportCategory
    ? `/businesses/product-exports/${exportCategory.slug}/`
    : industry.serviceHref;
  const related = industries.filter((i) => i.slug !== industry.slug).slice(0, 3);

  return (
    <TrivoxaShell film="footer-drift">
      <PageHero
        crumb={[{ label: t("crumbIndustries"), href: "/industries/" }, { label: name }]}
        eyebrow={t("eyebrowPrefix", { name })}
        title={name}
        description={ti(`${slug}.description`)}
        actions={[
          { label: t("ctaRequestQuote", { name }), href: `/rfq/?category=${industry.slug}` },
          { label: t("ctaContactTeam"), href: "/contact/", variant: "ghost" },
        ]}
      />

      <Section eyebrow={t("context.eyebrow")} title={t("context.title", { name })}>
        <div className="industry-context">
          <div className="industry-context__buyers">
            <h3>{t("context.buyerTypesTitle")}</h3>
            <ul>
              {Object.keys(ti.raw(`${slug}.buyerTypes`)).map((key) => (
                <li key={key}>{ti(`${slug}.buyerTypes.${key}`)}</li>
              ))}
            </ul>
          </div>
          <div className="industry-context__compliance">
            <h3>{t("context.complianceTitle")}</h3>
            <p>{ti(`${slug}.complianceNote`)}</p>
          </div>
        </div>
      </Section>

      {industry.categories.length > 0 && (
        <Section eyebrow={t("offer.eyebrow")} title={t("offer.title")} lead={t("offer.lead")}>
          <CategoryTable categories={industry.categories} />
        </Section>
      )}

      {offerHref && (
        <Section eyebrow={t("explore.eyebrow")} title={exportCategory ? t("explore.browsePortfolio") : t("explore.exploreServices")}>
          <Link href={offerHref} className="tvx-btn tvx-btn--primary">
            {exportCategory ? `${exportCategory.name} ${t("explore.exportsSuffix")}` : t("explore.globalServiceExports")}
          </Link>
        </Section>
      )}

      <Section eyebrow={t("why.eyebrow")} title={t("why.title")}>
        <NumberedList items={strengths} />
      </Section>

      <Section eyebrow={t("related.eyebrow")} title={t("related.title")}>
        <IndustryManifest
          rows={related.map((i) => ({
            name: ti(`${i.slug}.name`),
            description: ti(`${i.slug}.description`),
            href: `/industries/${i.slug}/`,
          }))}
        />
      </Section>

      <CtaBand
        title={t("cta.titleTemplate", { name })}
        description={t("cta.description")}
        actions={[{ label: t("cta.ctaSendRfq"), href: `/rfq/?category=${industry.slug}` }]}
      />
    </TrivoxaShell>
  );
}
