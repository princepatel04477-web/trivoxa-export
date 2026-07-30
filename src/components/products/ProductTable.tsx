"use client";

import { useState } from "react";
import type { Product, ProductGroup } from "@/lib/data/product-categories";
import { displayField } from "@/lib/data/product-categories";
import ProductDrawer from "@/components/products/ProductDrawer";
// .ind-table lives in industry-page.css, which until now was imported only by
// /industries/[slug]. This component is also rendered by the textile-apparel
// subcategory pages, where the table therefore had no padding, no rules and no
// header treatment at all — rows collapsed to 28px, which is what surfaced it
// against the 44px gate. Styles travel with the component (the convention
// TrivoxaShell and Logo already follow) so it cannot come apart again.
import "@/app/styles/industry-page.css";

function Table({ products, onSelect }: { products: Product[]; onSelect: (p: Product) => void }) {
  return (
    <div className="ind-table-wrap">
      <table className="ind-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>HS Code</th>
            <th>Available Grades</th>
            <th>MOQ</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr
              key={p.name}
              tabIndex={0}
              role="button"
              onClick={() => onSelect(p)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(p)}
            >
              <td>{p.name}</td>
              <td className="mono">{displayField(p.hsCode)}</td>
              <td>{displayField(p.grades)}</td>
              <td className="mono">{displayField(p.moq)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Hairline product portfolio table; click a row for the full-spec drawer.
 * Pass `groups` instead of `products` for the accordion-of-tables variant
 * (native <details>, first group open by default). */
export default function ProductTable({ products, groups }: { products?: Product[]; groups?: ProductGroup[] }) {
  const [active, setActive] = useState<Product | null>(null);

  return (
    <>
      {products && <Table products={products} onSelect={setActive} />}
      {groups?.map((group, i) => (
        <details key={group.name} className="product-group" open={i === 0}>
          <summary className="product-group__summary">
            <span className="product-group__num">{String(i + 1).padStart(2, "0")}</span>
            <span className="product-group__name">{group.name}</span>
            <span className="product-group__count">{group.products.length} products</span>
          </summary>
          <Table products={group.products} onSelect={setActive} />
        </details>
      ))}
      <ProductDrawer product={active} onClose={() => setActive(null)} />
    </>
  );
}
