import type { Metadata } from "next";
import TrivoxaShell from "@/components/trivoxa/TrivoxaShell";
import { PageHero, Section, CtaBand } from "@/components/trivoxa/ui";
import { CONTACT, mailto } from "@/data/contact";

export const metadata: Metadata = {
  title: "About | Trivoxa Group",
  description:
    "Trivoxa Group's origin story — built from a woven-textile manufacturing floor in Surat, Gujarat, into an international trade and export group.",
};

export default function AboutPage() {
  return (
    <TrivoxaShell film="about">
      <PageHero
        eyebrow="About"
        title="Built From a Manufacturing Floor in Surat."
        description="Trivoxa Group didn't start as a trading company. It started on the production floor of a textile manufacturer — and carried that discipline into international trade."
      />

      <Section
        eyebrow="Our Origin"
        title="From One Factory to a Growing Export Group."
        lead={
          "Trivoxa Group began in strategic partnership with Shiveshwar Textiles, a woven-textile manufacturer based in Surat, Gujarat. Years spent running production floors — managing looms, holding delivery windows, answering to quality checks — shaped how the company approaches export: reliability first, everything else second.\n\n" +
          "As buyer inquiries grew beyond textiles into healthcare, building materials, agriculture, and engineering goods, Trivoxa Group formed to carry that same manufacturing discipline into new categories — sourcing through vetted partners rather than manufacturing in-house, but holding every shipment to the standard our founding manufacturing partner built its name on."
        }
      />

      <section className="tvx-section tvx-section--tight">
        <div className="container">
          <blockquote className="tvx-pullquote">
            <p>
              We didn&rsquo;t set out to be a trading house. We set out to make sure a manufacturing
              promise made in Surat still holds by the time it reaches a warehouse in Rotterdam.
            </p>
            <cite>— Trivoxa Group</cite>
          </blockquote>
        </div>
      </section>

      <Section eyebrow="Company & Contact" title="Where to Find Us.">
        <div className="tvx-info-row">
          <div className="tvx-info-label">Registered Address</div>
          <p>Surat, Gujarat, India</p>
        </div>
        <div className="tvx-info-row">
          <div className="tvx-info-label">Email</div>
          <a href={mailto(CONTACT.general)}>{CONTACT.general}</a>
        </div>
      </Section>

      <CtaBand
        title="Have a Question About Our Group?"
        description="Reach out and our team will get back to you within one business day."
        actions={[{ label: "Contact Our Team", href: "/contact/" }, { label: "Explore the Group", href: "/group/", variant: "ghost" }]}
      />
    </TrivoxaShell>
  );
}
