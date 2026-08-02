import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import TrivoxaShell from "@/components/trivoxa/TrivoxaShell";
import { PageHero, Section } from "@/components/trivoxa/ui";
import ContactForm from "@/components/ContactForm";
import { CONTACT, mailto } from "@/data/contact";
import "@/app/styles/industries-page.css";

export const metadata: Metadata = {
  title: "Contact | Trivoxa Group",
  description: "Start a conversation with Trivoxa Group — source products, expand into new markets, or become a partner.",
};

/** The six inquiry types, each routed to the channel that already handles
 * it — the RFQ flow for quotes, this page's form for conversations. */
const inquiryKeys = [
  { key: "productExport", href: "/rfq/" },
  { key: "serviceExport", href: "/businesses/service-exports/" },
  { key: "supplier", href: "#message" },
  { key: "partnership", href: "#message" },
  { key: "careers", href: "/careers/" },
  { key: "general", href: "#message" },
] as const;

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("contact");

  return (
    <TrivoxaShell film="contact">
      <PageHero
        eyebrow={t("hero.eyebrow")}
        title={t("hero.title")}
        description={t("hero.description")}
        actions={[{ label: t("hero.ctaContact"), href: "#message" }, { label: t("hero.ctaQuote"), href: "/rfq/", variant: "ghost" }]}
      />

      <Section eyebrow={t("help.eyebrow")} title={t("help.title")}>
        <div className="industry-list">
          {inquiryKeys.map((inquiry, i) => (
            <Link key={inquiry.key} href={inquiry.href} className="industry-row">
              <span className="industry-row__index">{String(i + 1).padStart(2, "0")}</span>
              <span className="industry-row__name">{t(`inquiries.${inquiry.key}.name`)}</span>
              <span className="industry-row__desc">{t(`inquiries.${inquiry.key}.description`)}</span>
            </Link>
          ))}
        </div>
      </Section>

      <Section tight id="message">
        <div className="tvx-split">
          <div className="tvx-contact-card">
            <h3 className="tvx-contact-heading">{t("formHeading")}</h3>
            <ContactForm />
          </div>
          <div>
            <div className="tvx-info-row">
              <div className="tvx-info-label">{t("info.emailLabel")}</div>
              <a href={mailto(CONTACT.general)}>{CONTACT.general}</a>
            </div>
            <div className="tvx-info-row">
              <div className="tvx-info-label">{t("info.businessLabel")}</div>
              <p>{t("info.businessValue")}</p>
            </div>
            <div className="tvx-info-row">
              <div className="tvx-info-label">{t("info.foundationLabel")}</div>
              <p>{t("info.foundationValue", { relationship: t("info.foundationRelationship") })}</p>
            </div>
            <div className="tvx-info-row">
              <div className="tvx-info-label">{t("info.followLabel")}</div>
              <p>{t("info.followValue")}</p>
            </div>
            <p className="contact-microcopy">{t("info.microcopy")}</p>
          </div>
        </div>
      </Section>
    </TrivoxaShell>
  );
}
