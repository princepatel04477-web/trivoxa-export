import type { Metadata } from "next";
import Link from "next/link";
import TrivoxaShell from "@/components/trivoxa/TrivoxaShell";
import { PageHero, Section, Checklist, CtaBand } from "@/components/trivoxa/ui";
import "@/app/styles/textile-apparel-page.css";

export const metadata: Metadata = {
  title: "Textile & Apparel | Trivoxa Group",
  description:
    "Fabrics, home textiles, and apparel accessories sourced through trusted manufacturing partners, anchored by Shiveshwar Textiles.",
};

const BASE = "/businesses/product-exports/textile-apparel";

const categories = [
  { title: "Fabrics", description: "Polyester, cotton, blended, dyed, and finished fabrics for every application.", href: `${BASE}/fabrics/`, cta: "Explore Fabrics" },
  { title: "Home Textiles", description: "Bed linen, towels, curtains, cushions, rugs, and upholstery.", href: `${BASE}/home-textiles/`, cta: "Explore Home Textiles" },
  { title: "Textile & Apparel Accessories", description: "Elastics, zippers, buttons, labels, trims, and sewing materials.", href: `${BASE}/accessories/`, cta: "Explore Accessories" },
];

const capabilities = [
  "Woven textile production expertise (Shiveshwar Textiles)",
  "Greige, dyed, printed, and finished fabric supply",
  "Custom sourcing for brands and wholesalers",
  "Quality-focused coordination and inspection",
  "Complete export documentation and logistics",
];

const applications = [
  "Apparel & Fashion Brands",
  "Home & Interior Retailers",
  "Wholesalers & Distributors",
  "Sourcing & Buying Houses",
  "Hospitality & Institutional",
];

export default function TextileApparelPage() {
  return (
    <TrivoxaShell film="textile-apparel">
      <PageHero
        crumb={[{ label: "Businesses", href: "/businesses/" }, { label: "Product Exports", href: "/businesses/product-exports/" }, { label: "Textile & Apparel" }]}
        eyebrow="Textile & Apparel"
        title="Textile & Apparel Exports."
        description="Supporting manufacturers, brands, wholesalers, and sourcing companies with fabrics, home textiles, apparel accessories, and customized sourcing solutions — built on the woven-textile expertise of Shiveshwar Textiles."
        actions={[{ label: "Request a Quote", modal: true }, { label: "Explore Fabrics", href: `${BASE}/fabrics/`, variant: "ghost" }]}
      />

      <Section
        eyebrow="Industry Overview"
        title="From Fibre to Finished Product."
        lead={
          "Textile & Apparel is where Trivoxa's story begins. Our founding strategic partner, Shiveshwar Textiles, brings deep expertise in woven textile production and quality-focused operations.\n\n" +
          "Today we extend that heritage into a full sourcing capability — connecting global buyers with fabrics, home textiles, and apparel accessories through a trusted partner network."
        }
      />

      <Section eyebrow="Product Categories" title="Three Core Categories.">
        <div className="tvx-lookbook">
          {categories.map((c, i) => (
            <Link
              key={c.title}
              href={c.href}
              className={`tvx-lookbook-row${i % 2 === 1 ? " tvx-lookbook-row--reverse" : ""}`}
            >
              <div className="tvx-lookbook-row__content">
                <span className="tvx-lookbook-row__index">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="tvx-lookbook-row__title">{c.title}</h3>
                <p className="tvx-lookbook-row__desc">{c.description}</p>
                <span className="tvx-lookbook-row__link">{c.cta}</span>
              </div>
              <div className="tvx-lookbook-row__media" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </Section>

      <Section eyebrow="Manufacturing Capabilities" title="Built on Real Production Knowledge.">
        <Checklist items={capabilities} />
      </Section>

      <Section eyebrow="Applications" title="Who We Support." lead="Our textile sourcing serves partners across the apparel and interior value chain.">
        <div className="tvx-pills" style={{ marginTop: 30 }}>
          {applications.map((a) => (
            <span key={a} className="tvx-pill">{a}</span>
          ))}
        </div>
      </Section>

      <CtaBand
        title="Let's Build Your Textile Supply Chain."
        description="Whether you need greige fabric, finished textiles, or apparel accessories, our team is ready to source with confidence."
        actions={[{ label: "Request a Quote", modal: true }, { label: "Contact Our Team", href: "/contact/", variant: "ghost" }]}
      />
    </TrivoxaShell>
  );
}
