import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import TrivoxaShell from "@/components/trivoxa/TrivoxaShell";
import { PageHero, Section, CtaBand, Steps } from "@/components/trivoxa/ui";
import ProductGrid from "@/components/products/ProductGrid";
import StickyCategoryCta from "@/components/products/StickyCategoryCta";
import OnePagerButton from "@/components/products/OnePagerButton";
import { exportCategories, getExportCategory } from "@/lib/data/product-categories";
import { getIndustryBySlug } from "@/lib/data/industries";
import "@/app/styles/patterns.css";
import "@/app/styles/product-grid.css";

/** Category pages for every product-export division EXCEPT textile-apparel,
 * which has its own richer static route (and sub-category children). */
const dynamicCategories = exportCategories.filter((c) => c.slug !== "textile-apparel");

export function generateStaticParams() {
  return dynamicCategories.map((c) => ({ category: c.slug }));
}

export async function generateMetadata(props: PageProps<"/[locale]/businesses/product-exports/[category]">): Promise<Metadata> {
  const { category } = await props.params;
  const cat = getExportCategory(category);
  if (!cat) return {};
  return {
    title: `${cat.name} | Trivoxa Group`,
    description: cat.description,
  };
}

/** Shared manufacturing/sourcing flow shown as process visuals (spec §4). */
const processSteps = [
  { title: "Understand", desc: "Specifications, volumes, quality standards, and commercial expectations." },
  { title: "Recommend", desc: "The right vetted manufacturing partners for your requirement." },
  { title: "Coordinate", desc: "Production timelines and communication through every stage." },
  { title: "Verify", desc: "Quality-focused checks plus complete export documentation." },
  { title: "Deliver", desc: "Logistics coordination and dependable international delivery." },
];

export default async function ExportCategoryPage(props: PageProps<"/[locale]/businesses/product-exports/[category]">) {
  const { category } = await props.params;
  const cat = getExportCategory(category);
  if (!cat || cat.slug === "textile-apparel") notFound();

  // Categories share slugs with industries where both exist — reuse the
  // industry's RFQ trade table when it has rows.
  const industry = getIndustryBySlug(cat.slug);
  const products =
    industry?.categories.map((p) => ({
      ...p,
      industry: industry.name,
      industrySlug: industry.slug,
    })) ?? [];

  return (
    <TrivoxaShell film={category}>
      <PageHero
        crumb={[
          { label: "Businesses", href: "/businesses/" },
          { label: "Product Exports", href: "/businesses/product-exports/" },
          { label: cat.name },
        ]}
        eyebrow={cat.name}
        title={`${cat.name} Exports.`}
        description={cat.description}
        actions={[
          { label: "Request a Quote", href: industry ? `/rfq/?category=${industry.slug}` : "/rfq/" },
          ...(products.length > 0 && industry
            ? [{ label: "Request Sample", href: `/rfq/?category=${industry.slug}&sample=1`, variant: "ghost" as const }]
            : []),
          { label: "Contact Our Team", href: "/contact/", variant: "ghost" as const },
        ]}
      />

      {products.length > 0 ? (
        <Section
          eyebrow="Product Portfolio"
          title="What We Export"
          lead="Every product is quoted against real HS codes, minimum order quantities, and lead times — search, filter, open full specs, and add products straight to your RFQ."
        >
          <ProductGrid products={products} />
          <div className="portfolio-tools">
            <OnePagerButton category={cat.name} />
          </div>
        </Section>
      ) : (
        <Section
          eyebrow="Portfolio"
          title="Tell Us What You Need — We Source It."
          lead="The published portfolio for this category is being finalized with our manufacturing partners. Share your requirement and our sourcing team will respond with availability, specifications, and pricing within 24 business hours (IST)."
        >
          <Link href={`/rfq/${industry ? `?category=${industry.slug}` : ""}`} className="tvx-btn tvx-btn--primary">
            Send Us Your Requirement →
          </Link>
        </Section>
      )}

      {/* Manufacturing process visuals (spec §4) */}
      <Section
        eyebrow="How It Works"
        title="From Requirement to Delivery."
        lead="Every order follows the same disciplined path — the process that lets buyers thousands of kilometers away order with confidence."
      >
        <Steps items={processSteps} row />
      </Section>

      {/* Certifications & quality deep-dive (spec §4) */}
      {(industry?.complianceNote || industry?.buyerTypes) && (
        <Section eyebrow="Quality & Compliance" title="What Buyers Should Know.">
          <div className="category-compliance">
            {industry?.complianceNote && <p className="category-compliance__note">{industry.complianceNote}</p>}
            {industry?.buyerTypes && (
              <div className="category-compliance__buyers">
                <h3>Who we typically serve</h3>
                <ul>
                  {industry.buyerTypes.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </div>
            )}
            <Link href="/compliance/" className="tvx-btn tvx-btn--ghost">
              See our full compliance posture →
            </Link>
          </div>
        </Section>
      )}

      {/* Cross-sell to services (spec §4) */}
      <Section
        eyebrow="Beyond the Product"
        title="Need More Than Sourcing?"
        lead="Trivoxa Digital — our service-exports arm — builds the e-commerce platforms, product catalogs, and digital marketing that move exported goods in their destination markets."
      >
        <div className="category-crosssell">
          <Link href="/businesses/service-exports/" className="tvx-btn tvx-btn--primary">
            Explore Service Exports →
          </Link>
          {industry && (
            <Link href={`/industries/${industry.slug}/`} className="tvx-btn tvx-btn--ghost">
              {industry.name} industry overview →
            </Link>
          )}
        </div>
      </Section>

      <CtaBand
        title={`Ready to source ${cat.name}?`}
        description="Send us your RFQ and our sourcing team responds within 24 business hours (IST)."
        actions={[{ label: "Send Us Your RFQ →", href: industry ? `/rfq/?category=${industry.slug}` : "/rfq/" }]}
      />

      <StickyCategoryCta category={cat.name} categorySlug={industry?.slug} />
    </TrivoxaShell>
  );
}
