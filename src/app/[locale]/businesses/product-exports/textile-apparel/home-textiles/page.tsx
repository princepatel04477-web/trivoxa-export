import type { Metadata } from "next";
import TrivoxaShell from "@/components/trivoxa/TrivoxaShell";
import { PageHero, Section, Pills, CtaBand } from "@/components/trivoxa/ui";

export const metadata: Metadata = {
  title: "Home Textiles | Trivoxa Group",
  description: "Bed linen, towels, curtains, cushions, rugs, and upholstery sourced through trusted manufacturing partners.",
};

const BASE = "/businesses/product-exports/textile-apparel";

const range = ["Bed Linen", "Towels", "Curtains", "Cushions", "Rugs", "Upholstery"];

export default function HomeTextilesPage() {
  return (
    <TrivoxaShell film="home-textiles">
      <PageHero
        crumb={[
          { label: "Businesses", href: "/businesses/" },
          { label: "Product Exports", href: "/businesses/product-exports/" },
          { label: "Textile & Apparel", href: `${BASE}/` },
          { label: "Home Textiles" },
        ]}
        eyebrow="Home Textiles"
        title="Textiles That Furnish the Home."
        description="Bed linen, towels, curtains, cushions, rugs, and upholstery — sourced through trusted manufacturing partners and coordinated to your specifications."
        actions={[{ label: "Request a Quote", modal: true }, { label: "Back to Textile & Apparel", href: `${BASE}/`, variant: "ghost" }]}
      />

      <Section
        eyebrow="Category Overview"
        title="A Growing Home-Textile Range."
        lead="Detailed product portfolio is being finalized with our manufacturing partners. Share your requirement and our sourcing team will respond with availability, specifications, and pricing."
      />

      <Section eyebrow="Product Range" title="What We Source.">
        <Pills items={range} />
      </Section>

      <CtaBand
        title="Source Home Textiles With Confidence."
        description="Tell us the products, constructions, and volumes you need — we'll coordinate the right supply."
        actions={[{ label: "Request a Quote", modal: true }, { label: "Explore Accessories", href: `${BASE}/accessories/`, variant: "ghost" }]}
      />
    </TrivoxaShell>
  );
}
