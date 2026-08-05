"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { Product } from "@/lib/data/product-categories";
import { displayField } from "@/lib/data/product-categories";
import { BEZIER, DURATION } from "@/lib/motion";

/** Slide-in spec drawer for a product row. Same interaction as the RFQ
 * category drawer (ind-drawer styles, patterns.css). */
export default function ProductDrawer({ product, onClose }: { product: Product | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {product && (
        <>
          <motion.div
            className="ind-drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURATION.short, ease: BEZIER.entry }}
            onClick={onClose}
          />
          <motion.div
            className="ind-drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: DURATION.short, ease: BEZIER.entry }}
            role="dialog"
            aria-modal="true"
            aria-label={`${product.name} specifications`}
          >
            <button className="ind-drawer__close" onClick={onClose}>
              Close ✕
            </button>
            <span className="ind-drawer__eyebrow">Full Specification</span>
            <h3>{product.name}</h3>
            <dl>
              <div>
                <dt>HS Code</dt>
                <dd>{displayField(product.hsCode)}</dd>
              </div>
              <div>
                <dt>Available Grades</dt>
                <dd>{displayField(product.grades)}</dd>
              </div>
              <div>
                <dt>Minimum Order Quantity</dt>
                <dd>{displayField(product.moq)}</dd>
              </div>
              <div>
                <dt>Weight</dt>
                <dd>{displayField(product.specs.weight)}</dd>
              </div>
              <div>
                <dt>Width</dt>
                <dd>{displayField(product.specs.width)}</dd>
              </div>
              <div>
                <dt>Composition</dt>
                <dd>{displayField(product.specs.composition)}</dd>
              </div>
              <div>
                <dt>Packaging</dt>
                <dd>{displayField(product.specs.packaging)}</dd>
              </div>
            </dl>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
