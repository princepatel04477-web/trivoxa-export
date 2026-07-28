import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import TrivoxaShell from "@/components/trivoxa/TrivoxaShell";
import { Eyebrow, Section, CtaBand } from "@/components/trivoxa/ui";
import SplitScreenSticky from "@/components/patterns/SplitScreenSticky";
import EditorialPanel from "@/components/patterns/EditorialPanel";
import NumberedList from "@/components/patterns/NumberedList";
import SectionGrain from "@/components/patterns/SectionGrain";
import HorizontalTimeline from "@/components/patterns/HorizontalTimeline";
import LeadershipPanel from "@/components/leadership/LeadershipPanel";
import EcosystemDiagram from "@/components/ecosystem/EcosystemDiagram";
import GroupLattice from "@/components/group/GroupLattice";
import "@/app/styles/patterns.css";
import "@/app/styles/group-page.css";
import "@/app/styles/signature-canvas.css";

export const metadata: Metadata = {
  title: "Group | Trivoxa Group",
  description:
    "Trivoxa Group is an international business group committed to connecting global businesses with trusted products, strategic sourcing solutions, and professional services.",
};

const principles = [
  { title: "Vision", description: "We think beyond today's opportunities and build for tomorrow." },
  { title: "Integrity", description: "Trust is earned through honesty, transparency, and consistency." },
  { title: "Excellence", description: "We pursue the highest standards in everything we deliver." },
  { title: "Innovation", description: "We embrace new ideas, technology, and continuous improvement." },
  { title: "Partnership", description: "We believe sustainable success is created together." },
  { title: "Impact", description: "We measure success by the lasting value we create for partners, communities, and future generations." },
];

const ecosystem = [
  { title: "Product Export Division", description: "Sourcing and delivering quality products through trusted manufacturing partners." },
  { title: "Service Export Division", description: "Technology, design, and professional services delivered by skilled teams." },
  { title: "Manufacturing Network", description: "Anchored by Shiveshwar Textiles and a growing partner base." },
  { title: "Technology Partners", description: "Specialists enabling digital transformation and automation." },
  { title: "Logistics Partners", description: "Coordinated export, documentation, and supply-chain delivery." },
  { title: "Global Client Network", description: "Buyers and organizations we serve across international markets." },
];

const foundationPhotos = [
  { src: "/images/foundation/exterior.jpg", caption: "Factory Exterior" },
  { src: "/images/foundation/weaving.jpg", caption: "Weaving Floor" },
  { src: "/images/foundation/inspection.jpg", caption: "Quality Inspection" },
];

/** Founders wall. Drop real portraits at /images/leadership/{parth,dhruv,tirth}.jpg
 * and set `photoSrc` on each entry — the panel renders an honest "profile in
 * progress" placeholder until then. Messages are the three paragraphs of the
 * leadership statement from the master content doc, one per founder. */
const founders = [
  {
    name: "Parth Mangukiya",
    role: "Founder & Managing Director",
    email: "parth@trivoxagroup.com",
    align: "left" as const,
    message:
      "Leadership at Trivoxa is driven by a commitment to long-term thinking, responsible decision-making, and continuous improvement.",
  },
  {
    name: "Dhruv Patel",
    role: "Co-Founder, Business Development",
    email: "dhruv@trivoxagroup.com",
    align: "right" as const,
    message:
      "Our responsibility extends beyond business growth. We are building an organization founded on trust, guided by integrity, and dedicated to creating meaningful value for our customers, partners, and communities.",
  },
  {
    name: "Tirth Kalathiya",
    role: "Co-Founder, Technology & Innovation",
    email: "tirth@trivoxagroup.com",
    align: "left" as const,
    message:
      "As Trivoxa grows, our leadership will continue to uphold the principles that define our organization while embracing innovation and new opportunities across global markets.",
  },
];

/** The journey as stages, not invented dates — the master content doc
 * records the sequence of the group's growth, not a year-by-year ledger,
 * and we don't fabricate one. */
const journey = [
  { title: "Manufacturing Foundations", description: "Shiveshwar Textiles builds deep expertise in woven textile production and quality-focused operations." },
  { title: "An International Vision", description: "The founders recognize global demand for a trusted partner into India's manufacturing capability." },
  { title: "Trivoxa Group Established", description: "The international business arm is founded to bridge global buyers and Indian production." },
  { title: "Two Export Divisions", description: "Product Exports and Service Exports (Trivoxa Digital) launch as the group's operating arms." },
  { title: "Growing Global Partnerships", description: "The network expands across industries, regions, and long-term client relationships." },
];

const commitments = [
  { name: "Ethical Business Practices", description: "Conducting every relationship with honesty, fairness, and accountability." },
  { name: "Responsible Sourcing", description: "Partnering with manufacturers who share our standards for quality and fair practice." },
  { name: "Quality Without Compromise", description: "Holding every product and service to a standard worth trusting." },
  { name: "Transparent Communication", description: "Keeping partners informed with clear, consistent, and honest dialogue." },
  { name: "Long-Term Partnerships", description: "Building relationships measured in years, not transactions." },
  { name: "Sustainable Business Growth", description: "Expanding deliberately, in ways that create lasting value." },
  { name: "Continuous Innovation", description: "Improving how we work, so we can better serve the partners who rely on us." },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Trivoxa Group",
  description:
    "Trivoxa Group is an international business group committed to connecting global businesses with trusted products, strategic sourcing solutions, and professional services.",
  parentOrganization: {
    "@type": "Organization",
    name: "Shiveshwar Textiles",
  },
  founder: founders.map((f) => ({
    "@type": "Person",
    name: f.name,
    jobTitle: f.role,
    email: f.email,
  })),
};

export default function GroupPage() {
  return (
    <TrivoxaShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Signature animation: one persistent canvas behind every section, its hex
          lattice subdividing as the reader descends. Replaces the GLSL shader
          background this page used to carry — one WebGL context per page. */}
      <div className="gp-canvas" aria-hidden="true">
        <GroupLattice />
      </div>

      {/* 1. HERO */}
      <section className="group-hero">
        <SectionGrain className="hero-grain" />
        <div className="container group-hero__inner">
          <Eyebrow>The Group</Eyebrow>
          <h1 className="group-hero__title">Building an Organization Designed to Endure.</h1>
          <p className="group-hero__desc">
            Trivoxa Group is an international business group built on a strong manufacturing foundation and driven
            by a global vision. Through trusted partnerships, strategic sourcing, and professional services, we
            connect businesses with opportunities while creating lasting value across international markets.
          </p>
          <Link href="#our-story" className="tvx-btn tvx-btn--primary group-hero__scroll">
            <span>Discover Our Story</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 2.5v11M3 9l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </section>

      {/* 2. WHO WE ARE */}
      <div className="container">
        <SplitScreenSticky
          eyebrow="Who We Are"
          title="A Global Business Group Built on Trust, Purpose, and Long-Term Vision."
          paragraphs={[
            "Trivoxa Group is an international business group committed to connecting global businesses with trusted products, strategic sourcing solutions, and professional services.",
            "Built upon the manufacturing expertise of our parent company, Shiveshwar Textiles, we combine industry knowledge with a forward-looking approach to international business. By bringing together trusted manufacturers, skilled professionals, and global partners, we help organizations build stronger supply chains, access new opportunities, and achieve sustainable growth.",
            "At Trivoxa, we believe meaningful business is built on trust, quality, and relationships that last far beyond a single transaction.",
          ]}
        />
      </div>

      {/* 3. OUR FOUNDATION */}
      <section className="tvx-section foundation-section" id="foundation">
        <div className="container">
          <Eyebrow>Our Foundation</Eyebrow>
          <h2>Built on Manufacturing Excellence. Inspired by Global Opportunity.</h2>
          <div className="foundation-split">
            <div className="foundation-split__copy">
              <p>Every great organization is built on a strong foundation.</p>
              <p>
                Trivoxa Group was established as the international business arm of Shiveshwar Textiles, a
                manufacturing company with extensive expertise in woven textile production and quality-focused
                operations.
              </p>
              <p>
                This manufacturing heritage provides us with practical industry knowledge, a deep understanding of
                production processes, and a commitment to delivering reliable solutions to global markets.
              </p>
              <p>
                While Trivoxa continues to expand into new industries and business services, our foundation remains
                rooted in the principles that have guided us from the beginning — quality, reliability, integrity,
                and long-term partnerships.
              </p>
            </div>
            <div className="foundation-split__photos">
              {foundationPhotos.map((photo) => (
                <figure key={photo.src} className="foundation-photo">
                  <div className="foundation-photo__frame">
                    {/* .foundation-photo__frame already holds a 4/3 box, so
                        fill reserves the layout with no shift on load. */}
                    <Image
                      src={photo.src}
                      alt={`Shiveshwar Textiles — ${photo.caption}`}
                      fill
                      sizes="(max-width: 700px) 100vw, 33vw"
                    />
                  </div>
                  <figcaption className="foundation-photo__caption">Shiveshwar Textiles — {photo.caption}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 4. OUR STORY */}
      <EditorialPanel
        id="our-story"
        eyebrow="Our Story"
        title="Creating Opportunities Beyond Borders."
        paragraphs={[
          "Trivoxa was founded with a vision to bridge the gap between global demand and India's extraordinary capabilities.",
          "We recognized that businesses around the world needed more than products — they needed a trusted partner capable of understanding their requirements, connecting them with reliable manufacturing, and supporting them throughout every stage of international trade.",
          "Guided by this purpose, Trivoxa was created to build long-term relationships that extend beyond commerce and contribute to sustainable business growth for partners across the world.",
        ]}
      />

      {/* 4b. THE JOURNEY — visual timeline (spec §4, The Group) */}
      <Section eyebrow="The Journey" title="How the Group Took Shape.">
        <HorizontalTimeline steps={journey} />
      </Section>

      {/* 5. OUR VISION */}
      <section className="group-vision" id="vision">
        <SectionGrain className="group-vision__grain" />
        <div className="container group-vision__inner">
          <Eyebrow>Our Vision</Eyebrow>
          <h2 className="sr-only">Our Vision</h2>
          <p className="group-vision__statement">
            To become one of the world&rsquo;s most trusted international business groups by creating lasting value
            through global trade, innovation, and enduring partnerships.
          </p>
          <p className="group-vision__support">
            Our vision is to build an organization that continues creating opportunities across industries and
            international markets for generations to come.
          </p>
        </div>
      </section>

      {/* 6. THE TRIVOXA WAY */}
      <Section id="trivoxa-way" eyebrow="Our Philosophy" title="The Trivoxa Way" lead="Every decision we make is guided by principles that define who we are and how we build relationships.">
        <NumberedList items={principles} />
      </Section>

      {/* 7. LEADERSHIP — founders wall */}
      <div id="leadership">
        {founders.map((f, i) => (
          <LeadershipPanel
            key={f.name}
            eyebrow={i === 0 ? "Leadership" : undefined}
            name={f.name}
            role={f.role}
            email={f.email}
            align={f.align}
            message={f.message}
          />
        ))}
      </div>

      {/* 8. BUSINESS ECOSYSTEM */}
      <Section id="ecosystem" eyebrow="Our Ecosystem" title="One Connected Network. Endless Opportunities." lead="Trivoxa Group brings together manufacturing expertise, strategic sourcing, technology, logistics, and professional services within one integrated business ecosystem.">
        <EcosystemDiagram centerLabel="Trivoxa Group" nodes={ecosystem.map((item) => ({ label: item.title }))} />
      </Section>

      {/* 9. STRATEGIC PARTNERS */}
      <section className="tvx-section partners-section">
        <div className="container">
          <Eyebrow>Strategic Partners</Eyebrow>
          <h2>Growing Through Trusted Partnerships.</h2>
          <div className="tvx-lead">
            <p>Strong partnerships are the foundation of sustainable business.</p>
          </div>
          <div className="partners-grid">
            <div className="partners-grid__founding">
              <figure className="foundation-photo__frame" />
              <h3>Founding Manufacturing Partner — Shiveshwar Textiles</h3>
              <p>
                As the parent company of Trivoxa Group, Shiveshwar Textiles provides the manufacturing expertise
                and industry experience that support our commitment to quality and reliability.
              </p>
              <p>
                Alongside our parent company, we continue building relationships with trusted manufacturers,
                logistics providers, technology partners, and industry specialists who share our values.
              </p>
            </div>
            <p className="partners-grid__growth-note">
              Our partner network continues to grow across manufacturing, logistics, and technology.
            </p>
          </div>
        </div>
      </section>

      {/* 10. OUR COMMITMENTS */}
      <Section id="commitments" eyebrow="Our Commitments" title="Our Commitment to Every Relationship." lead="Every partnership begins with trust and is strengthened through consistent action. We are committed to conducting business responsibly, delivering reliable solutions, and continuously improving the way we serve our partners around the world.">
        <table className="commitments-table">
          <thead>
            <tr>
              <th className="commitments-table__num" scope="col">#</th>
              <th scope="col">Commitment</th>
              <th scope="col">Brief Description</th>
            </tr>
          </thead>
          <tbody>
            {commitments.map((item, i) => (
              <tr key={item.name}>
                <td className="commitments-table__num" data-label="#">{String(i + 1).padStart(2, "0")}</td>
                <td className="commitments-table__name" data-label="Commitment">{item.name}</td>
                <td className="commitments-table__desc" data-label="Brief Description">{item.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* 11. LOOKING AHEAD */}
      <EditorialPanel
        id="looking-ahead"
        eyebrow="Looking Ahead"
        title="Building for the Next Generation of Global Business."
        paragraphs={[
          "Our journey is only beginning.",
          "As we look ahead, Trivoxa will continue expanding into new industries, strengthening international partnerships, embracing emerging technologies, and developing innovative solutions that create lasting value.",
          "Our ambition is not simply to grow as a business, but to build an organization that future generations will be proud to lead and global partners will continue to trust.",
        ]}
      />

      {/* 12. CTA */}
      <div className="group-cta-wrap">
        <SectionGrain className="group-cta-wrap__grain" />
        <CtaBand
          title="Let's Build the Future Together."
          description="Whether you're looking to source products, expand into international markets, or establish a long-term business partnership, our team is ready to help you move forward with confidence."
          actions={[{ label: "Partner With Us", modal: true }, { label: "Contact Our Team", href: "/contact/", variant: "ghost" }]}
        />
      </div>
    </TrivoxaShell>
  );
}
