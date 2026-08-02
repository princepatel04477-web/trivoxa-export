import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import "@/app/styles/global-presence-page.css";
import "@/app/styles/signature-canvas.css";
import TrivoxaShell from "@/components/trivoxa/TrivoxaShell";
import { PageHero, Section, Checklist, CtaBand } from "@/components/trivoxa/ui";
import PresenceGlobe from "@/components/presence/PresenceGlobe";
import PresenceStats from "@/components/presence/PresenceStats";
import LazyCrane from "@/components/LazyCrane";
import { regions } from "@/data/regions";
import { taxonomy } from "@/lib/data/taxonomy";

export const metadata: Metadata = {
  title: "Global Presence | Trivoxa Group",
  description:
    "Trivoxa Group connects opportunities across borders through an expanding network of suppliers, partners, and clients.",
};

// Region list now reads from data/regions.ts (PTO-03) — the single source
// also used by the footer tagline. `slug` remains load-bearing: it drives
// the `#region-*` anchor each lane carries, which the particle field's
// regionCues hang off (see GLOBAL_PRESENCE in src/lib/choreography.ts).
// Region titles stay as the English proper noun sitewide; only the
// descriptive copy is translated (globalPresencePage.regionItems.<slug>).

// Export ports — Layer 2 (commerce/logistics data, honestly placed on the
// logistics page rather than the homepage). UN/LOCODEs are the standard
// public codes for these ports, not invented; the descriptors are public
// knowledge about each port's role in Indian trade.
const PORT_META = [
  { name: "Mundra", code: "INMUN", key: "mundra" },
  { name: "Kandla", code: "INKLA", key: "kandla" },
  { name: "Nhava Sheva (JNPT)", code: "INNSA", key: "nhavaSheva" },
] as const;

export default async function GlobalPresencePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("globalPresencePage");

  const exportPorts = PORT_META.map((p) => ({
    name: p.name,
    code: p.code,
    role: t(`ports.${p.key}Role`),
    detail: t(`ports.${p.key}Detail`),
  }));

  /** Honest presence numbers derived from what the site actually publishes —
   * computed from data modules (PTO-05), never typed as literals. */
  const presenceStats = [
    { value: regions.length, label: t("statsSection.regionsServed") },
    { value: taxonomy.length, label: t("statsSection.industriesCovered") },
    { value: exportPorts.length, label: t("statsSection.exportPorts") },
    { value: 24, suffix: "h", label: t("statsSection.responseWindow") },
  ];

  const ecosystem = [
    { title: t("ecosystem.items.e1Title"), desc: t("ecosystem.items.e1Desc") },
    { title: t("ecosystem.items.e2Title"), desc: t("ecosystem.items.e2Desc") },
    { title: t("ecosystem.items.e3Title"), desc: t("ecosystem.items.e3Desc") },
    { title: t("ecosystem.items.e4Title"), desc: t("ecosystem.items.e4Desc") },
    { title: t("ecosystem.items.e5Title"), desc: t("ecosystem.items.e5Desc") },
    { title: t("ecosystem.items.e6Title"), desc: t("ecosystem.items.e6Desc") },
  ];

  const operations = [
    t("tradeOps.items.o1"),
    t("tradeOps.items.o2"),
    t("tradeOps.items.o3"),
    t("tradeOps.items.o4"),
    t("tradeOps.items.o5"),
    t("tradeOps.items.o6"),
  ];

  const growth = [
    t("growing.items.g1"),
    t("growing.items.g2"),
    t("growing.items.g3"),
    t("growing.items.g4"),
    t("growing.items.g5"),
  ];

  const why = [
    { icon: "🌐", title: t("why.statements.w1Title"), description: t("why.statements.w1Desc") },
    { icon: "🏭", title: t("why.statements.w2Title"), description: t("why.statements.w2Desc") },
    { icon: "🤝", title: t("why.statements.w3Title"), description: t("why.statements.w3Desc") },
    { icon: "🧭", title: t("why.statements.w4Title"), description: t("why.statements.w4Desc") },
    { icon: "💬", title: t("why.statements.w5Title"), description: t("why.statements.w5Desc") },
    { icon: "♾", title: t("why.statements.w6Title"), description: t("why.statements.w6Desc") },
  ];

  return (
    <TrivoxaShell>
      {/* Signature animation: one persistent canvas behind every section. The
          particle globe holds its spherical form for the whole page — spinning,
          tilted and draggable — while the regions illuminate and the trade
          routes draw as arcs across it, before it converges on the eagle. */}
      <div className="gp-canvas" aria-hidden="true">
        <PresenceGlobe />
      </div>

      <PageHero
        eyebrow={t("hero.eyebrow")}
        title={t("hero.title")}
        description={t("hero.description")}
        actions={[{ label: t("hero.ctaConversation"), href: "/contact/" }, { label: t("hero.ctaQuote"), modal: true, variant: "ghost" }]}
      />

      <Section id="global-overview" eyebrow={t("overview.eyebrow")} title={t("overview.title")} lead={t("overview.lead")} />

      {/* Interactive Global Network — deliberately sparse and tall (see
          .presence-network in signature-canvas.css): the live particle globe
          behind it IS the content, and it needs the scroll distance to breathe.

          The copy here used to describe the globe unwrapping into a flat world
          map and told the reader to "keep scrolling to lay it flat". The flat
          map has been removed, so that instruction now describes something that
          never happens — it is replaced below with the affordance that is still
          real: the globe is draggable. */}
      <section className="tvx-section presence-network" id="global-network">
        <div className="container">
          <span className="tvx-eyebrow">{t("network.eyebrow")}</span>
          <h2>{t("network.heading")}</h2>
          <div className="tvx-lead">
            <p>{t("network.lead")}</p>
          </div>
        </div>
      </section>

      <Section id="regions" eyebrow={t("regionsSection.eyebrow")} title={t("regionsSection.title", { count: regions.length })} lead={t("regionsSection.lead")}>
        <div className="tvx-lanes">
          {regions.map((r) => (
            <div className="tvx-lane" key={r.title} id={`region-${r.slug}`}>
              <span className="tvx-lane__name">{r.title}</span>
              <span className="tvx-lane__desc">{t(`regionItems.${r.slug}`)}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Presence in numbers — animated counters (spec §3/§4) */}
      <Section eyebrow={t("statsSection.eyebrow")} title={t("statsSection.title")}>
        <PresenceStats stats={presenceStats} />
      </Section>

      <Section eyebrow={t("ports.eyebrow")} title={t("ports.title")} lead={t("ports.lead")}>
        <div className="presence-crane" aria-hidden="true">
          <LazyCrane variant="subtle" />
        </div>
        <div className="presence-ports presence-ports--cards">
          {exportPorts.map((p) => (
            <div className="presence-port presence-port--card" key={p.code}>
              <div className="presence-port__head">
                <span className="presence-port__name">{p.name}</span>
                <span className="presence-port__code">{p.code}</span>
              </div>
              <span className="presence-port__role">{p.role}</span>
              <p className="presence-port__detail">{p.detail}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section eyebrow={t("ecosystem.eyebrow")} title={t("ecosystem.title")} lead={t("ecosystem.lead")}>
        <div className="tvx-strip">
          {ecosystem.flatMap((e, i) => {
            const nodes = [
              <div className="tvx-strip__item" key={`item-${e.title}`}>
                <span className="tvx-strip__label">{e.title}</span>
                <p className="tvx-strip__desc">{e.desc}</p>
              </div>,
            ];
            if (i < ecosystem.length - 1) {
              nodes.push(
                <span className="tvx-strip__sep" aria-hidden="true" key={`sep-${e.title}`}>
                  &middot;
                </span>
              );
            }
            return nodes;
          })}
        </div>
      </Section>

      <Section id="trade-operations" eyebrow={t("tradeOps.eyebrow")} title={t("tradeOps.title")} lead={t("tradeOps.lead")}>
        <Checklist items={operations} />
      </Section>

      <Section id="growing" eyebrow={t("growing.eyebrow")} title={t("growing.title")} lead={t("growing.lead")}>
        <Checklist items={growth} />
      </Section>

      <Section eyebrow={t("why.eyebrow")} title={t("why.title")}>
        <div className="tvx-statements">
          {why.map((w) => (
            <div className="tvx-statement" key={w.title}>
              <span className="tvx-statement__rule" aria-hidden="true" />
              <h3 className="tvx-statement__title">{w.title}</h3>
              <p className="tvx-statement__desc">{w.description}</p>
            </div>
          ))}
        </div>
      </Section>

      <CtaBand
        title={t("cta.title")}
        description={t("cta.description")}
        actions={[{ label: t("cta.ctaConversation"), href: "/contact/" }, { label: t("cta.ctaQuote"), modal: true, variant: "ghost" }]}
      />
    </TrivoxaShell>
  );
}
