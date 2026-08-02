import path from "path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  // A stray lockfile at C:\Users\<user>\package-lock.json (outside this
  // project) makes Next.js misdetect the workspace root as that directory
  // instead of this one, which breaks Turbopack's module resolution (it
  // can't find "tailwindcss" etc.) in `next dev`. Pin the root explicitly.
  turbopack: {
    root: path.join(__dirname),
  },
  async redirects() {
    return [
      // Flat product routes moved under /businesses/product-exports/ (taxonomy build).
      { source: "/businesses/textile-apparel", destination: "/businesses/product-exports/textile-apparel", permanent: true },
      { source: "/businesses/fabrics", destination: "/businesses/product-exports/textile-apparel/fabrics", permanent: true },
      { source: "/businesses/textile-apparel-accessories", destination: "/businesses/product-exports/textile-apparel/accessories", permanent: true },
      // Industry slugs renamed to match the master content doc.
      { source: "/industries/textiles-apparel", destination: "/industries/textile-apparel", permanent: true },
      { source: "/industries/healthcare-pharma", destination: "/industries/healthcare-pharmaceuticals", permanent: true },
    ];
  },
};

export default withNextIntl(nextConfig);
