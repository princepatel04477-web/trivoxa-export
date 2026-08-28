import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import TrivoxaShell from "@/components/trivoxa/TrivoxaShell";
import { PageHero, Section, CtaBand } from "@/components/trivoxa/ui";
import NumberedList from "@/components/patterns/NumberedList";
import DeliveryModelDiagram from "@/components/services/DeliveryModelDiagram";
import { serviceCategories, getServiceCategory, getRelatedServices } from "@/lib/data/services";
import "@/app/styles/patterns.css";
import "@/app/styles/industries-page.css";
import "@/app/styles/service-exports-page.css";

const BASE = "/businesses/service-exports";

export function generateStaticParams() {
  return serviceCategories.map((c) => ({ category: c.slug }));
}

export async function generateMetadata(props: PageProps<"/[locale]/businesses/service-exports/[category]">): Promise<Metadata> {
  const { category } = await props.params;
  const cat = getServiceCategory(category);
  if (!cat) return {};
  return {
    title: `${cat.name} | Trivoxa Group`,
    description: cat.description,
  };
}

const strengths = [
  { title: "India Talent Network" },
  { title: "Quality Coordination" },
  { title: "Transparent Communication" },
  { title: "Long-Term Partnership" },
];

export default async function ServiceCategoryPage(props: PageProps<"/[locale]/businesses/service-exports/[category]">) {
  const { category } = await props.params;
  const cat = getServiceCategory(category);
  if (!cat) notFound();

  const related = getRelatedServices(cat.slug);

  return (
    <TrivoxaShell film={category}>
      {/* 1. HERO */}
      <PageHero
        crumb={[
          { label: "Businesses", href: "/businesses/" },
          { label: "Service Exports", href: `${BASE}/` },
          { label: cat.name },
        ]}
        eyebrow="Service Exports"
        title={`${cat.name}.`}
        description={cat.description}
        actions={[{ label: "Book a Call", modal: true }, { label: "All Services", href: `${BASE}/`, variant: "ghost" }]}
      />

      {/* 2-3. SUB-SERVICES — vertical manifest with capability chips */}
      <Section eyebrow="What We Deliver" title="Capabilities in This Category.">
        <div className="subservice-list">
          {cat.subServices.map((sub, i) => (
            <div key={sub.name} className="subservice-row">
              <span className="subservice-row__index">{String(i + 1).padStart(2, "0")}</span>
              <div className="subservice-row__body">
                <h3 className="subservice-row__name">{sub.name}</h3>
                <div className="subservice-row__chips">
                  {sub.items.map((item, j) => (
                    <span key={item} className="subservice-row__chip">
                      {j > 0 && <span className="subservice-row__sep">·</span>}
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* 4. HOW WE DELIVER — engagement model diagram */}
      <Section eyebrow="How We Deliver" title="The Engagement Model.">
        <DeliveryModelDiagram model={cat.deliveryModel} />
      </Section>

      {/* 5. WHY THIS SERVICE AT TRIVOXA */}
      <Section eyebrow="Why Trivoxa" title={`Why ${cat.name} at Trivoxa.`}>
        <NumberedList items={strengths} />
      </Section>

      {/* 6. RELATED SERVICES */}
      <Section eyebrow="Related Services" title="Explore Other Services.">
        <div className="industry-list">
          {related.map((r, i) => (
            <Link key={r.slug} href={`${BASE}/${r.slug}/`} className="industry-row">
              <span className="industry-row__index">{String(i + 1).padStart(2, "0")}</span>
              <span className="industry-row__name">{r.name}</span>
              <span className="industry-row__desc service-row__preview">
                {r.subServices.slice(0, 3).map((s) => s.name).join(" · ")}
              </span>
            </Link>
          ))}
        </div>
      </Section>

      {/* 7. CTA */}
      <CtaBand
        title="Start Your Project."
        description="Tell us what you're building, and we'll assemble the right team to deliver it."
        actions={[{ label: "Book a Consultation", modal: true }, { label: "Request Proposal", href: "/rfq/", variant: "ghost" }]}
      />

      <p className="digital-note">
        Trivoxa Digital — a dedicated tech services arm of Trivoxa Group. Visit digital.trivoxagroup.com
      </p>
    </TrivoxaShell>
  );
}
