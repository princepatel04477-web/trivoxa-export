import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import TrivoxaShell from "@/components/trivoxa/TrivoxaShell";
import { PageHero, Section, Steps } from "@/components/trivoxa/ui";
import RfqForm from "@/components/rfq/RfqForm";
import { Link } from "@/i18n/navigation";
import "@/app/styles/rfq-page.css";

export const metadata: Metadata = {
  title: "Request a Quote | Trivoxa Group",
  description:
    "Submit an export RFQ — product category, quantity, incoterms, and delivery window — and hear back within 24 business hours.",
};

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
const LINKEDIN_URL = process.env.NEXT_PUBLIC_LINKEDIN_URL;
const CALENDAR_URL = process.env.NEXT_PUBLIC_CALENDAR_URL;

export default async function RfqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("rfqPage");

  const nextSteps = [
    { title: t("nextSteps.s1Title"), desc: t("nextSteps.s1Desc") },
    { title: t("nextSteps.s2Title"), desc: t("nextSteps.s2Desc") },
    { title: t("nextSteps.s3Title"), desc: t("nextSteps.s3Desc") },
  ];

  return (
    <TrivoxaShell film="contact">
      <PageHero eyebrow={t("hero.eyebrow")} title={t("hero.title")} description={t("hero.description")} />

      <section className="tvx-section tvx-section--tight">
        <div className="container">
          <Suspense fallback={null}>
            <RfqForm />
          </Suspense>

          {/* Quick channels — WhatsApp/LinkedIn/calendar are configured via env
              and hidden when absent; the Contact link is always shown so a
              visitor with a general (non-sourcing) question always has
              somewhere else to go (HEP-03 cross-link). */}
          <div className="rfq-quicklinks" aria-label="Other ways to reach us">
            <span className="rfq-quicklinks__label">{t("quickLinks.label")}</span>
            <Link href="/contact/" data-analytics="rfq-contact-crosslink">
              {t("quickLinks.contact")}
            </Link>
            {WHATSAPP_NUMBER && (
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi Trivoxa, I'd like a quote")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-analytics="rfq-whatsapp"
                >
                  {t("quickLinks.whatsapp")}
                </a>
              )}
              {LINKEDIN_URL && (
                <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" data-analytics="rfq-linkedin">
                  {t("quickLinks.linkedin")}
                </a>
              )}
              {CALENDAR_URL && (
                <a href={CALENDAR_URL} target="_blank" rel="noopener noreferrer" data-analytics="rfq-calendar">
                  {t("quickLinks.calendar")}
                </a>
              )}
          </div>
        </div>
      </section>

      {/* What happens next */}
      <Section eyebrow={t("nextSteps.eyebrow")} title={t("nextSteps.title")}>
        <Steps items={nextSteps} row />
      </Section>

      {/* Where we are */}
      <Section eyebrow={t("whereWeAre.eyebrow")} title={t("whereWeAre.title")}>
        <div className="rfq-map">
          {/* Presentational frame only — it carries the radius, hairline, ring
              and shadow so the embed reads as a deliberate panel rather than a
              raw iframe. The iframe inside is untouched: same src, same
              controls, same click and navigation behaviour. Nothing is layered
              over it, so Google's own UI stays fully interactive. */}
          <div className="rfq-map__frame">
            <iframe
              title="Trivoxa Group — Surat, Gujarat, India"
              src="https://www.google.com/maps?q=Surat,+Gujarat,+India&output=embed"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
          <p className="rfq-map__note">{t("whereWeAre.note")}</p>
        </div>
      </Section>
    </TrivoxaShell>
  );
}
