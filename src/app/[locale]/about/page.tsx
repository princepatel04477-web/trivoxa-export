import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import TrivoxaShell from "@/components/trivoxa/TrivoxaShell";
import { PageHero, Section, CtaBand } from "@/components/trivoxa/ui";
import { CONTACT, mailto } from "@/data/contact";

export const metadata: Metadata = {
  title: "About | Trivoxa Group",
  description:
    "Trivoxa Group's origin story — built from a woven-textile manufacturing floor in Surat, Gujarat, into an international trade and export group.",
};

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("about");

  return (
    <TrivoxaShell film="about">
      <PageHero eyebrow={t("hero.eyebrow")} title={t("hero.title")} description={t("hero.description")} />

      <Section eyebrow={t("origin.eyebrow")} title={t("origin.title")} lead={t("origin.lead")} />

      <section className="tvx-section tvx-section--tight">
        <div className="container">
          <blockquote className="tvx-pullquote">
            <p>{t("quote.text")}</p>
            <cite>{t("quote.cite")}</cite>
          </blockquote>
        </div>
      </section>

      <Section eyebrow={t("info.eyebrow")} title={t("info.title")}>
        <div className="tvx-info-row">
          <div className="tvx-info-label">{t("info.addressLabel")}</div>
          <p>{t("info.address")}</p>
        </div>
        <div className="tvx-info-row">
          <div className="tvx-info-label">{t("info.emailLabel")}</div>
          <a href={mailto(CONTACT.general)}>{CONTACT.general}</a>
        </div>
      </Section>

      <CtaBand
        title={t("cta.title")}
        description={t("cta.description")}
        actions={[{ label: t("cta.ctaContact"), href: "/contact/" }, { label: t("cta.ctaGroup"), href: "/group/", variant: "ghost" }]}
      />
    </TrivoxaShell>
  );
}
