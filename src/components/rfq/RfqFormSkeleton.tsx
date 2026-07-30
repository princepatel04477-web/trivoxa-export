import { RFQ_PATHS } from "@/lib/data/rfq-paths";

/**
 * Suspense fallback for RfqForm (§5.5: "Absolute steadiness. No layout shift,
 * ever").
 *
 * RfqForm reads useSearchParams, so it suspends through the server render and
 * arrives only on hydration. With `fallback={null}` the section was empty
 * until then and the form's full height appeared at once — measured at CLS
 * 0.298 on a 4x-throttled 390px viewport, against a 0.05 gate. It was the
 * single worst layout shift on the site and it sat on the conversion page.
 *
 * This renders the path picker's exact markup, so the reserved space is
 * correct BY CONSTRUCTION at every width rather than by a magic min-height
 * that would drift the moment a card's copy changed. Buttons become divs: the
 * skeleton must not be tabbable or announced, since it is about to be replaced
 * by the real thing.
 */
export default function RfqFormSkeleton() {
  return (
    <div className="rfq-paths" aria-hidden="true">
      {RFQ_PATHS.map((p) => (
        <div className="rfq-path-card rfq-path-card--skeleton" key={p.key}>
          <h3>{p.title}</h3>
          <p>{p.desc}</p>
          <span aria-hidden="true">→</span>
        </div>
      ))}
    </div>
  );
}
