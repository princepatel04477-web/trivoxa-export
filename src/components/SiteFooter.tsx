"use client";

import { useState, type FormEvent } from "react";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/brand/Logo";
import { FOOTER_TONE } from "@/lib/logo";

const DIGITAL_URL = "https://digital.trivoxagroup.com";
const LINKEDIN_URL = process.env.NEXT_PUBLIC_LINKEDIN_URL;

/** Rich footer (spec §1 + §3): full nav mirror — the long industry and
 * service lists live HERE, not in the top nav — plus newsletter, locations,
 * legal, and the parent-company credit. */
const groupColumn = [
  { label: "Our Story", href: "/group/#our-story" },
  { label: "Leadership", href: "/group/#leadership" },
  { label: "Shiveshwar Foundation", href: "/group/#foundation" },
  { label: "Vision", href: "/group/#vision" },
  { label: "Commitments", href: "/group/#commitments" },
  { label: "Compliance", href: "/compliance/" },
  { label: "Careers", href: "/careers/" },
];

const productColumn = [
  { label: "Textile & Apparel", href: "/businesses/product-exports/textile-apparel/" },
  { label: "Healthcare & Pharmaceuticals", href: "/businesses/product-exports/healthcare-pharmaceuticals/" },
  { label: "Building Materials", href: "/businesses/product-exports/building-materials/" },
  { label: "Agriculture & Food", href: "/businesses/product-exports/agriculture-food/" },
  { label: "Engineering & Industrial", href: "/businesses/product-exports/engineering-industrial/" },
  { label: "All Product Exports", href: "/businesses/product-exports/" },
];

const serviceColumn = [
  { label: "Technology", href: "/businesses/service-exports/technology/" },
  { label: "AI", href: "/businesses/service-exports/ai/" },
  { label: "Software", href: "/businesses/service-exports/software/" },
  { label: "Design & Branding", href: "/businesses/service-exports/design/" },
  { label: "Digital Marketing", href: "/businesses/service-exports/marketing/" },
  { label: "Business Support", href: "/businesses/service-exports/business-support/" },
];

const exploreColumn = [
  { label: "Industries", href: "/industries/" },
  { label: "Global Presence", href: "/global-presence/" },
  { label: "Insights", href: "/insights/" },
  { label: "Request a Quote", href: "/rfq/" },
  { label: "Contact", href: "/contact/" },
];

const legalLinks = [
  { label: "Privacy", href: "/privacy-policy/" },
  { label: "Terms", href: "/terms/" },
  { label: "Compliance", href: "/compliance/" },
  { label: "Anti-corruption Policy", href: "/anti-corruption-policy/" },
  { label: "Cookie Preferences", href: "/cookie-preferences/" },
];

function FooterColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div className="col">
      <div className="title">{title}</div>
      <ul>
        {links.map((link) => (
          <li key={link.label}>
            <Link href={link.href}>{link.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function SiteFooter() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setError(null);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error();
      setSent(true);
    } catch {
      setError("Could not subscribe right now — please try again.");
    }
  };

  return (
    <section className="footer">
      <div className="container">
        <div className="footer-content d-flex">
          {/* Brand column */}
          <div className="col footer-brand">
            <div className="logo">
              <Logo variant="full" slot="footer" tone={FOOTER_TONE} />
            </div>
            <p className="tagline">Building the Future of Global Commerce — One Partnership at a Time.</p>

            <div className="footer-locations">
              <div className="footer-locations__hq">
                <span className="footer-locations__label">Headquarters</span>
                <p>Surat, Gujarat, India</p>
              </div>
              <div className="footer-locations__global">
                <span className="footer-locations__label">Serving buyers across</span>
                <p>Middle East · Europe · Africa · North America · Southeast Asia</p>
              </div>
            </div>

            <div className="footer-social">
              {LINKEDIN_URL && (
                <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" aria-label="Trivoxa Group on LinkedIn">
                  <img src="/images/icons/linkedin.svg" alt="" width={20} height={20} />
                  <span>LinkedIn</span>
                </a>
              )}
              <a href={DIGITAL_URL} target="_blank" rel="noopener noreferrer" className="footer-social__digital">
                digital.trivoxagroup.com ↗
              </a>
            </div>
          </div>

          {/* Nav mirror */}
          <FooterColumn title="The Group" links={groupColumn} />
          <FooterColumn title="Product Exports" links={productColumn} />
          <FooterColumn title="Service Exports" links={serviceColumn} />
          <FooterColumn title="Explore" links={exploreColumn} />

          {/* Newsletter column */}
          <div className="col footer-newsletter">
            <div className="title">Stay Informed</div>
            <p className="footer-newsletter__copy">Quarterly dispatch on global trade and business insights.</p>
            {sent ? (
              <p className="footer-newsletter__thanks">Thanks — you&rsquo;re on the list.</p>
            ) : (
              <form className="footer-newsletter__form" onSubmit={handleSubscribe}>
                <input
                  type="email"
                  required
                  placeholder="Your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-label="Email address"
                />
                <button type="submit" aria-label="Subscribe">
                  →
                </button>
              </form>
            )}
            {error && <p className="footer-newsletter__error" role="alert">{error}</p>}
            <p className="footer-response-note">Responds within 24 business hours (IST)</p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="footer-bottom">
          <span>&copy; Trivoxa Group 2026</span>
          {legalLinks.map((link) => (
            <Link key={link.label} href={link.href}>
              {link.label}
            </Link>
          ))}
          <span className="footer-parent-credit">
            A venture built on the manufacturing heritage of Shiveshwar Textiles
          </span>
        </div>
      </div>
    </section>
  );
}
