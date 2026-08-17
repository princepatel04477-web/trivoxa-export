"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/brand/Logo";
import { FOOTER_TONE } from "@/lib/logo";
import { regionsTagline } from "@/data/regions";
import { taxonomy } from "@/lib/data/taxonomy";

const DIGITAL_URL = "https://digital.trivoxagroup.com";
const LINKEDIN_URL = process.env.NEXT_PUBLIC_LINKEDIN_URL;

// Every taxonomy entry with a live catalog route (PTO-02), plus the
// catch-all link — previously a local literal list missing Furniture &
// Interiors and Jewellery & Precious Products.
const productColumnMeta = taxonomy.filter((t) => t.catalogHref).map((t) => ({ megaMenuKey: t.megaMenuKey, href: t.catalogHref! }));

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
  const t = useTranslations("footer");
  const tn = useTranslations("nav");
  const tm = useTranslations("megaMenu");

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
      setError(t("newsletter.errorGeneric"));
    }
  };

  const groupColumn = [
    { label: tm("story"), href: "/group/#our-story" },
    { label: tm("leadership"), href: "/group/#leadership" },
    { label: tm("foundation"), href: "/group/#foundation" },
    { label: tm("vision"), href: "/group/#vision" },
    { label: tm("commitments"), href: "/group/#commitments" },
    { label: t("links.compliance"), href: "/compliance/" },
    { label: tn("careers"), href: "/careers/" },
  ];

  const productColumn = [
    ...productColumnMeta.map((p) => ({ label: p.megaMenuKey ? tm(p.megaMenuKey) : "", href: p.href })),
    { label: t("columns.allProductExports"), href: "/businesses/product-exports/" },
  ];

  const serviceColumn = [
    { label: tm("technology"), href: "/businesses/service-exports/technology/" },
    { label: tm("ai"), href: "/businesses/service-exports/ai/" },
    { label: tm("software"), href: "/businesses/service-exports/software/" },
    { label: tm("designBranding"), href: "/businesses/service-exports/design/" },
    { label: tm("digitalMarketing"), href: "/businesses/service-exports/marketing/" },
    { label: tm("businessSupport"), href: "/businesses/service-exports/business-support/" },
  ];

  const exploreColumn = [
    { label: tn("industries"), href: "/industries/" },
    { label: tn("globalPresence"), href: "/global-presence/" },
    { label: tn("insights"), href: "/insights/" },
    { label: t("links.requestQuote"), href: "/rfq/" },
    { label: tn("contactUs"), href: "/contact/" },
  ];

  const legalLinks = [
    { label: t("legal.privacy"), href: "/privacy-policy/" },
    { label: t("legal.terms"), href: "/terms/" },
    { label: t("links.compliance"), href: "/compliance/" },
    { label: t("legal.antiCorruption"), href: "/anti-corruption-policy/" },
    { label: t("legal.cookiePreferences"), href: "/cookie-preferences/" },
  ];

  return (
    <section className="footer">
      <div className="container">
        {/* copy-scrim: the closing eagle sits directly behind this grid, and
            at 34,000 grains it is a dense near-white mass rather than the
            sparse mark it used to be. The field is held back by the `.footer`
            beat as well, but the two are doing different jobs — the beat sets
            how present the mark is across the whole viewport, the scrim buys
            contrast for the five link columns specifically. */}
        <div className="footer-content d-flex copy-scrim">
          {/* Brand column */}
          <div className="col footer-brand">
            <div className="logo">
              <Logo variant="full" slot="footer" tone={FOOTER_TONE} />
            </div>
            <p className="tagline">{t("tagline")}</p>

            <div className="footer-locations">
              <div className="footer-locations__hq">
                <span className="footer-locations__label">{t("headquartersLabel")}</span>
                <p>{t("headquartersValue")}</p>
              </div>
              <div className="footer-locations__global">
                <span className="footer-locations__label">{t("servingLabel")}</span>
                <p>{regionsTagline}</p>
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
          <FooterColumn title={t("columns.theGroup")} links={groupColumn} />
          <FooterColumn title={t("columns.productExports")} links={productColumn} />
          <FooterColumn title={t("columns.serviceExports")} links={serviceColumn} />
          <FooterColumn title={t("columns.explore")} links={exploreColumn} />

          {/* Newsletter column */}
          <div className="col footer-newsletter">
            <div className="title">{t("newsletter.title")}</div>
            <p className="footer-newsletter__copy">{t("newsletter.copy")}</p>
            {sent ? (
              <p className="footer-newsletter__thanks">{t("newsletter.thanks")}</p>
            ) : (
              <form className="footer-newsletter__form" onSubmit={handleSubscribe}>
                <input
                  type="email"
                  required
                  placeholder={t("newsletter.placeholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-label={t("newsletter.emailAriaLabel")}
                />
                <button type="submit" aria-label={t("newsletter.subscribeAriaLabel")}>
                  →
                </button>
              </form>
            )}
            {error && <p className="footer-newsletter__error" role="alert">{error}</p>}
            <p className="footer-response-note">{t("newsletter.responseNote")}</p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="footer-bottom">
          <span>{t("copyright")}</span>
          {legalLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
          <span className="footer-parent-credit">{t("parentCredit")}</span>
        </div>
      </div>
    </section>
  );
}
