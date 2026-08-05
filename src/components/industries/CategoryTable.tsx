"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ProductCategory } from "@/lib/data/industries";
import { BEZIER, DURATION } from "@/lib/motion";

export default function CategoryTable({ categories }: { categories: ProductCategory[] }) {
  const [active, setActive] = useState<ProductCategory | null>(null);

  return (
    <>
      <div className="ind-table-wrap">
        <table className="ind-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>HS Code</th>
              <th>MOQ</th>
              <th>Incoterms</th>
              <th>Lead Time</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr
                key={c.name}
                tabIndex={0}
                role="button"
                onClick={() => setActive(c)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setActive(c)}
              >
                <td>{c.name}</td>
                <td className="mono">{c.hsCode}</td>
                <td className="mono">{c.moq}</td>
                <td className="mono">{c.incoterms.join(" / ")}</td>
                <td className="mono">{c.leadTime}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {active && (
          <>
            <motion.div
              className="ind-drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: DURATION.short, ease: BEZIER.entry }}
              onClick={() => setActive(null)}
            />
            <motion.div
              className="ind-drawer"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: DURATION.short, ease: BEZIER.entry }}
              role="dialog"
              aria-modal="true"
            >
              <button className="ind-drawer__close" onClick={() => setActive(null)}>
                Close ✕
              </button>
              <span className="ind-drawer__eyebrow">Full Specification</span>
              <h3>{active.name}</h3>
              <dl>
                <div>
                  <dt>HS Code</dt>
                  <dd>{active.hsCode}</dd>
                </div>
                <div>
                  <dt>Minimum Order Quantity</dt>
                  <dd>{active.moq}</dd>
                </div>
                <div>
                  <dt>Incoterms Offered</dt>
                  <dd>{active.incoterms.join(", ")}</dd>
                </div>
                <div>
                  <dt>Lead Time</dt>
                  <dd>{active.leadTime}</dd>
                </div>
                <div>
                  <dt>Packaging</dt>
                  <dd>{active.packaging}</dd>
                </div>
              </dl>
              {active.specSheetUrl && (
                <a className="tvx-btn tvx-btn--ghost ind-drawer__specsheet" href={active.specSheetUrl} target="_blank" rel="noopener noreferrer">
                  Download Spec Sheet
                </a>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
