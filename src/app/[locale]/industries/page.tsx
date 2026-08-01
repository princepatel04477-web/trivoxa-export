import type { Metadata } from "next";
import TrivoxaShell from "@/components/trivoxa/TrivoxaShell";
import { PageHero, Section, CtaBand } from "@/components/trivoxa/ui";
import SplitScreenSticky from "@/components/patterns/SplitScreenSticky";
import EditorialPanel from "@/components/patterns/EditorialPanel";
import NumberedList from "@/components/patterns/NumberedList";
import HorizontalTimeline from "@/components/patterns/HorizontalTimeline";
import IndustryManifest from "@/components/industries/IndustryManifest";
import { industries } from "@/lib/data/industries";
import { SHIVESHWAR_DESCRIPTOR } from "@/lib/corporate";
import "@/app/styles/patterns.css";
import "@/app/styles/industries-page.css";

export const metadata: Metadata = {
  title: "Industries | Trivoxa Group",
  description:
    "Trivoxa Group serves diverse industries with tailored product sourcing and professional service solutions across global markets.",
};

const solutions = [
  { title: "Strategic Product Sourcing" },
  { title: "Professional Service Solutions" },
  { title: "Manufacturing Partnerships" },
  { title: "Quality Coordination" },
  { title: "Export Documentation" },
  { title: "Logistics Coordination" },
  { title: "Technology Integration" },
  { title: "Long-Term Business Support" },
];

const approach = [
  { title: "Understand Industry Requirements", description: "We begin by understanding your business, technical specifications, compliance requirements, and commercial objectives before recommending the most appropriate solution." },
  { title: "Connect the Right Partners", description: "Our network of trusted manufacturers, skilled professionals, logistics providers, and technology specialists enables us to assemble solutions tailored to your industry." },
  { title: "Deliver Reliable Solutions", description: "Whether coordinating product sourcing or delivering professional services, we focus on quality, transparency, and dependable execution throughout every stage." },
  { title: "Build Long-Term Relationships", description: "We believe the strongest business relationships are built through trust, consistent performance, and a shared commitment to sustainable growth." },
];

const strengths = [
  { title: "Manufacturing Foundation", description: SHIVESHWAR_DESCRIPTOR },
  { title: "Industry Understanding", description: "Solutions developed around the operational realities of each industry." },
  { title: "Trusted Network", description: "A growing ecosystem of manufacturers, technology providers, logistics specialists, and business professionals." },
  { title: "Quality-Driven Operations", description: "Committed to consistency, reliability, and continuous improvement." },
  { title: "Global Perspective", description: "Supporting businesses through international sourcing, professional services, and global partnerships." },
  { title: "Long-Term Relationships", description: "Focused on building partnerships that continue creating value well beyond individual projects." },
];

export default function IndustriesPage() {
  return (
    <TrivoxaShell film="footer-drift">
      {/* 1. HERO */}
      <PageHero
        eyebrow="Industries"
        title="Industry Expertise. Global Opportunities."
        description="Every industry has unique challenges, standards, and opportunities. Trivoxa Group combines manufacturing expertise, strategic sourcing, and professional services to deliver solutions tailored to the evolving needs of businesses across international markets."
        actions={[{ label: "Explore Industries", href: "#industries" }, { label: "Request a Quote", modal: true, variant: "ghost" }]}
      />

      {/* 2. INDUSTRIES OVERVIEW — split-screen sticky */}
      <div className="container">
        <SplitScreenSticky
          eyebrow="Our Industries"
          title="Supporting Industries Through Knowledge, Partnership, and Global Solutions."
          paragraphs={[
            "At Trivoxa, we believe successful partnerships begin with understanding the industries we serve.",
            "Every sector has its own operational requirements, quality standards, and commercial expectations. By combining manufacturing expertise, international trade experience, and professional services, we deliver solutions designed to address industry-specific challenges while creating long-term business value.",
            "Whether supporting manufacturers, distributors, retailers, healthcare organizations, or technology-driven businesses, our goal remains the same: helping our partners grow with confidence in an increasingly connected global marketplace.",
          ]}
        />
      </div>

      {/* 3. INDUSTRIES WE SERVE — editorial manifest */}
      <Section id="industries" eyebrow="Industries We Serve" title="Solutions Across Diverse Industries." lead="Trivoxa Group supports a growing portfolio of industries through trusted partnerships, responsible sourcing, and tailored business solutions.">
        <IndustryManifest
          rows={industries.map((i) => ({
            name: i.name,
            description: i.description,
            href: `/industries/${i.slug}/`,
          }))}
        />
      </Section>

      {/* 4. INDUSTRY CHALLENGES — editorial prose */}
      <EditorialPanel
        eyebrow="Understanding Your Industry"
        title="Every Industry Has Different Challenges. Every Solution Should Be Different."
        paragraphs={[
          "No two industries operate in exactly the same way.",
          "From regulatory compliance and quality assurance to supply chain reliability, production efficiency, and changing market expectations, every sector presents its own set of opportunities and challenges.",
          "At Trivoxa, we begin by understanding these realities before recommending solutions that align with our clients' operational, technical, and commercial objectives.",
        ]}
      />

      {/* 5. OUR INDUSTRY SOLUTIONS — numbered list */}
      <Section eyebrow="Our Capabilities" title="Solutions Designed Around Industry Requirements." lead="Our capabilities extend beyond supplying products or delivering services. We work with businesses to develop practical solutions that support operational efficiency, international growth, and long-term success.">
        <NumberedList items={solutions} />
      </Section>

      {/* 6. HOW WE PARTNER WITH EVERY INDUSTRY — horizontal timeline */}
      <Section eyebrow="Our Approach" title="Building Strong Partnerships Across Every Industry." lead="Every successful partnership follows a structured approach built on understanding, collaboration, and long-term commitment.">
        <HorizontalTimeline steps={approach} />
      </Section>

      {/* 7. WHY INDUSTRIES CHOOSE TRIVOXA — numbered list */}
      <Section eyebrow="Why Trivoxa" title="Built on Experience. Driven by Partnership." lead="Businesses choose Trivoxa because we combine practical industry knowledge with a long-term approach to international business.">
        <NumberedList items={strengths} />
      </Section>

      {/* 8. LOOKING AHEAD — editorial prose */}
      <EditorialPanel
        eyebrow="Looking Ahead"
        title="Growing Alongside the Industries We Serve."
        paragraphs={[
          "Industries continue to evolve, and so does Trivoxa.",
          "We remain committed to expanding our capabilities, strengthening international partnerships, embracing innovation, and supporting emerging industries with responsible business practices and forward-looking solutions.",
          "As we continue to grow, our focus remains on creating sustainable value for our partners while contributing to stronger industries and more connected global markets.",
        ]}
      />

      {/* 9. CTA */}
      <CtaBand
        title="Let's Build Industry Solutions Together."
        description="Whether you're seeking trusted sourcing, professional expertise, or a long-term international business partner, Trivoxa is ready to help your business move forward with confidence."
        actions={[{ label: "Request a Quote", modal: true }, { label: "Contact Our Team", href: "/contact/", variant: "ghost" }]}
      />
    </TrivoxaShell>
  );
}
