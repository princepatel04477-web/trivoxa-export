"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import type { DeliveryModel } from "@/lib/data/services";

// ssr:false keeps three.js and the WebGL scene out of the server render — there
// is nothing to hydrate, so no mismatch and no mount-gate state. Same pattern as
// the page-level signature canvases (see BusinessesCube).
const EngagementFlowCanvas = dynamic(() => import("@/components/services/EngagementFlowCanvas"), {
  ssr: false,
});

const MODELS: Record<DeliveryModel, { label: string; status: string; nodes: [string, string, string] }> = {
  project: {
    label: "Project Delivery",
    status: "Scoped engagement",
    nodes: ["Your Brief", "Trivoxa Team", "Delivered Solution"],
  },
  retainer: {
    label: "Ongoing Retainer",
    status: "Continuous cycle",
    nodes: ["Your Goals", "Trivoxa Team", "Monthly Delivery"],
  },
  "staff-aug": {
    label: "Team Augmentation",
    status: "Embedded capacity",
    nodes: ["Trivoxa Team", "Integrates With", "Your Team"],
  },
  flexible: {
    label: "Flexible Engagement",
    status: "Shaped to fit",
    nodes: ["Your Need", "Trivoxa Team", "Right-Fit Model"],
  },
};

/**
 * The engagement model as an instrument panel: a live wireframe schematic of a
 * project moving through Trivoxa, with the three stages named beneath it.
 *
 * The WebGL schematic is progressive enhancement. Under reduced motion, on a
 * low-end device, or if the scene fails to build, the static rail below stays
 * on screen and carries exactly the same information — the stage names are real
 * text in an ordered list either way, so the model is never locked inside a
 * canvas.
 */
export default function DeliveryModelDiagram({ model }: { model: DeliveryModel }) {
  const { label, status, nodes } = MODELS[model];
  const [live, setLive] = useState(false);

  // Stable identity: EngagementFlowCanvas holds this in an effect dependency, and
  // a fresh closure each render would tear the scene down and rebuild it.
  const handleActive = useCallback((active: boolean) => setLive(active), []);

  return (
    <div className={`delivery-model${live ? " is-live" : ""}`}>
      <div className="delivery-model__panel">
        <header className="delivery-model__head">
          <span className="delivery-model__kicker">Engagement Model</span>
          <span className="delivery-model__label">{label}</span>
        </header>

        <div className="delivery-model__stage">
          <EngagementFlowCanvas onActive={handleActive} />

          {/* Static rail — the only thing on screen until (and unless) the
              schematic takes over. Decorative: the stage names underneath are
              the accessible content. */}
          <svg className="delivery-model__rail" viewBox="0 0 640 80" aria-hidden="true" focusable="false">
            <line x1="40" y1="40" x2="600" y2="40" className="delivery-model__rail-line" />
            {[110, 320, 530].map((cx) => (
              <g key={cx}>
                <circle cx={cx} cy="40" r="17" className="delivery-model__rail-ring" />
                <circle cx={cx} cy="40" r="5" className="delivery-model__rail-dot" />
              </g>
            ))}
          </svg>
        </div>

        <ol className="delivery-model__nodes">
          {nodes.map((node, i) => (
            <li key={node} className="delivery-model__node">
              <span className="delivery-model__index">{String(i + 1).padStart(2, "0")}</span>
              <span className="delivery-model__name">{node}</span>
            </li>
          ))}
        </ol>

        <footer className="delivery-model__foot">
          <span className="delivery-model__status">{status}</span>
          <span className="delivery-model__meta">Trivoxa Digital</span>
        </footer>
      </div>
    </div>
  );
}
