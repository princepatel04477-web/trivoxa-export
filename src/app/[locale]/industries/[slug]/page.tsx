import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import TrivoxaShell from "@/components/trivoxa/TrivoxaShell";
import { PageHero, Section, CtaBand } from "@/components/trivoxa/ui";
import CategoryTable from "@/components/industries/CategoryTable";
import NumberedList from "@/components/patterns/NumberedList";
import IndustryManifest from "@/components/industries/IndustryManifest";
import { industries, getIndustryBySlug } from "@/lib/data/industries";
import { getExportCategory } from "@/lib/data/product-categories";
import { SHIVESHWAR_DESCRIPTOR } from "@/lib/corporate";
import "@/app/styles/patterns.css";
import "@/app/styles/industries-page.css";
import "@/app/styles/industry-page.css";

export function generateStaticParams() {
  return industries.map((i) => ({ slug: i.slug }));
}

export async function generateMetadata(props: PageProps<"/[locale]/industries/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const industry = getIndustryBySlug(slug);
  if (!industry) return {};
  return {
    title: `${industry.name} | Trivoxa Group`,
    description: industry.description,
  };
}

/** Shared "Why Trivoxa" strengths (master doc §5.7, verbatim). */
const strengths = [
  { title: "Manufacturing Foundation", description: SHIVESHWAR_DESCRIPTOR },
  { title: "Industry Understanding", description: "Solutions developed around the operational realities of each industry." },
  { title: "Trusted Network", description: "A growing ecosystem of manufacturers, technology providers, logistics specialists, and business professionals." },
  { title: "Quality-Driven Operations", description: "Committed to consistency, reliability, and continuous improvement." },
  { title: "Global Perspective", description: "Supporting businesses through international sourcing, professional services, and global partnerships." },
  { title: "Long-Term Relationships", description: "Focused on building partnerships that continue creating value well beyond individual projects." },
];

export default async function IndustryPage(props: PageProps<"/[locale]/industries/[slug]">) {
  const { slug } = await props.params;
  const industry = getIndustryBySlug(slug);
  if (!industry) notFound();

  const exportCategory = industry.productCategorySlug ? getExportCategory(industry.productCategorySlug) : undefined;
  const offerHref = exportCategory
    ? `/businesses/product-exports/${exportCategory.slug}/`
    : industry.serviceHref;
  const related = industries.filter((i) => i.slug !== industry.slug).slice(0, 3);

  return (
    <TrivoxaShell film="footer-drift">
      <PageHero
        crumb={[{ label: "Industries", href: "/industries/" }, { label: industry.name }]}
        eyebrow={`Industry — ${industry.name}`}
        title={industry.name}
        description={industry.description}
        actions={[
          { label: `Request Quote for ${industry.name}`, href: `/rfq/?category=${industry.slug}` },
          { label: "Contact Team", href: "/contact/", variant: "ghost" },
        ]}
      />

      {(industry.buyerTypes || industry.complianceNote) && (
        <Section eyebrow="Industry Context" title={`Who We Serve in ${industry.name}`}>
          <div className="industry-context">
            {industry.buyerTypes && (
              <div className="industry-context__buyers">
                <h3>Typical Buyers</h3>
                <ul>
                  {industry.buyerTypes.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </div>
            )}
            {industry.complianceNote && (
              <div className="industry-context__compliance">
                <h3>What Buyers Should Know</h3>
                <p>{industry.complianceNote}</p>
              </div>
            )}
          </div>
        </Section>
      )}

      {industry.categories.length > 0 && (
        <Section eyebrow="What We Offer" title="What We Export" lead="Every category is quoted against real HS codes, minimum order quantities, and lead times — no guesswork before you send an RFQ.">
          <CategoryTable categories={industry.categories} />
        </Section>
      )}

      {offerHref && (
        <Section eyebrow="Explore Further" title={exportCategory ? "Browse the Product Portfolio" : "Explore Our Service Capabilities"}>
          <Link href={offerHref} className="tvx-btn tvx-btn--primary">
            {exportCategory ? `${exportCategory.name} Exports →` : "Global Service Exports →"}
          </Link>
        </Section>
      )}

      <Section eyebrow="Why Trivoxa" title="Built on Experience. Driven by Partnership.">
        <NumberedList items={strengths} />
      </Section>

      <Section eyebrow="Related Industries" title="Explore Other Industries">
        <IndustryManifest
          rows={related.map((i) => ({
            name: i.name,
            description: i.description,
            href: `/industries/${i.slug}/`,
          }))}
        />
      </Section>

      <CtaBand
        title={`Ready to source ${industry.name}?`}
        description="Send us your RFQ and our sourcing team responds within 24 business hours (IST)."
        actions={[{ label: "Send Us Your RFQ →", href: `/rfq/?category=${industry.slug}` }]}
        eagle={false}
      />
    </TrivoxaShell>
  );
}
