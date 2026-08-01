import type { Metadata } from "next";
import Link from "next/link";
import TrivoxaShell from "@/components/trivoxa/TrivoxaShell";
import { PageHero, Section } from "@/components/trivoxa/ui";
import ContactForm from "@/components/ContactForm";
import { CONTACT, mailto } from "@/data/contact";
import { SHIVESHWAR_RELATIONSHIP } from "@/lib/corporate";
import "@/app/styles/industries-page.css";

export const metadata: Metadata = {
  title: "Contact | Trivoxa Group",
  description: "Start a conversation with Trivoxa Group — source products, expand into new markets, or become a partner.",
};

/** The six inquiry types, each routed to the channel that already handles
 * it — the RFQ flow for quotes, this page's form for conversations. */
const inquiryTypes = [
  { name: "Product Export Inquiry", description: "Source products through our manufacturing network — quoted against HS codes and MOQs.", href: "/rfq/" },
  { name: "Service Export Inquiry", description: "Technology, AI, software, design, marketing, and business support services.", href: "/businesses/service-exports/" },
  { name: "Supplier & Manufacturing Partnership", description: "Join our partner network as a manufacturer or solution provider.", href: "#message" },
  { name: "Strategic Partnership", description: "Distribution, investment, joint ventures, and referral partnerships.", href: "#message" },
  { name: "Career Opportunities", description: "Open roles and open applications across the group.", href: "/careers/" },
  { name: "General Inquiry", description: "Anything else — we'll route it to the right person.", href: "#message" },
];

export default function ContactPage() {
  return (
    <TrivoxaShell film="contact">
      <PageHero
        eyebrow="Contact"
        title="Let's Build the Future Together."
        description="Whether you're looking to source products, expand into international markets, or establish a long-term business partnership, our team is ready to help you move forward with confidence."
        actions={[{ label: "Contact Us", href: "#message" }, { label: "Request a Quote", href: "/rfq/", variant: "ghost" }]}
      />

      <Section eyebrow="How Can We Help?" title="Choose Where to Start.">
        <div className="industry-list">
          {inquiryTypes.map((t, i) => (
            <Link key={t.name} href={t.href} className="industry-row">
              <span className="industry-row__index">{String(i + 1).padStart(2, "0")}</span>
              <span className="industry-row__name">{t.name}</span>
              <span className="industry-row__desc">{t.description}</span>
            </Link>
          ))}
        </div>
      </Section>

      <Section tight id="message">
        <div className="tvx-split">
          <div className="tvx-contact-card">
            <h3 className="tvx-contact-heading">Drop us a line, and we&rsquo;ll get in touch.</h3>
            <ContactForm />
          </div>
          <div>
            <div className="tvx-info-row">
              <div className="tvx-info-label">Email</div>
              <a href={mailto(CONTACT.general)}>{CONTACT.general}</a>
            </div>
            <div className="tvx-info-row">
              <div className="tvx-info-label">Business</div>
              <p>Product Exports &amp; Service Exports</p>
            </div>
            <div className="tvx-info-row">
              <div className="tvx-info-label">Foundation</div>
              <p>Backed by our {SHIVESHWAR_RELATIONSHIP}, Shiveshwar Textiles</p>
            </div>
            <div className="tvx-info-row">
              <div className="tvx-info-label">Follow</div>
              <p>LinkedIn · Instagram · X · YouTube</p>
            </div>
            <p className="contact-microcopy">
              Trivoxa Group operates globally while coordinating its business activities from Surat, Gujarat, India.
            </p>
          </div>
        </div>
      </Section>
    </TrivoxaShell>
  );
}
