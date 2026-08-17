import type { ReactNode } from "react";
import "@/app/styles/shared.css";
import "@/app/styles/scroll-infra.css";
import "@/app/styles/header.css";
import "@/app/styles/mobile-nav.css";
import "@/app/styles/contact-modal.css";
import "@/app/styles/footer.css";
import "@/app/styles/pages.css";

import Header from "@/components/Header";
import MobileNav from "@/components/MobileNav";
import ContactModal from "@/components/ContactModal";
import SiteFooter from "@/components/SiteFooter";
import WhatsAppButton from "@/components/WhatsAppButton";
import MobileStickyCta from "@/components/MobileStickyCta";
import ShaderBackgroundWrapper from "@/components/ShaderBackgroundWrapper";
import AutoReveal from "@/components/motion/AutoReveal";

/**
 * Shell for every non-home route: fixed header, mobile nav, contact modal,
 * ambient gold-on-black background, and the shared footer. Lenis smooth
 * scroll (from the root layout) applies here too — it's site-wide, not
 * home-only.
 */
export default function TrivoxaShell({
  children,
  film,
}: {
  children: ReactNode;
  /**
   * Live GLSL shader-background variant (see ShaderBackground + src/shaders).
   * Omit on a route that runs its own particle field — one WebGL context per page.
   */
  film?: string;
}) {
  return (
    <div className="tvx">
      <div className="tvx__bg" aria-hidden />
      {film ? <ShaderBackgroundWrapper variant={film} /> : null}
      <Header />
      <MobileNav />
      <ContactModal />
      <main>{children}</main>
      {/* Scroll reveal for every section built from the shared primitives, which
          carry no reveal markup of their own — see AutoReveal for what it skips. */}
      <AutoReveal />
      <SiteFooter />
      <WhatsAppButton />
      <MobileStickyCta />
    </div>
  );
}
