/** Canonical industry/category taxonomy (PTO-02). Single source of truth for
 * every surface that lists "what we export" / "industries we serve" — Home
 * preview, Businesses tags, Industries cards, Product Exports filters,
 * footer links, nav mega-menu, RFQ category selector, sitemap. No surface
 * may hold a local literal copy of this list; add/rename/retire a category
 * here and every consumer updates.
 *
 * This does NOT replace `industries.ts` (RFQ-facing trade data: HS code,
 * MOQ, lead time, Incoterms) or `product-categories.ts` (catalog SKU
 * portfolios) — those remain the detail-page data sources. This module is
 * the reconciled union of both lists' slugs, used purely for naming,
 * ordering, and routing.
 */

import { industries } from "./industries";
import { exportCategories } from "./product-categories";

export type TaxonomyStatus = "active" | "coming-online";

export interface TaxonomyEntry {
  slug: string;
  displayName: string;
  shortDescription: string;
  /** /industries/[slug]/ — null only if no industry-vertical page exists. */
  industryPageHref: string | null;
  /** /businesses/product-exports/[slug]/ — null when this is a service
   * vertical or buyer segment with no physical product catalog. */
  catalogHref: string | null;
  status: TaxonomyStatus;
  /** True for the curated subset shown on the Home industries preview. Any
   * surface rendering a subset must derive it from this flag, never a
   * hand-picked slice, and must link through to "View all". */
  featured: boolean;
  icon: string;
  /** Editorial image for the Home preview panel — only set where an asset
   * already exists; features requiring an image must check for it. */
  image?: string;
  /** i18n key in the "megaMenu" namespace carrying the translated display
   * name, where one exists (megaMenu names predate this module and are
   * translated across all 12 locales; displayName above is English-only). */
  megaMenuKey?: string;
  /** i18n key in the "home.industries" namespace carrying the translated
   * long-form description used on the Home preview panel. */
  homeDescKey?: string;
}

const industryBySlug = new Map(industries.map((i) => [i.slug, i]));
const catalogSlugs = new Set(exportCategories.map((c) => c.slug));

const ICONS: Record<string, string> = {
  "textile-apparel": "🧵",
  "healthcare-pharmaceuticals": "🧪",
  "building-materials": "🧱",
  "furniture-interiors": "🪑",
  "agriculture-food": "🌾",
  "engineering-industrial": "⚙️",
  technology: "💻",
  "retail-consumer-goods": "🛒",
  "jewellery-precious-products": "💎",
};

const IMAGES: Record<string, string> = {
  "textile-apparel": "/images/industries/textile-editorial.webp",
  "healthcare-pharmaceuticals": "/images/industries/healthcare-editorial.webp",
  "building-materials": "/images/industries/building-editorial.webp",
  "furniture-interiors": "/images/industries/furniture-editorial.webp",
  "agriculture-food": "/images/industries/agriculture.jpg",
  "engineering-industrial": "/images/industries/engineering.jpg",
  technology: "/images/industries/technology.jpg",
  "jewellery-precious-products": "/images/industries/jewellery-editorial.webp",
};

const MEGA_MENU_KEYS: Record<string, string> = {
  "textile-apparel": "textileApparel",
  "healthcare-pharmaceuticals": "healthcarePharma",
  "building-materials": "buildingMaterials",
  "furniture-interiors": "furnitureInteriors",
  "agriculture-food": "agricultureFood",
  "engineering-industrial": "engineeringIndustrial",
  technology: "technology",
  "jewellery-precious-products": "jewellery",
};

const HOME_DESC_KEYS: Record<string, string> = {
  "textile-apparel": "descTextile",
  "healthcare-pharmaceuticals": "descHealthcare",
  "building-materials": "descBuilding",
  "agriculture-food": "descAgri",
  "engineering-industrial": "descEngineering",
  technology: "descTechnology",
};

/** Ordered union of every industry (industries.ts) and export category
 * (product-categories.ts) slug — 9 unique entries today. Chairman confirmed
 * (2026-07-31) both Furniture & Interiors and Jewellery & Precious Products
 * are active export lines; their catalogs are pending real product specs
 * (see CAS-03/CAS-04), which is why they carry status "active" with an
 * empty categories/subCategories array rather than status "coming-online". */
export const taxonomy: TaxonomyEntry[] = industries.map((i) => {
  const hasCatalog = catalogSlugs.has(i.productCategorySlug ?? i.slug);
  return {
    slug: i.slug,
    displayName: i.name,
    shortDescription: i.description,
    industryPageHref: `/industries/${i.slug}/`,
    catalogHref: hasCatalog ? `/businesses/product-exports/${i.productCategorySlug ?? i.slug}/` : null,
    status: "active",
    featured: !["furniture-interiors", "retail-consumer-goods", "jewellery-precious-products"].includes(i.slug),
    icon: ICONS[i.slug] ?? "🌐",
    image: IMAGES[i.slug],
    megaMenuKey: MEGA_MENU_KEYS[i.slug],
    homeDescKey: HOME_DESC_KEYS[i.slug],
  };
});

export function getTaxonomyEntry(slug: string): TaxonomyEntry | undefined {
  return taxonomy.find((t) => t.slug === slug);
}

export const featuredTaxonomy = taxonomy.filter((t) => t.featured);

/** Slugs with a live, populated product catalog today (non-empty categories
 * on industries.ts or subCategories on product-categories.ts) — used to
 * decide whether a surface can safely render a product table vs. the
 * "tell us what you need" empty state. */
export function hasPublishedCatalog(slug: string): boolean {
  const industry = industryBySlug.get(slug);
  return Boolean(industry && industry.categories.length > 0);
}
