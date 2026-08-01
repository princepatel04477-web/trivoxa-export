import type { Metadata } from "next";
import { Suspense } from "react";
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

const nextSteps = [
  { title: "Review", desc: "Our sourcing team reviews your requirement against current factory capacity — within 24 business hours (IST)." },
  { title: "Quote", desc: "You receive a formal quotation with pricing, lead time, and payment terms." },
  { title: "Confirm", desc: "Once confirmed, we issue a proforma invoice and begin production scheduling." },
];

export default function RfqPage() {
  return (
    <TrivoxaShell film="contact">
      <PageHero
        eyebrow="Request For Quote"
        title="Send Us Your RFQ"
        description="Pick your path — product sourcing, services, or partnership. Real HS codes, real lead times. Our team responds within 24 business hours (IST)."
      />

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
            <span className="rfq-quicklinks__label">General question?</span>
            <Link href="/contact/" data-analytics="rfq-contact-crosslink">
              Contact us →
            </Link>
            {WHATSAPP_NUMBER && (
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi Trivoxa, I'd like a quote")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-analytics="rfq-whatsapp"
                >
                  WhatsApp ↗
                </a>
              )}
              {LINKEDIN_URL && (
                <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" data-analytics="rfq-linkedin">
                  LinkedIn ↗
                </a>
              )}
              {CALENDAR_URL && (
                <a href={CALENDAR_URL} target="_blank" rel="noopener noreferrer" data-analytics="rfq-calendar">
                  Book a call ↗
                </a>
              )}
          </div>
        </div>
      </section>

      {/* What happens next */}
      <Section eyebrow="What Happens Next" title="Three Steps From RFQ to Order.">
        <Steps items={nextSteps} row />
      </Section>

      {/* Where we are */}
      <Section eyebrow="Where We Are" title="Surat, Gujarat — India's Export Corridor.">
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
          <p className="rfq-map__note">
            Headquartered in Surat with access to Mundra, Kandla, and Nhava Sheva ports — response window 24 business
            hours, IST.
          </p>
        </div>
      </Section>
    </TrivoxaShell>
  );
}
