/**
 * The hover system — one module, four primitives, applied everywhere.
 *
 * The stylesheet (src/app/styles/hover.css) owns what each primitive LOOKS
 * like. This module owns two things it cannot: which elements get which
 * primitive, and which edge the pointer crossed.
 *
 * It is deliberately a single tagger plus a single delegated listener rather
 * than a hook mounted per component. A hover written at a call site is the
 * thing that drifts — six months later the footer's links behave differently
 * from the header's for no reason anyone can name.
 *
 * Nothing here changes markup, copy, or layout. It sets attributes and one
 * custom property.
 */

/** Enter/leave state and direction live on the element as data attributes. */
const ON = "hvOn";
const LIVE = "hvLive";
const INSTANT = "hvInstant";

/**
 * The map. One entry per interactive FAMILY, never per page.
 *
 * Selectors that already carry an equivalent treatment in page CSS are absent
 * on purpose — doubling a media zoom or a rule underline on top of an existing
 * one is worse than either alone, and the existing styling is locked.
 * `:not([data-hv])` on every query keeps re-tagging idempotent across route
 * changes.
 */
const MAP: ReadonlyArray<readonly [primitive: string, selector: string]> = [
  // Buttons — the fill sweeps, the button does not move.
  [
    "sweep",
    [
      // NOTE: `.primary-button` is deliberately absent. It already carries a
      // directional-rule underline of its own in shared.css (converted to a
      // transform under this directive), and stacking a surface sweep on top of
      // it would double-treat the site's most common button. It is the one
      // documented exception to "no per-element implementations" — unifying it
      // means deleting an existing appearance, which is locked.
      ".ghost-button",
      ".tvx-btn",
      ".btn-gold",
      ".btn-ghost",
      ".form-submit",
      ".nav-cta",
      ".pgrid__bar-cta",
      ".pgrid__spec-btn",
      ".presence-map-diagram__cta",
      ".footer-newsletter__form button",
      ".insights-teaser__form-row button",
      ".rfq-path-back",
    ].join(","),
  ],
  // Navigation and primary links — the label swaps under its mask.
  [
    "label",
    [
      ".header .header-links > li > a",
      ".header .nav-drop ul li a",
      ".footer .footer-content ul li a",
      ".footer-bottom a",
      ".footer-legal-link",
      ".tvx-crumb a",
      ".rfq-quicklinks a",
      ".sticky-cat-cta a",
    ].join(","),
  ],
  // Everything else that responds to a pointer — the rule wipes through.
  [
    "rule",
    [
      ".arm-panel__link",
      ".biz-arm__cta",
      ".insights-magazine__all",
      ".group-hero__scroll",
      ".tvx-pill",
      ".cert-mark",
      ".lang-switch__option",
      ".footer-social a",
      ".hp-careers .highlight",
    ].join(","),
  ],
  // Media frames that already clip their own media, and do not already scale it.
  ["media", [".article-card .thumb", ".insights-teaser__card figure"].join(",")],
];

/** Percentage of the box width at which the pointer crossed the boundary. */
function entryEdge(el: Element, clientX: number, clientY: number): string {
  const r = el.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return "50%";
  // Which side is the pointer nearest, in units of the box's own dimensions?
  // Normalising by width and height is what makes a wide, short link and a
  // tall, narrow card agree about where "the left edge" is.
  const dLeft = (clientX - r.left) / r.width;
  const dRight = 1 - dLeft;
  const dTop = (clientY - r.top) / r.height;
  const dBottom = 1 - dTop;
  const nearest = Math.min(dLeft, dRight, dTop, dBottom);
  if (nearest === dLeft) return "0%";
  if (nearest === dRight) return "100%";
  // Entered over the top or bottom edge: there is no horizontal direction to
  // honour, so the wipe opens from the middle rather than picking a side at
  // random. Guessing here is what makes a directional effect read as broken.
  return "50%";
}

function setOrigin(el: HTMLElement, value: string): void {
  el.style.setProperty("--hv-ox", value);
}

/**
 * Tags every element the map covers.
 *
 * Two things are set beyond the primitive name:
 *
 *  - `data-hv-label`, the masked swap's duplicate text. Read from the element
 *    rather than authored, so no markup anywhere needs a new attribute.
 *  - `position: relative`, but ONLY when the computed position is `static`.
 *    Every primitive anchors an absolutely-positioned pseudo-element, so the
 *    element must be a containing block; overriding a position the page CSS
 *    already set would tear the layout, and setting it inline avoids a
 *    specificity fight with per-page rules.
 */
export function tagHoverTargets(root: ParentNode = document): void {
  for (const [primitive, selector] of MAP) {
    const els = root.querySelectorAll<HTMLElement>(selector);
    for (const el of els) {
      if (el.dataset.hv) continue;
      el.dataset.hv = primitive;
      if (getComputedStyle(el).position === "static") el.style.position = "relative";
      if (primitive === "label") applyLabel(el);
    }
  }
}

/**
 * Prepares an element for the masked label swap, or declines to.
 *
 * The primitive works by making the element's own text a layout spacer and
 * drawing the two travelling copies as pseudo-elements. That is only safe when
 * the element's content IS the text: an icon, a badge, or a nested span with
 * its own styling would be hidden along with it and never come back, since a
 * pseudo-element can only reproduce a string.
 *
 * So anything with element children falls back to the directional rule, which
 * needs no such guarantee. Coverage stays complete either way — the fallback is
 * a different primitive, not an absence of one.
 */
function applyLabel(el: HTMLElement): void {
  const label = el.textContent?.trim();
  if (!label || el.firstElementChild) {
    el.dataset.hv = "rule";
    return;
  }
  el.dataset.hvLabel = label;
  // A flex container does not inherit text-align, so the duplicate would sit
  // left-aligned inside a centred link and jump sideways on the first hover.
  const align = getComputedStyle(el).textAlign;
  el.style.setProperty(
    "--hv-justify",
    align === "center" ? "center" : align === "right" || align === "end" ? "flex-end" : "flex-start"
  );
  // The visual text is painted transparent from here on (see hover.css), and
  // pseudo-element `content` is not reliably exposed to assistive technology.
  // Naming the element explicitly keeps the link announced regardless of which
  // layer a given AT reads, so the treatment costs nothing to a screen reader.
  if (!el.hasAttribute("aria-label")) el.setAttribute("aria-label", label);
}

/**
 * Starts the hover system. Returns a disposer.
 *
 * One delegated listener set on the document, not one per element: the site
 * has several hundred interactive elements across its routes, and attaching
 * four listeners to each of them is both a memory cost and a teardown hazard
 * on every client-side navigation.
 */
export function startHoverSystem(): () => void {
  const target = (e: Event): HTMLElement | null => {
    const node = e.target;
    if (!(node instanceof Element)) return null;
    return node.closest<HTMLElement>("[data-hv]");
  };

  const release = (el: HTMLElement) => {
    delete el.dataset[LIVE];
  };

  const onEnter = (e: PointerEvent) => {
    const el = target(e);
    if (!el) return;
    if (e.pointerType === "touch") {
      // Touch has no hover. Resolve to the end state immediately, from the
      // centre — there is no meaningful edge for a tap — and let the next tap
      // elsewhere clear it. Nothing on the site is reachable only this way.
      el.dataset[INSTANT] = "";
      setOrigin(el, "50%");
      el.dataset[ON] = "";
      return;
    }
    delete el.dataset[INSTANT];
    el.dataset[LIVE] = "";
    setOrigin(el, entryEdge(el, e.clientX, e.clientY));
    el.dataset[ON] = "";
  };

  const onLeave = (e: PointerEvent) => {
    const el = target(e);
    if (!el) return;
    // The origin moves to the edge being LEFT, so the treatment collapses out
    // through that edge instead of retracing its entry. That continuity is the
    // difference between a directional effect and a fade with extra steps.
    // Safe to move at this instant: the treatment is at full scale, where the
    // origin has no visual effect.
    setOrigin(el, entryEdge(el, e.clientX, e.clientY));
    delete el.dataset[ON];
  };

  const onTransitionEnd = (e: TransitionEvent) => {
    const el = target(e);
    // Released on completion, not left standing — see hover.css.
    if (el && !(ON in el.dataset)) release(el);
  };

  // `pointerover`/`pointerout` rather than `pointerenter`/`pointerleave`:
  // only the former pair bubbles, and delegation is the entire design.
  // The child-to-child noise they also carry is filtered by comparing the
  // resolved [data-hv] ancestor on each side of the transition.
  const onOver = (e: PointerEvent) => {
    const el = target(e);
    const from = e.relatedTarget instanceof Element ? e.relatedTarget.closest("[data-hv]") : null;
    if (el && el !== from) onEnter(e);
  };
  const onOut = (e: PointerEvent) => {
    const el = target(e);
    const to = e.relatedTarget instanceof Element ? e.relatedTarget.closest("[data-hv]") : null;
    if (el && el !== to) onLeave(e);
  };

  document.addEventListener("pointerover", onOver, true);
  document.addEventListener("pointerout", onOut, true);
  document.addEventListener("transitionend", onTransitionEnd, true);

  return () => {
    document.removeEventListener("pointerover", onOver, true);
    document.removeEventListener("pointerout", onOut, true);
    document.removeEventListener("transitionend", onTransitionEnd, true);
  };
}
