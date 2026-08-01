import type { Metadata } from "next";
import TrivoxaShell from "@/components/trivoxa/TrivoxaShell";
import { PageHero, CtaBand } from "@/components/trivoxa/ui";
import CertificationsStrip from "@/components/sections/CertificationsStrip";
import "@/app/styles/flagship-sections.css";

export const metadata: Metadata = {
  title: "Compliance | Trivoxa Group",
  description:
    "Trivoxa Group's certifications and standards — active operational licensing, and sector certifications currently in progress.",
};

export default function CompliancePage() {
  return (
    <TrivoxaShell film="footer-drift">
      <PageHero
        eyebrow="Compliance"
        title="Certifications & Standards."
        description="Operational licensing is active. Sector-specific certifications are being secured on a public timeline, listed here as they progress."
      />
      <CertificationsStrip />
      <CtaBand
        title="Want to Verify Before You Order?"
        description="Request a factory audit or site visit ahead of placing an order — a standard pre-order step we support directly."
        actions={[{ label: "Request a Factory Audit / Site Visit", href: "/rfq/?path=audit" }, { label: "Contact Our Team", href: "/contact/", variant: "ghost" }]}
      />
    </TrivoxaShell>
  );
}
