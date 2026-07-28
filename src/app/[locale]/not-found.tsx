import type { Metadata } from "next";
import TrivoxaShell from "@/components/trivoxa/TrivoxaShell";
import { PageHero, Section } from "@/components/trivoxa/ui";
import { Link } from "@/i18n/navigation";
import "@/app/styles/patterns.css";

export const metadata: Metadata = {
  title: "Page Not Found | Trivoxa Group",
  description: "The page you requested no longer exists. Browse our export divisions, industries, and global operations.",
  robots: { index: false, follow: true },
};

/**
 * On-brand 404.
 *
 * Rendered inside the full site shell — header, footer, contact modal — so a
 * buyer who mistypes a URL or follows a stale link lands somewhere navigable
 * rather than on a bare framework error page. The routes offered below are the
 * four a lost buyer actually wants, not a sitemap dump.
 */
export default function NotFound() {
  return (
    <TrivoxaShell film="footer-drift">
      <PageHero
        eyebrow="404"
        title="This Page Isn&rsquo;t Here."
        description="The address you followed doesn&rsquo;t match anything we publish — it may have moved, or the link may have been mistyped. Everything we export and every market we serve is one step away."
      />

      <Section eyebrow="Where To Next" title="Pick Up Where You Left Off.">
        <div className="thank-you-links">
          <Link className="tvx-btn tvx-btn--primary" href="/">
            Back to Home &rarr;
          </Link>
          <Link className="tvx-btn tvx-btn--ghost" href="/businesses/product-exports/">
            Explore Product Exports &rarr;
          </Link>
          <Link className="tvx-btn tvx-btn--ghost" href="/industries/">
            Browse Industries We Serve &rarr;
          </Link>
          <Link className="tvx-btn tvx-btn--ghost" href="/rfq/">
            Request a Quote &rarr;
          </Link>
        </div>
      </Section>
    </TrivoxaShell>
  );
}
