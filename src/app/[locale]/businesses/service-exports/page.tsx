import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import TrivoxaShell from "@/components/trivoxa/TrivoxaShell";
import { PageHero, Section, CtaBand } from "@/components/trivoxa/ui";
import SplitScreenSticky from "@/components/patterns/SplitScreenSticky";
import ProcessLoader from "@/components/patterns/ProcessLoader";
import NumberedList from "@/components/patterns/NumberedList";
import { serviceCategories } from "@/lib/data/services";
import "@/app/styles/patterns.css";
import "@/app/styles/industries-page.css";
import "@/app/styles/service-exports-page.css";

export const metadata: Metadata = {
  title: "Service Exports | Trivoxa Group",
  description:
    "Trivoxa Group helps organizations grow through technology, software, AI, branding, digital marketing, and business support services.",
};

const BASE = "/businesses/service-exports";

export default async function ServiceExportsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("serviceExportsPage");

  const delivery = [
    { title: t("delivery.s1Title"), description: t("delivery.s1Desc") },
    { title: t("delivery.s2Title"), description: t("delivery.s2Desc") },
    { title: t("delivery.s3Title"), description: t("delivery.s3Desc") },
    { title: t("delivery.s4Title"), description: t("delivery.s4Desc") },
    { title: t("delivery.s5Title"), description: t("delivery.s5Desc") },
  ];

  const strengths = [
    { title: t("why.w1") },
    { title: t("why.w2") },
    { title: t("why.w3") },
    { title: t("why.w4") },
    { title: t("why.w5") },
    { title: t("why.w6") },
  ];

  return (
    <TrivoxaShell film="service-digital">
      {/* 1. HERO */}
      <PageHero
        crumb={[{ label: t("hero.crumbBusinesses"), href: "/businesses/" }, { label: t("hero.crumbSelf") }]}
        eyebrow={t("hero.eyebrow")}
        title={t("hero.title")}
        description={t("hero.description")}
        actions={[{ label: t("hero.ctaConsult"), modal: true }, { label: t("hero.ctaExplore"), href: "#services", variant: "ghost" }]}
      />

      {/* 2. ABOUT — split-screen sticky, talent-network positioning */}
      <div className="container">
        <SplitScreenSticky
          eyebrow={t("about.eyebrow")}
          title={t("about.title")}
          paragraphs={[t("about.p1"), t("about.p2"), t("about.p3")]}
        />
      </div>

      {/* 3. SERVICE CATEGORIES — manifest rows with sub-service preview */}
      <Section id="services" eyebrow={t("servicesSection.eyebrow")} title={t("servicesSection.title")}>
        <div className="industry-list">
          {serviceCategories.map((cat, i) => (
            <Link key={cat.slug} href={`${BASE}/${cat.slug}/`} className="industry-row">
              <span className="industry-row__index">{String(i + 1).padStart(2, "0")}</span>
              <span className="industry-row__name">{cat.name}</span>
              <span className="industry-row__desc service-row__preview">
                {cat.subServices.slice(0, 3).map((s) => s.name).join(" · ")}
              </span>
            </Link>
          ))}
        </div>
      </Section>

      {/* 4. DELIVERY PROCESS — step-by-step process loader */}
      <Section eyebrow={t("delivery.eyebrow")} title={t("delivery.title")}>
        <ProcessLoader steps={delivery} />
      </Section>

      {/* 5. WHY CHOOSE TRIVOXA — numbered list */}
      <Section eyebrow={t("why.eyebrow")} title={t("why.title")}>
        <NumberedList items={strengths} />
      </Section>

      {/* 6. CTA */}
      <CtaBand
        title={t("cta.title")}
        description={t("cta.description")}
        actions={[{ label: t("cta.ctaBook"), modal: true }, { label: t("cta.ctaProposal"), href: "/rfq/", variant: "ghost" }]}
      />

      <p className="digital-note">{t("digitalNote")}</p>
    </TrivoxaShell>
  );
}
