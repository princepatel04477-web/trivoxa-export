import { Suspense } from "react";
import type { Metadata } from "next";
import "@/app/styles/shared.css";
import "@/app/styles/scroll-infra.css";
import "@/app/styles/header.css";
import "@/app/styles/mobile-nav.css";
import "@/app/styles/hero.css";
import "@/app/styles/home.css";
import "@/app/styles/flagship-sections.css";
import "@/app/styles/footer.css";
import "@/app/styles/contact-modal.css";
import Preloader from "@/components/Preloader";
import Header from "@/components/Header";
import MobileNav from "@/components/MobileNav";
import HeroSection from "@/components/HeroSection";
import BusinessArmsPanels from "@/components/sections/BusinessArmsPanels";
import IndustriesManifest from "@/components/sections/IndustriesManifest";
import GlobalPresenceTicker from "@/components/sections/GlobalPresenceTicker";
import ValuesHoverList from "@/components/sections/ValuesHoverList";
import InsightsMagazine from "@/components/sections/InsightsMagazine";
import { AboutPreview, CareersPreview, FinalCta } from "@/components/home/previews";
import SiteFooter from "@/components/SiteFooter";
import ContactModal from "@/components/ContactModal";
import ParticleCanvasWrapper from "@/components/ParticleCanvasWrapper";
import { HOME } from "@/lib/choreography";
import WhyBuyersTrust from "@/components/sections/WhyBuyersTrust";
import MobileStickyCta from "@/components/MobileStickyCta";

export const metadata: Metadata = {
  title: "Trivoxa Group | International Trade & Business Solutions",
  description:
    "Trivoxa Group is an international business group delivering product sourcing, manufacturing partnerships, and professional services across global markets. Built on decades of manufacturing expertise.",
};

export default function Home() {
  return (
    <>
      <Preloader />
      <Suspense fallback={null}>
        <ParticleCanvasWrapper config={HOME} />
      </Suspense>
      <Header />
      <MobileNav />
      <ContactModal />

      {/* Order note — DOM order IS the particle order: each beat hangs off one of
          these hook classes and fires when that section is reached. The field
          reads globe → vessel → container → globe → mark, and the first beat is
          load-bearing: the hero globe flies STRAIGHT into the ship, with nothing
          between them. Moving .hp-trust away from directly after the hero breaks
          that (it was tried; the page then opened globe → container and the ship
          went missing entirely). See lib/choreography.ts HOME. */}

      {/* 1 · Hero — particle globe */}
      <HeroSection />
      <div className="section-divider" />

      {/* 2 · Why Buyers Trust — particle: the globe flies straight into the vessel */}
      <WhyBuyersTrust />
      <div className="section-divider" />

      {/* 3 · About Preview — particle: container */}
      <AboutPreview />
      <div className="section-divider" />

      {/* 4 · Businesses (Product & Service Exports) — full-bleed cinematic panels */}
      <BusinessArmsPanels />
      <div className="section-divider" />

      {/* 5 · Industries — sticky scroll-driven index */}
      <IndustriesManifest />
      <div className="section-divider" />

      {/* 6 · Global Presence — particle: globe returns, with ports */}
      <GlobalPresenceTicker />
      <div className="section-divider" />

      {/* 7 · Values — numbered hover list */}
      <ValuesHoverList />
      <div className="section-divider" />

      {/* 8 · Insights — magazine columns */}
      <InsightsMagazine />
      <div className="section-divider" />

      {/* 9 · Careers Preview */}
      <CareersPreview />
      <div className="section-divider" />

      {/* 10 · Final CTA — particle eagle outline */}
      <FinalCta />

      {/* 11 · Footer */}
      <SiteFooter />
      <MobileStickyCta />
    </>
  );
}

