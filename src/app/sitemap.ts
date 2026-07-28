import type { MetadataRoute } from "next";
import { locales, defaultLocale } from "@/i18n/routing";
import { exportCategories } from "@/lib/data/product-categories";
import { industries } from "@/lib/data/industries";
import { serviceCategories } from "@/lib/data/services";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://trivoxa-group.vercel.app";

// Furniture & Interiors and Jewellery & Precious Products are withheld from
// navigation (and this sitemap) until real product data exists — see the
// matching note in Header.tsx and the product-exports listing page.
const WITHHELD_SLUGS = new Set(["furniture-interiors", "jewellery-precious-products"]);

const STATIC_PATHS = [
  "",
  "/about",
  "/group",
  // The divisions landing page — a top-level nav destination, so its absence
  // here left a linked, indexable page out of the sitemap entirely.
  "/businesses",
  "/businesses/product-exports",
  "/businesses/product-exports/textile-apparel",
  "/businesses/product-exports/textile-apparel/fabrics",
  "/businesses/product-exports/textile-apparel/home-textiles",
  "/businesses/product-exports/textile-apparel/accessories",
  "/businesses/service-exports",
  "/industries",
  "/global-presence",
  "/compliance",
  "/insights",
  "/careers",
  "/contact",
  "/rfq",
];

function localizedPath(path: string, locale: string): string {
  const prefix = locale === defaultLocale ? "" : `/${locale}`;
  return `${SITE_URL}${prefix}${path}/`.replace(/\/+$/, "/") || `${SITE_URL}/`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const dynamicPaths = [
    ...exportCategories.filter((c) => !WITHHELD_SLUGS.has(c.slug) && c.slug !== "textile-apparel").map((c) => `/businesses/product-exports/${c.slug}`),
    // All six service-export categories are real pages carrying real copy and
    // are linked from both the desktop mega-menu and the mobile nav — they were
    // simply never enumerated here, so the entire services arm was invisible to
    // crawlers that trust the sitemap.
    ...serviceCategories.map((s) => `/businesses/service-exports/${s.slug}`),
    ...industries.map((i) => `/industries/${i.slug}`),
  ];

  const allPaths = [...STATIC_PATHS, ...dynamicPaths];
  // Uniform build-time stamp — no per-page real edit-history data exists yet
  // to give honest individual timestamps, and this file itself is generated
  // fresh on every build, so "now" is accurate for all of them.
  const buildTime = new Date();

  const entries: MetadataRoute.Sitemap = [];
  for (const path of allPaths) {
    for (const locale of locales) {
      entries.push({
        url: localizedPath(path, locale),
        lastModified: buildTime,
        changeFrequency: path === "" ? "weekly" : "monthly",
        priority: path === "" ? 1 : 0.7,
      });
    }
  }
  return entries;
}
