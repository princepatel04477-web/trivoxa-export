"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { DURATION, EASE, STAGGER } from "@/lib/motion";
import { prefersReducedMotion } from "@/hooks/useScrollAnimations";

export interface EcosystemNode {
  label: string;
}

const VIEW_SIZE = 520;
const CENTER = VIEW_SIZE / 2;
const RADIUS = 200;

function nodePosition(index: number, total: number) {
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
  return {
    x: CENTER + RADIUS * Math.cos(angle),
    y: CENTER + RADIUS * Math.sin(angle),
  };
}

/** SVG business-ecosystem diagram: a center node radiating hairline
 * connectors to N outer nodes. Connectors draw in via stroke-dashoffset
 * and nodes pulse in on stagger when scrolled into view. Self-contained —
 * no dependency on the WebGL TradeArcs globe arcs. */
export default function EcosystemDiagram({
  centerLabel,
  nodes,
}: {
  centerLabel: string;
  nodes: EcosystemNode[];
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    // The diagram's resting state IS the finished drawing — full-length
    // connectors, full-size dots — which is what the markup already renders.
    // Under reduced motion we simply never scale the dots to 0 or dash the
    // lines, so the reader gets the completed figure with no draw-on.
    if (prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      const connectors = gsap.utils.toArray<SVGLineElement>(".ecosystem-diagram__connector");
      const dots = gsap.utils.toArray<SVGCircleElement>(".ecosystem-diagram__node-dot");
      const centerDot = svgRef.current!.querySelector(".ecosystem-diagram__center-dot");

      connectors.forEach((line) => {
        const length = line.getTotalLength();
        gsap.set(line, { strokeDasharray: length, strokeDashoffset: length });
      });
      gsap.set(dots, { scale: 0, transformOrigin: "50% 50%" });
      if (centerDot) gsap.set(centerDot, { scale: 0, transformOrigin: "50% 50%" });

      const tl = gsap.timeline({
        scrollTrigger: { trigger: svgRef.current, start: "top 75%", invalidateOnRefresh: true },
      });
      if (centerDot) tl.to(centerDot, { scale: 1, duration: DURATION.short, ease: EASE.entry });
      tl.to(
        connectors,
        { strokeDashoffset: 0, duration: DURATION.standard, ease: EASE.entry, stagger: STAGGER },
        "-=0.2"
      ).to(
        dots,
        { scale: 1, duration: DURATION.short, ease: EASE.entry, stagger: STAGGER },
        "-=0.9"
      );
    }, svgRef);
    return () => ctx.revert();
  }, []);

  const total = nodes.length;

  return (
    <>
      <p className="sr-only">
        {centerLabel} connects: {nodes.map((n) => n.label).join(", ")}.
      </p>
      <svg
        ref={svgRef}
        className="ecosystem-diagram"
        viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
        role="img"
        aria-hidden="true"
      >
      <g className="ecosystem-diagram__connectors">
        {nodes.map((node, i) => {
          const { x, y } = nodePosition(i, total);
          return (
            <line
              key={`line-${node.label}`}
              className="ecosystem-diagram__connector"
              x1={CENTER}
              y1={CENTER}
              x2={x}
              y2={y}
            />
          );
        })}
      </g>

      <g className="ecosystem-diagram__center">
        <circle className="ecosystem-diagram__center-dot" cx={CENTER} cy={CENTER} r={11} />
        <text className="ecosystem-diagram__center-label" x={CENTER} y={CENTER + 34} textAnchor="middle">
          {centerLabel}
        </text>
      </g>

      {nodes.map((node, i) => {
        const { x, y } = nodePosition(i, total);
        const labelBelow = y >= CENTER;
        return (
          <g key={node.label} className="ecosystem-diagram__node">
            <circle className="ecosystem-diagram__node-dot" cx={x} cy={y} r={6} />
            <text
              className="ecosystem-diagram__node-label"
              x={x}
              y={labelBelow ? y + 22 : y - 14}
              textAnchor="middle"
            >
              {node.label}
            </text>
          </g>
        );
      })}
      </svg>
    </>
  );
}
