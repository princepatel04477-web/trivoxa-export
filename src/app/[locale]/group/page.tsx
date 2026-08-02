import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import TrivoxaShell from "@/components/trivoxa/TrivoxaShell";
import { Eyebrow, Section, CtaBand } from "@/components/trivoxa/ui";
import SplitScreenSticky from "@/components/patterns/SplitScreenSticky";
import EditorialPanel from "@/components/patterns/EditorialPanel";
import NumberedList from "@/components/patterns/NumberedList";
import SectionGrain from "@/components/patterns/SectionGrain";
import HorizontalTimeline from "@/components/patterns/HorizontalTimeline";
import LeadershipPanel from "@/components/leadership/LeadershipPanel";
import EcosystemDiagram from "@/components/ecosystem/EcosystemDiagram";
import GroupLattice from "@/components/group/GroupLattice";
import { SHIVESHWAR_NAME } from "@/lib/corporate";
import "@/app/styles/patterns.css";
import "@/app/styles/group-page.css";
import "@/app/styles/signature-canvas.css";

export const metadata: Metadata = {
  title: "Group | Trivoxa Group",
  description:
    "Trivoxa Group is an international business group committed to connecting global businesses with trusted products, strategic sourcing solutions, and professional services.",
};

export default async function GroupPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("group");
  const tc = await getTranslations("contact.info");

  const relationship = tc("foundationRelationship");

  const principles = [
    { title: t("philosophy.p1Title"), description: t("philosophy.p1Desc") },
    { title: t("philosophy.p2Title"), description: t("philosophy.p2Desc") },
    { title: t("philosophy.p3Title"), description: t("philosophy.p3Desc") },
    { title: t("philosophy.p4Title"), description: t("philosophy.p4Desc") },
    { title: t("philosophy.p5Title"), description: t("philosophy.p5Desc") },
    { title: t("philosophy.p6Title"), description: t("philosophy.p6Desc") },
  ];

  const ecosystem = [
    { title: t("ecosystem.e1Title"), description: t("ecosystem.e1Desc") },
    { title: t("ecosystem.e2Title"), description: t("ecosystem.e2Desc") },
    { title: t("ecosystem.e3Title"), description: t("ecosystem.e3Desc") },
    { title: t("ecosystem.e4Title"), description: t("ecosystem.e4Desc") },
    { title: t("ecosystem.e5Title"), description: t("ecosystem.e5Desc") },
    { title: t("ecosystem.e6Title"), description: t("ecosystem.e6Desc") },
  ];

  const foundationPhotos = [
    { src: "/images/foundation/exterior.jpg", caption: t("foundation.photo1Caption") },
    { src: "/images/foundation/weaving.jpg", caption: t("foundation.photo2Caption") },
    { src: "/images/foundation/inspection.jpg", caption: t("foundation.photo3Caption") },
  ];

  /** Founders wall. Drop real portraits at /images/leadership/{parth,dhruv,tirth}.jpg
   * and set `photoSrc` on each entry — the panel renders an honest "profile in
   * progress" placeholder until then. Messages are the three paragraphs of the
   * leadership statement from the master content doc, one per founder. */
  const founders = [
    { name: "Parth Mangukiya", role: t("leadership.f1Role"), email: "parth@trivoxagroup.com", align: "left" as const, message: t("leadership.f1Message") },
    { name: "Dhruv Patel", role: t("leadership.f2Role"), email: "dhruv@trivoxagroup.com", align: "right" as const, message: t("leadership.f2Message") },
    { name: "Tirth Kalathiya", role: t("leadership.f3Role"), email: "tirth@trivoxagroup.com", align: "left" as const, message: t("leadership.f3Message") },
  ];

  /** The journey as stages, not invented dates — the master content doc
   * records the sequence of the group's growth, not a year-by-year ledger,
   * and we don't fabricate one. */
  const journey = [
    { title: t("journey.s1Title"), description: t("journey.s1Desc") },
    { title: t("journey.s2Title"), description: t("journey.s2Desc") },
    { title: t("journey.s3Title"), description: t("journey.s3Desc") },
    { title: t("journey.s4Title"), description: t("journey.s4Desc") },
    { title: t("journey.s5Title"), description: t("journey.s5Desc") },
  ];

  const commitments = [
    { name: t("commitments.c1Name"), description: t("commitments.c1Desc") },
    { name: t("commitments.c2Name"), description: t("commitments.c2Desc") },
    { name: t("commitments.c3Name"), description: t("commitments.c3Desc") },
    { name: t("commitments.c4Name"), description: t("commitments.c4Desc") },
    { name: t("commitments.c5Name"), description: t("commitments.c5Desc") },
    { name: t("commitments.c6Name"), description: t("commitments.c6Desc") },
    { name: t("commitments.c7Name"), description: t("commitments.c7Desc") },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Trivoxa Group",
    description:
      "Trivoxa Group is an international business group committed to connecting global businesses with trusted products, strategic sourcing solutions, and professional services.",
    // Shiveshwar Textiles is an independent strategic manufacturing partner,
    // not a parent/subsidiary — schema.org has no clean property for an
    // arms-length partnership like this, so it is intentionally left out of
    // structured data rather than misrepresented via parentOrganization.
    founder: founders.map((f) => ({
      "@type": "Person",
      name: f.name,
      jobTitle: f.role,
      email: f.email,
    })),
  };

  return (
    <TrivoxaShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Signature animation: one persistent canvas behind every section, its hex
          lattice subdividing as the reader descends. Replaces the GLSL shader
          background this page used to carry — one WebGL context per page. */}
      <div className="gp-canvas" aria-hidden="true">
        <GroupLattice />
      </div>

      {/* 1. HERO */}
      <section className="group-hero">
        <SectionGrain className="hero-grain" />
        <div className="container group-hero__inner">
          <Eyebrow>{t("hero.eyebrow")}</Eyebrow>
          <h1 className="group-hero__title">{t("hero.title")}</h1>
          <p className="group-hero__desc">{t("hero.description")}</p>
          <Link href="#our-story" className="tvx-btn tvx-btn--primary group-hero__scroll">
            <span>{t("hero.ctaStory")}</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 2.5v11M3 9l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </section>

      {/* 2. WHO WE ARE */}
      <div className="container">
        <SplitScreenSticky
          eyebrow={t("whoWeAre.eyebrow")}
          title={t("whoWeAre.title")}
          paragraphs={[
            t("whoWeAre.p1"),
            t("whoWeAre.p2", { relationship, name: SHIVESHWAR_NAME }),
            t("whoWeAre.p3"),
          ]}
        />
      </div>

      {/* 3. OUR FOUNDATION */}
      <section className="tvx-section foundation-section" id="foundation">
        <div className="container">
          <Eyebrow>{t("foundation.eyebrow")}</Eyebrow>
          <h2>{t("foundation.title")}</h2>
          <div className="foundation-split">
            <div className="foundation-split__copy">
              <p>{t("foundation.p1")}</p>
              <p>{t("foundation.p2")}</p>
              <p>{t("foundation.p3")}</p>
              <p>{t("foundation.p4")}</p>
            </div>
            <div className="foundation-split__photos">
              {foundationPhotos.map((photo) => (
                <figure key={photo.src} className="foundation-photo">
                  <div className="foundation-photo__frame">
                    {/* .foundation-photo__frame already holds a 4/3 box, so
                        fill reserves the layout with no shift on load. */}
                    <Image
                      src={photo.src}
                      alt={`Shiveshwar Textiles — ${photo.caption}`}
                      fill
                      sizes="(max-width: 700px) 100vw, 33vw"
                    />
                  </div>
                  <figcaption className="foundation-photo__caption">Shiveshwar Textiles — {photo.caption}</figcaption>
                </figure>
              ))}
            </div>
          </div>
          <Link href="/rfq/?path=audit" className="tvx-btn tvx-btn--ghost foundation-section__audit-cta">
            {t("foundation.auditCta")}
          </Link>
        </div>
      </section>

      {/* 4. OUR STORY */}
      <EditorialPanel
        id="our-story"
        eyebrow={t("ourStory.eyebrow")}
        title={t("ourStory.title")}
        paragraphs={[t("ourStory.p1"), t("ourStory.p2"), t("ourStory.p3")]}
      />

      {/* 4b. THE JOURNEY — visual timeline (spec §4, The Group) */}
      <Section eyebrow={t("journey.eyebrow")} title={t("journey.title")}>
        <HorizontalTimeline steps={journey} />
      </Section>

      {/* 5. OUR VISION */}
      <section className="group-vision" id="vision">
        <SectionGrain className="group-vision__grain" />
        <div className="container group-vision__inner">
          <Eyebrow>{t("vision.eyebrow")}</Eyebrow>
          <h2 className="sr-only">{t("vision.eyebrow")}</h2>
          <p className="group-vision__statement">{t("vision.statement")}</p>
          <p className="group-vision__support">{t("vision.support")}</p>
        </div>
      </section>

      {/* 6. THE TRIVOXA WAY */}
      <Section id="trivoxa-way" eyebrow={t("philosophy.eyebrow")} title={t("philosophy.title")} lead={t("philosophy.lead")}>
        <NumberedList items={principles} />
      </Section>

      {/* 7. LEADERSHIP — founders wall */}
      <div id="leadership">
        {founders.map((f, i) => (
          <LeadershipPanel
            key={f.name}
            eyebrow={i === 0 ? t("leadership.eyebrow") : undefined}
            name={f.name}
            role={f.role}
            email={f.email}
            align={f.align}
            message={f.message}
          />
        ))}
      </div>

      {/* 8. BUSINESS ECOSYSTEM */}
      <Section id="ecosystem" eyebrow={t("ecosystem.eyebrow")} title={t("ecosystem.title")} lead={t("ecosystem.lead")}>
        <EcosystemDiagram centerLabel="Trivoxa Group" nodes={ecosystem.map((item) => ({ label: item.title }))} />
      </Section>

      {/* 9. STRATEGIC PARTNERS */}
      <section className="tvx-section partners-section">
        <div className="container">
          <Eyebrow>{t("partners.eyebrow")}</Eyebrow>
          <h2>{t("partners.title")}</h2>
          <div className="tvx-lead">
            <p>{t("partners.lead")}</p>
          </div>
          <div className="partners-grid">
            <div className="partners-grid__founding">
              <figure className="foundation-photo__frame" />
              <h3>{t("partners.foundingTitle", { name: SHIVESHWAR_NAME })}</h3>
              <p>{t("partners.p1", { relationship, name: SHIVESHWAR_NAME })}</p>
              <p>{t("partners.p2", { name: SHIVESHWAR_NAME })}</p>
            </div>
            <p className="partners-grid__growth-note">{t("partners.growthNote")}</p>
          </div>
        </div>
      </section>

      {/* 10. OUR COMMITMENTS */}
      <Section id="commitments" eyebrow={t("commitments.eyebrow")} title={t("commitments.title")} lead={t("commitments.lead")}>
        <table className="commitments-table">
          <thead>
            <tr>
              <th className="commitments-table__num" scope="col">{t("commitments.tableNum")}</th>
              <th scope="col">{t("commitments.tableCommitment")}</th>
              <th scope="col">{t("commitments.tableDescription")}</th>
            </tr>
          </thead>
          <tbody>
            {commitments.map((item, i) => (
              <tr key={item.name}>
                <td className="commitments-table__num" data-label="#">{String(i + 1).padStart(2, "0")}</td>
                <td className="commitments-table__name" data-label="Commitment">{item.name}</td>
                <td className="commitments-table__desc" data-label="Brief Description">{item.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* 11. LOOKING AHEAD */}
      <EditorialPanel
        id="looking-ahead"
        eyebrow={t("lookingAhead.eyebrow")}
        title={t("lookingAhead.title")}
        paragraphs={[t("lookingAhead.p1"), t("lookingAhead.p2"), t("lookingAhead.p3")]}
      />

      {/* 12. CTA */}
      <div className="group-cta-wrap">
        <SectionGrain className="group-cta-wrap__grain" />
        <CtaBand
          title={t("cta.title")}
          description={t("cta.description")}
          actions={[{ label: t("cta.ctaPartner"), modal: true }, { label: t("cta.ctaContact"), href: "/contact/", variant: "ghost" }]}
        />
      </div>
    </TrivoxaShell>
  );
}
