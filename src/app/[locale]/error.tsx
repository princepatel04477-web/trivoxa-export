"use client";

import { useEffect } from "react";
import TrivoxaShell from "@/components/trivoxa/TrivoxaShell";
import { PageHero, Section } from "@/components/trivoxa/ui";
import { Link } from "@/i18n/navigation";
import "@/app/styles/patterns.css";

/**
 * Route-level error boundary.
 *
 * Without this, an exception thrown anywhere in a page's client tree — a WebGL
 * context failure, a bad data shape — white-screens the whole route. Here it
 * degrades to the site shell plus a retry, so the header, footer and every
 * navigation path stay live while the failed section is replaced.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Route error boundary caught:", error);
  }, [error]);

  return (
    <TrivoxaShell film="footer-drift">
      <PageHero
        eyebrow="Something Went Wrong"
        title="This Section Didn&rsquo;t Load."
        description="An unexpected error interrupted this page. Nothing you submitted has been lost. Try again, or use the links below to keep moving."
      />

      <Section eyebrow="Next Step" title="Try Again, or Carry On.">
        <div className="thank-you-links">
          <button type="button" className="tvx-btn tvx-btn--primary" onClick={reset}>
            Reload This Page &rarr;
          </button>
          <Link className="tvx-btn tvx-btn--ghost" href="/">
            Back to Home &rarr;
          </Link>
          <Link className="tvx-btn tvx-btn--ghost" href="/contact/">
            Contact Our Team &rarr;
          </Link>
        </div>
        {error.digest && (
          <p>
            Reference for our team: <code>{error.digest}</code>
          </p>
        )}
      </Section>
    </TrivoxaShell>
  );
}
