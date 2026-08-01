import type { Metadata } from "next";
import "@/app/styles/patterns.css";
import "@/app/styles/businesses-page.css";
import "@/app/styles/signature-canvas.css";
import TrivoxaShell from "@/components/trivoxa/TrivoxaShell";
import BusinessesCube from "@/components/businesses/BusinessesCube";
import { PageHero, Section, CtaBand } from "@/components/trivoxa/ui";
import SplitScreenSticky from "@/components/patterns/SplitScreenSticky";
import CinematicPanel from "@/components/patterns/CinematicPanel";
import HorizontalTimeline from "@/components/patterns/HorizontalTimeline";
import NumberedList from "@/components/patterns/NumberedList";
import { SHIVESHWAR_DESCRIPTOR } from "@/lib/corporate";
import { taxonomy } from "@/lib/data/taxonomy";

/** Product Exports division tags — every taxonomy entry with a live catalog
 * route, canonical full names (PTO-02). Previously a local literal array of
 * shortened, differently-named tags ("Healthcare", "Furniture", "Jewellery"
 * vs. the canonical "Healthcare & Pharmaceuticals" etc.). */
const productExportTags = taxonomy.filter((t) => t.catalogHref).map((t) => t.displayName);

export const metadata: Metadata = {
  title: "Businesses | Trivoxa Group",
  description:
    "Trivoxa Group operates through two divisions — Product Exports and Service Exports — delivering integrated solutions across global markets.",
};

/* Division panels. Drop looping b-roll at /videos/product-exports.mp4 and
 * /videos/service-exports.mp4 and set `videoSrc` on each entry — until then
 * the still image is the background everywhere. */
const divisions = [
  {
    id: "divisions",
    eyebrow: "Division 01",
    title: "PRODUCT EXPORTS",
    description:
      "We source and deliver high-quality products through a trusted network of manufacturing partners across India. From industrial materials and textiles to healthcare products and consumer goods, our focus is on connecting global buyers with dependable supply solutions that meet international expectations.",
    href: "/businesses/product-exports/",
    cta: "Explore Product Exports",
    image: "/images/businesses/product-exports-editorial.webp",
    categories: productExportTags,
    align: "left" as const,
  },
  {
    eyebrow: "Division 02",
    title: "SERVICE EXPORTS",
    description:
      "We help organizations accelerate growth through technology, software development, artificial intelligence, branding, digital marketing, and business support services. By connecting businesses with India's skilled professionals, we deliver practical solutions tailored to modern business challenges.",
    href: "/businesses/service-exports/",
    cta: "Explore Service Exports",
    image: "/images/businesses/service-exports-editorial.webp",
    categories: ["Technology", "AI", "Software", "Design & Branding", "Digital Marketing", "Business Support"],
    align: "right" as const,
  },
];

const steps = [
  { title: "Understand Your Requirements", description: "We begin by understanding your business objectives, technical specifications, and commercial expectations." },
  { title: "Recommend the Right Solution", description: "Based on your requirements, we identify the most suitable products, manufacturing partners, or professional service teams." },
  { title: "Coordinate Production or Execution", description: "We manage the sourcing, production, or project execution process while maintaining clear communication throughout." },
  { title: "Verify Quality", description: "Every solution is supported by quality-focused coordination and careful attention to agreed requirements." },
  { title: "Deliver with Confidence", description: "From documentation and logistics to project delivery and ongoing support, we work to ensure a reliable experience from start to finish." },
];

const strengths = [
  { title: "Manufacturing Foundation", description: SHIVESHWAR_DESCRIPTOR },
  { title: "Trusted Partner Network", description: "A growing ecosystem of carefully selected manufacturers, professionals, and solution providers." },
  { title: "Quality-Driven Approach", description: "Every project is guided by attention to quality, reliability, and long-term value." },
  { title: "Global Perspective", description: "Supporting businesses across international markets with solutions designed for global trade." },
  { title: "Scalable Solutions", description: "Flexible capabilities that grow alongside our clients' evolving needs." },
  { title: "Long-Term Relationships", description: "We believe sustainable success is achieved through lasting partnerships rather than one-time transactions." },
];

export default function BusinessesPage() {
  return (
    <TrivoxaShell>
      {/* Signature animation: one persistent canvas behind every section. A solid
          cube loosens, cleaves into the two divisions, resolves into the process
          chain, then converges into the shared eagle. Replaces the GLSL shader
          background this page used to carry — one WebGL context per page. */}
      <div className="gp-canvas" aria-hidden="true">
        <BusinessesCube />
      </div>

      {/* 1. HERO */}
      <PageHero
        eyebrow="Our Businesses"
        title="Global Solutions for Modern Business."
        description="Trivoxa Group delivers integrated product sourcing and professional service solutions that help businesses expand across international markets. Through trusted partnerships, manufacturing expertise, and a commitment to excellence, we connect organizations with the products, services, and opportunities they need to grow with confidence."
        actions={[{ label: "Request a Quote", modal: true }, { label: "Explore Our Divisions", href: "#divisions", variant: "ghost" }]}
      />

      {/* 2. BUSINESS OVERVIEW — split-screen sticky */}
      <div className="container" id="overview">
        <SplitScreenSticky
          eyebrow="Our Businesses"
          title="Two Divisions. One Shared Commitment to Excellence."
          paragraphs={[
            "Trivoxa Group operates through two complementary business divisions designed to support organizations across global markets.",
            "Our Product Export Division connects international buyers with trusted manufacturers and carefully sourced products from India, while our Service Export Division provides access to skilled professionals delivering technology, design, and business solutions.",
            "Together, these divisions enable us to offer integrated solutions that combine manufacturing strength, professional expertise, and long-term partnership.",
          ]}
        />
      </div>

      {/* 3. OUR BUSINESS DIVISIONS — full-bleed cinematic panels, no gap */}
      <section className="business-arms" id="divisions" aria-label="Our Business Divisions">
        {divisions.map((d) => (
          <CinematicPanel key={d.title} {...d} />
        ))}
      </section>

      {/* 4. HOW WE WORK — pinned horizontal process timeline */}
      <Section id="process" eyebrow="Our Process" title="A Structured Approach to Global Business." lead="Every successful partnership begins with understanding. Our process is designed to ensure clarity, quality, and confidence at every stage of the journey.">
        <HorizontalTimeline steps={steps} />
      </Section>

      {/* 5. WHY BUSINESSES CHOOSE TRIVOXA — numbered list */}
      <Section id="why" eyebrow="Why Trivoxa" title="Built on Experience. Focused on Partnership.">
        <NumberedList items={strengths} />
      </Section>

      {/* 6. CONTACT CTA */}
      <CtaBand
        title="Let's Build Global Business Together."
        description="Whether you're sourcing products, seeking professional expertise, or exploring new international opportunities, Trivoxa Group is ready to help you move forward with confidence."
        actions={[{ label: "Request a Quote", modal: true }, { label: "Contact Our Team", href: "/contact/", variant: "ghost" }]}
      />
    </TrivoxaShell>
  );
}
