import type { Metadata } from "next";
import Image from "next/image";
import TrivoxaShell from "@/components/trivoxa/TrivoxaShell";
import { PageHero, Section, CtaBand } from "@/components/trivoxa/ui";
import HorizontalTimeline from "@/components/patterns/HorizontalTimeline";
import JobBoard from "@/components/careers/JobBoard";
import CareersTeam from "@/components/careers/CareersTeam";
import "@/app/styles/patterns.css";
import "@/app/styles/careers-page.css";
import "@/app/styles/signature-canvas.css";

export const metadata: Metadata = {
  title: "Careers | Trivoxa Group",
  description:
    "Build a long-term career at Trivoxa Group — a culture driven by curiosity, integrity, innovation, and continuous growth.",
};

const values = [
  { icon: "🚀", title: "Curiosity", description: "We ask better questions and stay hungry to learn across every market we enter." },
  { icon: "🤝", title: "Integrity", description: "We do the right thing — with partners, customers, and each other." },
  { icon: "✦", title: "Innovation", description: "We embrace new ideas, technology, and continuous improvement." },
  { icon: "🌱", title: "Continuous Growth", description: "We invest in people who want to build something larger than themselves." },
];

const areas = [
  { icon: "🌐", title: "Global Trade & Sourcing", description: "Coordinate product exports, supplier relationships, and international logistics." },
  { icon: "💻", title: "Technology & Services", description: "Software, AI, design, and digital delivery for our service export division." },
  { icon: "📈", title: "Business & Partnerships", description: "Growth, client relationships, and long-term partnership development." },
];

/** What working here actually offers — growth mechanics, not perks theatre. */
const benefits = [
  { title: "International Exposure", description: "Work directly with buyers, manufacturers, and partners across six global regions from day one." },
  { title: "Ownership Early", description: "Small teams and a growing group mean real responsibility — corridors, clients, and products you own." },
  { title: "Two Worlds, One Company", description: "Physical trade and digital services under one roof — move between them as your interests grow." },
  { title: "Learning as Default", description: "Export compliance, technology, negotiation — the group invests in the skills the work demands." },
  { title: "A Clear Growth Path", description: "Contributor → coordinator → corridor or practice lead, reviewed openly against the work, not tenure." },
  { title: "Built to Endure", description: "A long-term company, deliberately grown — careers here are measured in years, not projects." },
];

/** Real leadership voices from the master content doc — not invented
 * employee testimonials. */
const voices = [
  {
    quote: "Leadership at Trivoxa is driven by a commitment to long-term thinking, responsible decision-making, and continuous improvement.",
    name: "Parth Mangukiya",
    role: "Founder & Managing Director",
  },
  {
    quote: "We are building an organization founded on trust, guided by integrity, and dedicated to creating meaningful value for our customers, partners, and communities.",
    name: "Dhruv Patel",
    role: "Co-Founder, Business Development",
  },
  {
    quote: "As Trivoxa grows, our leadership will continue to uphold the principles that define our organization while embracing innovation and new opportunities.",
    name: "Tirth Kalathiya",
    role: "Co-Founder, Technology & Innovation",
  },
];

/** Where the work happens — the group's real manufacturing floor. */
const culturePhotos = [
  { src: "/images/foundation/exterior.jpg", caption: "Factory exterior — Shiveshwar Textiles" },
  { src: "/images/foundation/weaving.jpg", caption: "The weaving floor" },
  { src: "/images/foundation/inspection.jpg", caption: "Quality inspection" },
];

export default function CareersPage() {
  return (
    <TrivoxaShell>
      {/* Signature animation: one persistent canvas behind every section. A single
          abstract silhouette in the hero is joined by a second, then multiplies into
          a connected team formation behind the open roles, then relaxes. Replaces
          the GLSL shader background this page used to carry — one WebGL context
          per page. */}
      <div className="gp-canvas" aria-hidden="true">
        <CareersTeam />
      </div>

      <PageHero
        eyebrow="Careers"
        title="Build What's Next With Us."
        description={
          "Every great organization is built by people who believe in creating something larger than themselves.\n\n" +
          "At Trivoxa, we're building a culture driven by curiosity, integrity, innovation, and continuous growth — where ambitious people come together to create meaningful impact across global industries."
        }
        actions={[{ label: "Explore Opportunities", href: "#opportunities" }, { label: "Get in Touch", href: "/contact/", variant: "ghost" }]}
      />

      <Section id="culture" eyebrow="Our Culture" title="A Culture Built for Ambitious People." lead="We combine the discipline of a manufacturing heritage with the energy of a growing international business — a place to do meaningful, lasting work.">
        <div className="careers-values-list">
          {values.map((v, i) => (
            <div className="careers-value-row" key={v.title}>
              <span className="careers-value-row__index">{String(i + 1).padStart(2, "0")}</span>
              <span className="careers-value-row__title">{v.title}</span>
              <p className="careers-value-row__desc">{v.description}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Culture photo essay + leadership voices (spec §4 — Careers) */}
      <Section eyebrow="Where the Work Happens" title="From the Factory Floor to Global Markets.">
        <div className="careers-photo-essay">
          {culturePhotos.map((p) => (
            <figure key={p.src}>
              {/* Intrinsic 1200x900; the stylesheet still drives the rendered
                  size (width:100%, aspect-ratio 4/3, object-fit cover). */}
              <Image src={p.src} alt={p.caption} width={1200} height={900} sizes="(max-width: 700px) 100vw, 33vw" />
              <figcaption>{p.caption}</figcaption>
            </figure>
          ))}
        </div>
        <div className="careers-voices">
          {voices.map((v) => (
            <blockquote key={v.name} className="careers-voice">
              <p>&ldquo;{v.quote}&rdquo;</p>
              <footer>
                <strong>{v.name}</strong> — {v.role}
              </footer>
            </blockquote>
          ))}
        </div>
      </Section>

      <Section id="areas" eyebrow="Where You Fit" title="Areas We're Growing." lead="As Trivoxa expands across industries and markets, we're building teams across trade, technology, and partnerships.">
        <div className="careers-dept-strip">
          {areas.map((a, i) => (
            <div className="careers-dept" key={a.title}>
              <span className="careers-dept__index">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="careers-dept__name">{a.title}</h3>
              <p className="careers-dept__desc">{a.description}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Benefits & growth paths (spec §4 — Careers) */}
      <Section eyebrow="What You Get" title="Benefits Built Around Growth.">
        <div className="tvx-statements">
          {benefits.map((b) => (
            <div className="tvx-statement" key={b.title}>
              <span className="tvx-statement__rule" aria-hidden="true" />
              <h3 className="tvx-statement__title">{b.title}</h3>
              <p className="tvx-statement__desc">{b.description}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="opportunities" eyebrow="Current Opportunities" title="Open Roles at Trivoxa.">
        <JobBoard />
      </Section>

      <Section eyebrow="Hiring Process" title="From Application to Welcome.">
        <HorizontalTimeline
          steps={[
            { title: "Application", description: "Send your application for an open role — or introduce yourself with an open application." },
            { title: "Review", description: "Our team reviews your experience against the role and the team's needs." },
            { title: "Interview", description: "A conversation about your background, interests, and how you like to work." },
            { title: "Assessment", description: "A practical, role-relevant exercise where it helps both sides." },
            { title: "Final Discussion", description: "Expectations, growth path, and any open questions — both directions." },
            { title: "Offer", description: "A clear, written offer with role, compensation, and start details." },
            { title: "Welcome to Trivoxa", description: "Structured onboarding into the team and the wider group." },
          ]}
        />
      </Section>

      <CtaBand
        title="Grow With a Company Built to Endure."
        description="We're always interested in talented people who share our values. Introduce yourself and tell us how you'd like to contribute."
        actions={[{ label: "Get in Touch", href: "/contact/" }, { label: "Learn About the Group", href: "/group/", variant: "ghost" }]}
      />
    </TrivoxaShell>
  );
}
