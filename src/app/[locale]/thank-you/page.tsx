import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import TrivoxaShell from "@/components/trivoxa/TrivoxaShell";
import { PageHero, Section } from "@/components/trivoxa/ui";
import { Link } from "@/i18n/navigation";
import "@/app/styles/patterns.css";

export const metadata: Metadata = {
  title: "Thank You | Trivoxa Group",
  description: "Your message has been received — an export specialist will respond within one business day.",
  robots: { index: false, follow: true },
};

export default async function ThankYouPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("thankYou");

  return (
    <TrivoxaShell film="footer-drift">
      <PageHero eyebrow={t("hero.eyebrow")} title={t("hero.title")} description={t("hero.description")} />

      <Section eyebrow={t("whatNext.eyebrow")} title={t("whatNext.title")}>
        <ol className="thank-you-steps">
          <li>{t("whatNext.s1")}</li>
          <li>{t("whatNext.s2")}</li>
          <li>{t("whatNext.s3")}</li>
        </ol>
      </Section>

      <Section eyebrow={t("whileWait.eyebrow")} title={t("whileWait.title")}>
        <div className="thank-you-links">
          <Link className="tvx-btn tvx-btn--primary" href="/businesses/product-exports/">
            {t("whileWait.linkProduct")}
          </Link>
          <Link className="tvx-btn tvx-btn--ghost" href="/industries/">
            {t("whileWait.linkIndustries")}
          </Link>
          <Link className="tvx-btn tvx-btn--ghost" href="/">
            {t("whileWait.linkHome")}
          </Link>
        </div>
      </Section>
    </TrivoxaShell>
  );
}
