import type { Metadata, Viewport } from "next";
import { Work_Sans, IBM_Plex_Mono, Noto_Sans_Arabic, Noto_Sans_Devanagari, Noto_Sans, Instrument_Serif, Instrument_Sans } from "next/font/google";
import localFont from "next/font/local";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import "../globals.css";
import LenisProvider from "@/components/providers/LenisProvider";
import CustomCursor from "@/components/CustomCursor";
import { GrainOverlay } from "@/components/GrainOverlay";
import SurfaceProvider from "@/components/providers/SurfaceProvider";
import TransitionProvider from "@/components/providers/TransitionProvider";
import { routing, isRtl } from "@/i18n/routing";

// latin-ext carries the Polish/Turkish diacritics (ł, ş, ğ, ı) that plain
// `latin` is missing.
const workSans = Work_Sans({
  variable: "--font-work-sans",
  subsets: ["latin", "latin-ext"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

// Instrument Serif — editorial display face for headings (h1/h2/brand marks).
// Single weight (400) by design; italic carried for emphasis.
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin", "latin-ext"],
  weight: ["400"],
  style: ["normal", "italic"],
});

// Instrument Sans — body / UI / navigation voice.
const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
});

// IBM Plex Mono is the "ledger" voice — reference numbers, corridor codes, spec
// rows, eyebrows. Used ONLY for that manifest texture, never for body copy.
// Self-hosted by next/font at build time; nothing fetched at runtime.
const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

// Lufga is the brand display face but is Latin-only — the three faces below
// cover the scripts it can't, so ar / hi / ru don't render as tofu boxes.
// next/font self-hosts all of these at build time; nothing is fetched from
// Google at runtime.
const notoArabic = Noto_Sans_Arabic({
  variable: "--font-noto-arabic",
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600", "700"],
});

const notoDevanagari = Noto_Sans_Devanagari({
  variable: "--font-noto-devanagari",
  subsets: ["devanagari"],
  weight: ["300", "400", "500", "600", "700"],
});

const notoCyrillic = Noto_Sans({
  variable: "--font-noto-cyrillic",
  subsets: ["cyrillic", "cyrillic-ext"],
  weight: ["300", "400", "500", "600", "700"],
});

const lufga = localFont({
  variable: "--font-lufga",
  src: [
    { path: "../../fonts/lufga/Lufga-Thin.woff", weight: "100", style: "normal" },
    { path: "../../fonts/lufga/Lufga-ExtraLight.woff", weight: "200", style: "normal" },
    { path: "../../fonts/lufga/Lufga-Light.woff", weight: "300", style: "normal" },
    { path: "../../fonts/lufga/Lufga-Light-Italic.woff", weight: "300", style: "italic" },
    { path: "../../fonts/lufga/Lufga-Regular.woff", weight: "400", style: "normal" },
    { path: "../../fonts/lufga/Lufga-Medium.woff", weight: "500", style: "normal" },
    { path: "../../fonts/lufga/Lufga-SemiBold.woff", weight: "600", style: "normal" },
    { path: "../../fonts/lufga/Lufga-Bold.woff", weight: "700", style: "normal" },
  ],
});

const calisto = localFont({
  variable: "--font-calisto",
  src: [{ path: "../../fonts/calisto/Calisto-MT-Italic.woff", weight: "400", style: "italic" }],
});

export const metadata: Metadata = {
  title: "Trivoxa Group | Building the Future of Global Commerce",
  description:
    "Trivoxa Group is an international business group delivering trusted products, strategic sourcing solutions, and professional services across global markets.",
  icons: { icon: "/favicon.ico", shortcut: "/favicon.ico" },
};

/**
 * `viewportFit: "cover"` lets the page paint into the notch and home-indicator
 * zones — without it those bands are letterboxed in the browser chrome colour,
 * which on a full-bleed navy hero reads as a rendering fault. Everything that
 * must stay clear of them does so through `env(safe-area-inset-*)`; see the
 * `--safe-*` tokens in globals.css.
 *
 * `initialScale` is set without `maximumScale`/`userScalable` on purpose:
 * pinch-zoom is an accessibility affordance and is never disabled here.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // The ONE place in the codebase where a colour cannot resolve through a token:
  // this is serialised into a <meta> tag at build time, where no stylesheet has
  // been parsed and `var(--bg)` has no meaning. The literal is `--bg` verbatim
  // and must be changed with it. Without it iOS paints the address bar white
  // above a navy hero.
  themeColor: "#000000",
};

/** Pre-render every locale at build time. */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  // Opts this route tree into static rendering for the locale.
  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      dir={isRtl(locale) ? "rtl" : "ltr"}
      className={`${workSans.variable} ${instrumentSerif.variable} ${instrumentSans.variable} ${ibmPlexMono.variable} ${lufga.variable} ${calisto.variable} ${notoArabic.variable} ${notoDevanagari.variable} ${notoCyrillic.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full" suppressHydrationWarning>
        <NextIntlClientProvider>
          <LenisProvider>
            <CustomCursor />
            {children}
          </LenisProvider>
        </NextIntlClientProvider>
        {/* Global grain: last child of <body> so it composites over the whole
            page. Outside the providers — it needs no i18n/scroll context.
            This is the site's ONLY grain layer; the in-canvas postprocess pass
            and the three region-scoped canvases were reconciled out so the
            field is continuous and the canvas boundary carries no seam. */}
        <GrainOverlay />
        {/* Grain tier + the shared hover vocabulary. Renders nothing. */}
        <SurfaceProvider />
        {/* Page-to-page transition panel. Sits under the grain field so the
            photographic surface carries across a navigation rather than
            blinking off mid-way. */}
        <TransitionProvider />
      </body>
    </html>
  );
}
