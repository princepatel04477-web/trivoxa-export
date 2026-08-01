/** Canonical regions list (PTO-03). Single source for every surface that
 * names or counts the regions Trivoxa serves — Global Presence page, footer
 * tagline, and any stated region count. Before this module existed, three
 * different lists disagreed: Global Presence named 6, the footer tagline
 * named 5 ("Southeast Asia" instead of "Asia-Pacific", South America
 * dropped), and the home ticker named a different 5.
 *
 * `slug` is load-bearing: the Global Presence particle field's regionCues
 * (src/lib/choreography.ts, GLOBAL_PRESENCE.regionCues) trigger off
 * `#region-${slug}` anchors. Do not rename a slug without updating that
 * array in the same change.
 */

export interface Region {
  slug: string;
  icon: string;
  title: string;
  /** Short name used in compact contexts (footer tagline, tickers). Equal to
   * `title` unless a shorter form reads better inline. */
  shortName: string;
  description: string;
  categories: string[];
}

export const regions: Region[] = [
  {
    slug: "europe",
    icon: "🇪🇺",
    title: "Europe",
    shortName: "Europe",
    description: "Textiles, building materials, and professional services for established and emerging European markets.",
    categories: ["Textiles", "Building Materials", "Professional Services"],
  },
  {
    slug: "middle-east",
    icon: "🕌",
    title: "Middle East",
    shortName: "Middle East",
    description: "Building materials, agriculture, and consumer goods for fast-growing Gulf and regional markets.",
    categories: ["Building Materials", "Agriculture", "Consumer Goods"],
  },
  {
    slug: "africa",
    icon: "🌍",
    title: "Africa",
    shortName: "Africa",
    description: "Agriculture, pharmaceuticals, and industrial products supporting infrastructure and development.",
    categories: ["Agriculture", "Pharmaceuticals", "Industrial Products"],
  },
  {
    slug: "north-america",
    icon: "🗽",
    title: "North America",
    shortName: "North America",
    description: "Textiles, home goods, and technology services for demanding, quality-focused buyers.",
    categories: ["Textiles", "Home Goods", "Technology Services"],
  },
  {
    slug: "south-america",
    icon: "🌎",
    title: "South America",
    shortName: "South America",
    description: "Sourcing partnerships and consumer goods for expanding regional supply chains.",
    categories: ["Sourcing Partnerships", "Consumer Goods"],
  },
  {
    slug: "asia-pacific",
    icon: "🌏",
    title: "Asia-Pacific",
    shortName: "Asia-Pacific",
    description: "Manufacturing collaboration, technology services, and cross-border trade across APAC.",
    categories: ["Manufacturing Collaboration", "Technology Services", "Cross-Border Trade"],
  },
];

export function getRegionBySlug(slug: string): Region | undefined {
  return regions.find((r) => r.slug === slug);
}

/** "Middle East · Europe · Africa · North America · Asia-Pacific · South America" */
export const regionsTagline = regions.map((r) => r.shortName).join(" · ");
