import type { Metadata } from "next";
import TrivoxaShell from "@/components/trivoxa/TrivoxaShell";
import { PageHero, Section, Checklist, CtaBand } from "@/components/trivoxa/ui";
import ProductTable from "@/components/products/ProductTable";
import { getSubCategory } from "@/lib/data/product-categories";
import "@/app/styles/patterns.css";

export const metadata: Metadata = {
  title: "Textile & Apparel Accessories | Trivoxa Group",
  description: "Elastics, trims, labels, fastenings, and sewing materials for apparel and textile manufacturing.",
};

const BASE = "/businesses/product-exports/textile-apparel";

const quality = [
  "Specification-driven, consistent supply",
  "Trusted accessory manufacturing partners",
  "Custom branding and label programs",
  "Export documentation and logistics",
];

export default function AccessoriesPage() {
  const accessories = getSubCategory("textile-apparel", "accessories")!;

  return (
    <TrivoxaShell film="accessories">
      <PageHero
        crumb={[
          { label: "Businesses", href: "/businesses/" },
          { label: "Product Exports", href: "/businesses/product-exports/" },
          { label: "Textile & Apparel", href: `${BASE}/` },
          { label: "Accessories" },
        ]}
        eyebrow="Textile & Apparel Accessories"
        title="Every Detail That Finishes a Garment."
        description="From elastics and trims to labels, fastenings, and sewing materials — we supply the accessories that complete apparel and textile production."
        actions={[{ label: "Request a Quote", modal: true }, { label: "Back to Textile & Apparel", href: `${BASE}/`, variant: "ghost" }]}
      />

      <Section
        eyebrow="Category Overview"
        title="A Complete Accessories Portfolio."
        lead="Accessories are small components with a big impact on quality and brand. We coordinate a wide range of elastics, trims, labels, and fastenings to match your product and standards."
      />

      <Section eyebrow="Product Portfolio" title="Accessories We Supply." lead="Five product families — expand a group and click any row for the full specification.">
        <ProductTable groups={accessories.groups} />
      </Section>

      <Section eyebrow="Quality Standards" title="Consistency in Every Component.">
        <Checklist items={quality} />
      </Section>

      <CtaBand
        title="Source Accessories With Confidence."
        description="Share your accessory requirements and specifications — we'll coordinate dependable supply."
        actions={[{ label: "Request a Quote", modal: true }, { label: "Explore Fabrics", href: `${BASE}/fabrics/`, variant: "ghost" }]}
      />
    </TrivoxaShell>
  );
}
