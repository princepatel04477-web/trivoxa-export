/** Product-export taxonomy from the master content doc §4 (Business
 * Taxonomy + §4.2–4.4 portfolios). Product names are verbatim; HS codes,
 * grades, MOQs, and spec fields marked "TBD" await real trade data — the
 * UI (ProductTable/ProductDrawer) renders that sentinel as "—", never the
 * literal word, via `displayField()` below.
 * The three fabric HS codes were supplied in the build brief. */

export interface ProductSpecs {
  weight: string;
  width: string;
  composition: string;
  packaging: string;
  sampleAvailability: string;
}

/** Renders the "TBD" sentinel as an honest, unlabelled dash instead of the
 * literal word — a standard "not yet specified" convention, not a claim. */
export function displayField(value: string): string {
  return value === "TBD" ? "—" : value;
}

export interface Product {
  name: string;
  hsCode: string;
  grades: string;
  moq: string;
  specs: ProductSpecs;
}

export interface ProductGroup {
  name: string;
  products: Product[];
}

export interface SubCategory {
  slug: string;
  name: string;
  /** Flat portfolio (fabrics) or grouped portfolio (accessories). */
  products?: Product[];
  groups?: ProductGroup[];
}

export interface ExportCategory {
  slug: string;
  name: string;
  /** Verbatim industry-card copy from master doc §5.3 (jewellery from §4.1 list). */
  description: string;
  image: string;
  subCategories?: SubCategory[];
}

const TBD_SPECS: ProductSpecs = {
  weight: "TBD",
  width: "TBD",
  composition: "TBD",
  packaging: "TBD",
  sampleAvailability: "Samples available on request",
};

function product(name: string, hsCode = "TBD", grades = "TBD", moq = "TBD"): Product {
  return { name, hsCode, grades, moq, specs: TBD_SPECS };
}

export const exportCategories: ExportCategory[] = [
  {
    slug: "textile-apparel",
    name: "Textile & Apparel",
    description:
      "Supporting manufacturers, brands, wholesalers, and sourcing companies with fabrics, home textiles, apparel accessories, and customized sourcing solutions.",
    image: "/images/industries/textile-editorial.webp",
    subCategories: [
      {
        slug: "fabrics",
        name: "Fabrics",
        products: [
          product("Polyester Greige Fabric", "5407.61", "Standard, Premium", "5 MT"),
          product("Dyed Fabric", "5407.72"),
          product("Finished Fabric", "5407.73"),
          product("Cotton Fabric"),
          product("Blended Fabric"),
        ],
      },
      {
        slug: "home-textiles",
        name: "Home Textiles",
        products: [],
      },
      {
        slug: "accessories",
        name: "Textile & Apparel Accessories",
        groups: [
          {
            name: "Elastic Solutions",
            products: [
              product("Elastic Tapes"),
              product("Waistband Elastic"),
              product("Bra Strap Elastic"),
              product("Knitted Elastic"),
              product("Woven Elastic"),
              product("Fold-Over Elastic"),
              product("Jacquard Elastic"),
              product("Printed Elastic"),
            ],
          },
          {
            name: "Trims & Tapes",
            products: [product("Drawcords"), product("Ribbons"), product("Tapes")],
          },
          {
            name: "Labels & Branding",
            products: [product("Woven Labels"), product("Printed Labels"), product("Brand Labels")],
          },
          {
            name: "Fastening Solutions",
            products: [product("Zippers"), product("Buttons"), product("Hook & Eye Fasteners")],
          },
          {
            name: "Sewing Materials",
            products: [product("Sewing Threads"), product("Interlinings"), product("Laces")],
          },
        ],
      },
    ],
  },
  {
    slug: "healthcare-pharmaceuticals",
    name: "Healthcare & Pharmaceuticals",
    description:
      "Providing access to trusted pharmaceutical products and healthcare solutions through responsible sourcing and quality-focused manufacturing partnerships.",
    image: "/images/industries/healthcare-editorial.webp",
  },
  {
    slug: "building-materials",
    name: "Building Materials",
    description:
      "Supplying natural stone, marble, granite, ceramic products, and construction materials for residential, commercial, and infrastructure projects.",
    image: "/images/industries/building-editorial.webp",
  },
  {
    slug: "furniture-interiors",
    name: "Furniture & Interiors",
    description:
      "Connecting businesses with quality furniture and interior solutions for residential, commercial, and hospitality environments.",
    image: "/images/industries/furniture-editorial.webp",
  },
  {
    slug: "agriculture-food",
    name: "Agriculture & Food",
    description:
      "Supporting international buyers with carefully sourced agricultural products, fresh produce, spices, and processed food solutions.",
    image: "/images/industries/agriculture.jpg",
  },
  {
    slug: "engineering-industrial",
    name: "Engineering & Industrial",
    description:
      "Delivering industrial products, engineering components, and manufacturing solutions that support industrial growth and infrastructure development.",
    image: "/images/industries/engineering.jpg",
  },
  {
    slug: "jewellery-precious-products",
    name: "Jewellery & Precious Products",
    description:
      "Connecting global buyers with carefully sourced jewellery and precious products through trusted manufacturing partnerships.",
    image: "/images/industries/jewellery-editorial.webp",
  },
];

export function getExportCategory(slug: string): ExportCategory | undefined {
  return exportCategories.find((c) => c.slug === slug);
}

export function getSubCategory(categorySlug: string, subSlug: string): SubCategory | undefined {
  return getExportCategory(categorySlug)?.subCategories?.find((s) => s.slug === subSlug);
}
