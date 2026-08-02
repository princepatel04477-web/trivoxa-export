import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import TrivoxaShell from "@/components/trivoxa/TrivoxaShell";
import { PageHero, CtaBand } from "@/components/trivoxa/ui";
import CertificationsStrip from "@/components/sections/CertificationsStrip";
import "@/app/styles/flagship-sections.css";

export const metadata: Metadata = {
  title: "Compliance | Trivoxa Group",
  description:
    "Trivoxa Group's certifications and standards — active operational licensing, and sector certifications currently in progress.",
};

export default async function CompliancePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("compliance");

  return (
    <TrivoxaShell film="footer-drift">
      <PageHero eyebrow={t("hero.eyebrow")} title={t("hero.title")} description={t("hero.description")} />
      <CertificationsStrip />
      <CtaBand
        title={t("cta.title")}
        description={t("cta.description")}
        actions={[{ label: t("cta.ctaAudit"), href: "/rfq/?path=audit" }, { label: t("cta.ctaContact"), href: "/contact/", variant: "ghost" }]}
      />
    </TrivoxaShell>
  );
}
