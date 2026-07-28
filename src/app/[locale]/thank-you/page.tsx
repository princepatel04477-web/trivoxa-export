import type { Metadata } from "next";
import TrivoxaShell from "@/components/trivoxa/TrivoxaShell";
import { PageHero, Section } from "@/components/trivoxa/ui";
import { Link } from "@/i18n/navigation";
import "@/app/styles/patterns.css";

export const metadata: Metadata = {
  title: "Thank You | Trivoxa Group",
  description: "Your message has been received — an export specialist will respond within one business day.",
  robots: { index: false, follow: true },
};

export default function ThankYouPage() {
  return (
    <TrivoxaShell film="footer-drift">
      <PageHero
        eyebrow="Message Received"
        title="Thank You for Reaching Out."
        description="An export specialist will respond within one business day. In the meantime, explore what we source and where we operate."
      />

      <Section eyebrow="What Happens Next" title="Here's What to Expect.">
        <ol className="thank-you-steps">
          <li>Our team reviews your message and routes it to the right specialist.</li>
          <li>You&rsquo;ll hear back by email within one business day.</li>
          <li>If your inquiry involves sourcing, we&rsquo;ll follow up with next steps to formalize an RFQ.</li>
        </ol>
      </Section>

      <Section eyebrow="While You Wait" title="Explore Trivoxa Group.">
        <div className="thank-you-links">
          <Link className="tvx-btn tvx-btn--primary" href="/businesses/product-exports/">
            Explore Product Exports →
          </Link>
          <Link className="tvx-btn tvx-btn--ghost" href="/industries/">
            Browse Industries We Serve →
          </Link>
          <Link className="tvx-btn tvx-btn--ghost" href="/">
            Back to Home →
          </Link>
        </div>
      </Section>
    </TrivoxaShell>
  );
}
