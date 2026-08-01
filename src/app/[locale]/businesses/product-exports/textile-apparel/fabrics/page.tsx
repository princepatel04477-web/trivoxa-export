import type { Metadata } from "next";
import TrivoxaShell from "@/components/trivoxa/TrivoxaShell";
import { PageHero, Section, Pills, CtaBand } from "@/components/trivoxa/ui";
import ProductTable from "@/components/products/ProductTable";
import EmptyState from "@/components/EmptyState";
import { getSubCategory } from "@/lib/data/product-categories";
import "@/app/styles/patterns.css";

export const metadata: Metadata = {
  title: "Fabrics | Trivoxa Group",
  description: "Polyester greige, dyed, finished, cotton, and blended fabrics sourced through trusted manufacturing partners.",
};

const BASE = "/businesses/product-exports/textile-apparel";

const applications = [
  "Apparel & garment manufacturing",
  "Home textiles and furnishings",
  "Industrial and technical uses",
  "Private-label and brand programs",
];

export default function FabricsPage() {
  const fabrics = getSubCategory("textile-apparel", "fabrics")!;
  // CAS-01: only fully-specified rows render — no em-dashed placeholders.
  const publishedFabrics = (fabrics.products ?? []).filter((p) => p.status === "published");

  return (
    <TrivoxaShell film="fabrics">
      <PageHero
        crumb={[
          { label: "Businesses", href: "/businesses/" },
          { label: "Product Exports", href: "/businesses/product-exports/" },
          { label: "Textile & Apparel", href: `${BASE}/` },
          { label: "Fabrics" },
        ]}
        eyebrow="Fabrics"
        title="Fabrics Portfolio."
        description="From polyester greige to finished fabric, we supply a broad range of woven and knitted textiles built on genuine manufacturing expertise."
        actions={[{ label: "Request a Quote", modal: true }, { label: "Back to Textile & Apparel", href: `${BASE}/`, variant: "ghost" }]}
      />

      <Section
        eyebrow="Category Overview"
        title="A Complete Fabric Portfolio."
        lead="Fabrics are the foundation of our textile capability. We coordinate supply from greige through dyeing and finishing, matched to your specifications and quality standards."
      />

      <Section eyebrow="Product Portfolio" title="Fabrics We Supply." lead="Click any row for the full specification.">
        {publishedFabrics.length > 0 ? (
          <ProductTable products={publishedFabrics} />
        ) : (
          <EmptyState
            status="The published fabric specification table is being finalized with our manufacturing partners."
            timing="Confirmed HS codes, grades, and MOQs are added here as each spec is verified."
            action={{ label: "Request Current Specifications", href: "/rfq/?category=textile-apparel" }}
          />
        )}
      </Section>

      <Section eyebrow="Applications" title="Where These Fabrics Are Used.">
        <Pills items={applications} />
      </Section>

      <Section
        eyebrow="Manufacturing"
        title="Anchored by Shiveshwar Textiles."
        lead="Our fabric capability is rooted in the woven-textile production expertise of our founding strategic partner, Shiveshwar Textiles — from greige production through dyeing, printing, and finishing, coordinated with trusted partner mills."
      />

      <CtaBand
        title="Request Fabric Specifications & Pricing."
        description="Tell us the construction, GSM, and finish you need — we'll coordinate the right supply."
        actions={[{ label: "Request Fabric Sample", modal: true }]}
      />
    </TrivoxaShell>
  );
}
