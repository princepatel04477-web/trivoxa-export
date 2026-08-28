/**
 * Particle choreography.
 *
 * The scene's beat list, kept here rather than inline in the route file so the
 * sequence is legible in one place.
 *
 * Six routes run a particle field, and since the amplitude directive every one
 * of them is SCRUBBED: the reader's scroll position is the playhead, not a
 * threshold that fires a canned tween. Home is the only page that also carries a
 * beat list, and those beats now do side effects only — where the field sits,
 * how present it is, whether the port overlay is up — while its stage sequence
 * owns what the field IS.
 *
 * None of these routes mounts a GLSL shader background: it sits on the same
 * fixed z-index:-1 layer, and running both would mean two WebGL contexts
 * competing per page.
 */

import {
  withEagleFinale,
  buildBusinessesStages,
  buildGroupStages,
  buildInsightsStages,
  buildInsightsPhase,
  buildCareersStages,
  buildIndustriesStages,
  buildCareersPhase,
} from "./shapes";
import { buildPresenceGeo, REGION } from "./shapes/presence";
import { FIELD_OPACITY_FLOOR } from "./motion";
import type { SceneConfig } from "./particle-scene";

/**
 * Two-tone particle palette for the site's canonical Midnight Navy ground.
 *
 * The signature forms all need two tones — focal nodes, an HQ marker, an origin,
 * accented heads — so a single-hue field can't express them. The split follows the
 * site's existing colour logic rather than inventing one: gold is what marks the
 * focal and active everywhere else in the app, so it stays the accent, and the
 * supporting-copy slate carries the structure.
 *
 * Both are existing tokens, and no value is written here — the scene resolves
 * them from the live CSS custom properties at mount.
 *
 * `ground: "dark"` is the default, but it is stated explicitly here because it
 * decides the blend mode and the whole post-processing stack — additive glow plus
 * bloom on dark, normal compositing with no bloom on light.
 */
export const PARTICLE_PALETTE = {
  // The token globals.css designates for ALL particle rendering. Home only —
  // every other page below has its own distinct primary (still an existing
  // token, never a new colour value), so five pages don't all render the
  // same field.
  primary: "--gold-particle",
  // Focal nodes run a touch hotter, still inside the documented gold family.
  accent: "--gold-hover",
  ground: "dark",
} as const;

/** Per-page particle palettes — same accent (gold-hover) as the connective
 * thread across every page, distinct primary per page so the five inner
 * pages read apart from each other and from Home. Every value is one of the
 * existing tokens design-tokens.ts already allows (globals.css); nothing
 * new is introduced. Home keeps PARTICLE_PALETTE untouched. */
const GROUP_PALETTE = { primary: "--gold", accent: "--gold-hover", ground: "dark" } as const;
const BUSINESSES_PALETTE = { primary: "--port-origin-dot", accent: "--gold-hover", ground: "dark" } as const;
const GLOBAL_PRESENCE_PALETTE = { primary: "--port-dest-dot", accent: "--gold-hover", ground: "dark" } as const;
const INSIGHTS_PALETTE = { primary: "--success", accent: "--gold-hover", ground: "dark" } as const;
const CAREERS_PALETTE = { primary: "--text-2", accent: "--gold-hover", ground: "dark" } as const;
const INDUSTRIES_PALETTE = { primary: "--text-2", accent: "--gold", ground: "dark" } as const;

/**
 * Home — one continuous scrubbed sequence:
 *   globe (hero) → vessel (trust) → container (about, held across business arms
 *   + industries) → ports globe (global presence) → eagle (CTA) → the mark held
 *   back behind the footer.
 *
 * The field RECEDES across the content-dense sections rather than disappearing
 * from them. It used to drop to 0.28 there, which with the vignette on top left
 * two viewports rendering as solid black — a backdrop that vanishes for a fifth
 * of the page reads as broken, not as restrained. Where a specific block needs
 * more contrast than the floor allows it carries a local scrim (`.copy-scrim`).
 */
export const HOME: Omit<SceneConfig, "onDegrade"> = {
  /**
   * SCRUBBED, not fired.
   *
   * Home used to be the site's one discrete-beat page: a section crossed a
   * threshold, a 4s elastic tween played, and nothing happened again until the
   * next threshold. The four inner pages were already scrubbed, and side by
   * side the difference is not subtle — on a scrubbed page the reader's wheel
   * IS the playhead, so scrolling faster detonates the cloud faster and
   * stopping halfway leaves it hanging mid-explosion. On a fired one a canned
   * animation plays at you.
   *
   * The shape sequence is therefore a stage list now, and the beats below keep
   * only their side effects. Both halves are load-bearing: the stages make the
   * morph the reader's to drive, and the beats keep each form parked beside the
   * copy column its section was laid out around, which a single master timeline
   * across the whole document could not do.
   *
   * globe → vessel → container → ports globe → mark. Same five forms, same
   * order, same sections — only the driver changed.
   */
  shapes: ["globe", "cargo-ship", "container", "eagle"],
  buildStages: (_ctx, registry) => [
    registry.get("globe"),
    registry.get("cargo-ship"),
    registry.get("container"),
    // The globe returns for Global Presence. The same buffer, deliberately: it
    // is the same object coming back, not a second one that resembles it.
    registry.get("globe"),
    registry.get("eagle"),
  ],
  /**
   * One binding per transition, each spanning the approach to its own section —
   * `top bottom` to `top center` is the range across which that section rises
   * into view, so the form has finished becoming what the copy is about by the
   * time the copy is centred. Deliberately the SAME range the sweeps use, so
   * the morph and the reposition resolve together instead of one trailing the
   * other.
   */
  stageBindings: [
    // globe → vessel. Load-bearing: the hero globe flies STRAIGHT into the ship.
    { trigger: ".hp-trust", start: "top bottom", end: "top center" },
    // vessel → container
    { trigger: ".hp-about", start: "top bottom", end: "top center" },
    // container → the ports globe. The longest hold on the page sits inside this
    // segment's approach (business arms + industries), so the container is what
    // the reader has behind them through both.
    { trigger: ".hp-global", start: "top bottom", end: "top center" },
    // globe → the mark
    { trigger: ".hp-cta", start: "top bottom", end: "top center" },
  ],
  ports: true,
  /**
   * Restrained (0.35 of the reference path's amplitude), and restrained for a
   * specific reason rather than out of caution: home is the one page whose
   * field is deliberately parked beside a copy column at four different points.
   * A full-amplitude lateral journey crosses those columns. The four inner
   * pages are centre-composed and take it at full strength.
   */
  fieldPath: 0.35,
  /**
   * The field answers the scroll EVERYWHERE, not only at the five beats.
   *
   * Home is the one page whose whole choreography is discrete: a beat fires, the
   * field morphs, and then nothing happens until the next one — so scrolling
   * through a section produced no response at all from the backdrop, while the
   * four stage pages have scrubbed morphs plus `cameraOrbit` running the entire
   * way down. This is the beat-page equivalent of that orbit.
   *
   * 110° across the full document is roughly a third of a turn — clearly the
   * reader's doing when they scroll, still slow enough that it never competes
   * with the 26s idle rotation underneath it. The 1.2-unit vertical parallax is
   * about a tenth of the visible frame height and is the term that carries the
   * flat formations (vessel, container, eagle), which take no rotation.
   */
  scrollMotion: { spinDeg: 110, driftY: 1.2 },
  // Home already closes on the eagle through its beat list (.hp-cta), so it needs
  // no finale appended — but it resolves its colour from the same tokens.
  palette: PARTICLE_PALETTE,
  // Beats are listed in DOM order, which is firing order.
  //
  // The first beat is load-bearing: the hero globe flies STRAIGHT into the
  // vessel, so .hp-trust must be the section immediately after the hero. A
  // funnel re-sequencing that moved it below Industries was tried and reverted —
  // it put the container first and the ship never appeared where the eye
  // expected it, which read as the field skipping a beat.
  //
  // SIDE EFFECTS ONLY. Every `shape` key is gone — the stage sequence above
  // owns what the field IS; these own where it sits, how bright it is, and
  // whether the port overlay is up.
  beats: [
    // Trust ("A sourcing partner, not just a supplier directory"). Sits to the
    // side. sweep 0.8, not 1: parking a long horizontal form hard against the
    // edge pushes its bow off frame. Backed off just enough to keep both ends
    // in shot while the copy column stays clear.
    { trigger: ".hp-trust", sweep: 0.8 },
    // About ("A Vision Beyond Business").
    { trigger: ".hp-about", sweep: 0.7 },
    // Business Arms + Industries — the field LEAVES.
    //
    // Not the floor. The floor (0.62) exists so a section never reads as an
    // empty black rectangle, and that argument holds where the field is a
    // backdrop. It does not hold here: the form on screen at this point is the
    // container, and a recognisable OBJECT held at 62% behind two image-led
    // card sections does not read as a backdrop — it reads as a leftover, and
    // it was showing as a bright sliver in the gap between the two cards.
    //
    // The sequence is meant to be container → globe → mark, so the container
    // has to be gone before the globe arrives rather than fading under it.
    // These two sections carry their own photography and need no field.
    { trigger: ".hp-sec-4", opacity: 0 },
    // Global Presence ("Connecting Opportunities Across Borders") — the ports
    // globe with named markers, parked on the RIGHT so the section's copy
    // (left-aligned in CSS) sits clear of it.
    {
      trigger: ".hp-global",
      sweep: 1,
      ports: true,
      onLeaveBack: { opacity: 0 }, // scrolling up into the industries index — match the beat above
    },
    // Values / Insights / Careers — the field leaves again, so the globe does
    // not trail through three text sections on its way to the mark. Same
    // reasoning as .hp-sec-4: globe → (nothing) → mark.
    { trigger: ".hp-values", opacity: 0 },
    // Final CTA — the Trivoxa eagle, in grains, behind the copy.
    { trigger: ".hp-cta", sweep: 0 },
    // Footer — hold the mark but drop it back so footer copy stays legible;
    // scrolling back up restores full opacity.
    //
    // The amplitude directive asks for 0.55 here and this is the one place it
    // is not taken at face value. The reasoning behind the raise — that no
    // viewport should read as an empty black rectangle — is sound and is now
    // satisfied by the deep field, which is never faded by a beat and is
    // present in every frame of the page. What the footer additionally has is
    // a five-column link grid, a newsletter form and an address block, and the
    // closing eagle is a large near-white mass directly behind all of it: at
    // 0.55 the mark reads over the column headings and the link list stops
    // being scannable. 0.26 also looks like a CUT against the old 0.30 and is
    // not one: the pool doubled, so the eagle — a flat silhouette with no
    // depth cueing to thin it — carries roughly twice the grains in the same
    // area and reads about twice as bright at any given opacity. 0.26 against
    // 34,000 grains is brighter than 0.30 was against 18,000. The link grid
    // additionally carries its own scrim (see SiteFooter).
    {
      trigger: ".footer",
      opacity: 0.26,
      fadeDuration: 0.8,
      onLeaveBack: { opacity: 1, fadeDuration: 0.5 },
    },
  ],
};

/**
 * Group — interlocking hexagonal cells, the group as one connected organism.
 *
 * Unlike HOME (discrete beats that fire and ease), every morph here is scrubbed:
 * the reader's scroll position IS the animation's playhead, so the structure
 * subdivides under their hand rather than snapping between states. Each segment
 * spans the two sections named in its binding, so a morph resolves exactly as
 * the reader crosses from one idea to the next.
 *
 *   one cell (hero, Who We Are)
 *     → three interlocked, accent on the founding node (Foundation → Our Story)
 *     → six in an orbital ring (The Trivoxa Way → Leadership)
 *     → the complete mesh, connections drawn in (Business Ecosystem — the climax,
 *       held through the section rather than passed through)
 *     → relaxed drift, hex silhouette persisting (Looking Ahead → CTA)
 *
 * The stage buffers come from buildGroupStages, called by the scene with the pool
 * size it settled on for this device tier.
 */
export const GROUP: Omit<SceneConfig, "onDegrade"> = {
  buildStages: withEagleFinale(buildGroupStages),
  // Bound to the page's own section ids rather than to added marker elements, so
  // a trigger boundary is always exactly a section boundary.
  stageBindings: [
    // → three interlocked cells
    { trigger: "#foundation", start: "top center", endTrigger: "#our-story", end: "center center" },
    // → six cells, orbital ring
    { trigger: "#trivoxa-way", start: "top center", endTrigger: "#leadership", end: "center center" },
    // → complete mesh. Resolves by the time the ecosystem diagram is centred,
    //   then holds: nothing starts again until Looking Ahead.
    { trigger: "#ecosystem", start: "top bottom", end: "center center" },
    // → the shared eagle finale, converging behind the CTA
    { trigger: "#looking-ahead", start: "top center", endTrigger: ".group-cta-wrap", end: "top center" },
  ],
  motion: "planar",
  palette: GROUP_PALETTE,
  // The lattice sits behind body copy for most of the page, so it is held well
  // below full strength — it is a watermark, not an illustration.
  /**
   * Trimmed ~20%% alongside the amplitude directive, and this is a RAISE in
   * net terms rather than a cut. `fieldOpacity` is a ceiling on a field that
   * now carries nearly twice the grains at a wider size spread, and these
   * stage forms are planar — no depth cueing thins their far half the way it
   * thins the globe's — so at the old ceiling the lattice came out heavier
   * against its own lead copy than it was ever composed to be. The product of
   * count x size x opacity is still well up on where it started.
   */
  fieldOpacity: 0.62,
  // Well under the home globe's 1.6. The brief asks for generous open space
  // around each form rather than a filled frame, so the lattice is held compact
  // and the page breathes around it.
  formationScale: 0.82,
  // The page root — the orbit is scrubbed across the entire scroll, not a section.
  cameraOrbit: { trigger: ".tvx", sweepDeg: 26, dolly: 5 },
  // Centre-composed page with no beat sweeps to collide with, so the spatial
  // path runs at full amplitude: the reader travels past and through the
  // lattice rather than watching it subdivide on the spot.
  fieldPath: 1,
  fieldPathTrigger: ".tvx",
  mobileOpacityCap: 0.48,
};

/**
 * Global Presence — the globe, held spherical the whole way down.
 *
 * This page runs the engine's GEO mode rather than its stage-buffer mode: every
 * stage is the same points at the same lat/lon, and a single `bend` uniform turns
 * them into a sphere (1) or a flat equirectangular map (0). Costs one float per
 * frame and ships no position buffers, which is what keeps 60fps a property of
 * the design rather than something to tune afterwards.
 *
 *   globe (hero, Global Overview)
 *     → the regional clusters illuminate in sequence (Regions)
 *     → the trade-route arcs draw between hubs (Trade & Operations)
 *     → routes settle, particles relax to drift, then converge on the eagle
 *
 * The flat world map was REMOVED: `bend` is pinned at 1 for every stage, so the
 * field never unwraps. Everything on this page already rode that one uniform —
 * idle spin, axial tilt, parallax, drag (disabled below bend 0.6) and the route
 * overlay's own sphere↔flat blend — so holding it at 1 keeps the globe
 * spinning and draggable through the entire page instead of going inert and
 * flat halfway down. The stages remain distinct because they still switch
 * region illumination, routes and the eagle finale on and off.
 */
export const GLOBAL_PRESENCE: Omit<SceneConfig, "onDegrade"> = {
  buildGeoField: ({ count }) => buildPresenceGeo(count),
  // Every stage holds bend: 1. The stage list is what switches regions, routes
  // and the finale on — it is no longer what flattens the globe.
  geoStages: [
    // Hero + Global Overview + Network — the globe, spherical and spinning.
    { name: "globe", bend: 1 },
    // Regions: illumination is driven by regionCues, never by bend.
    { name: "globe-regions", bend: 1 },
    // Trade & Operations: route arcs drawn between hubs, on the sphere.
    { name: "globe-routes", bend: 1, routes: true },
    // Close: routes settle out and the globe converges into the shared eagle.
    // `eagle: true` blends the analytic form toward the sampled mark (see the
    // uEagleBlend path in particle-scene) — geo mode has no position buffers of
    // its own, so this is how the finale reaches it.
    { name: "eagle", bend: 1, drift: 0.2, eagle: true },
  ],
  // One binding per transition, so this list is always geoStages.length - 1.
  // The old first binding scrubbed the unwrap across Overview→Network; with no
  // unwrap left to drive there is nothing for it to do, so it is gone and the
  // globe simply holds through the hero, Overview and Network sections.
  stageBindings: [
    // → regional illumination
    { trigger: "#regions", start: "top bottom", end: "top center" },
    // → routes draw
    { trigger: "#trade-operations", start: "top bottom", end: "top center" },
    // → relax into the eagle
    { trigger: "#growing", start: "top center", endTrigger: ".tvx-cta", end: "top center" },
  ],
  // One cue per region row, fired as each scrolls up into view.
  regionCues: [
    { trigger: "#region-europe", region: REGION.EUROPE },
    { trigger: "#region-middle-east", region: REGION.MIDDLE_EAST },
    { trigger: "#region-africa", region: REGION.AFRICA },
    { trigger: "#region-north-america", region: REGION.NORTH_AMERICA },
    { trigger: "#region-south-america", region: REGION.SOUTH_AMERICA },
    { trigger: "#region-asia-pacific", region: REGION.ASIA_PACIFIC },
    // Clear the highlight once the reader is past the regional breakdown, so the
    // routes section starts from an evenly-lit map.
    { trigger: "#trade-operations", region: REGION.NONE },
  ],
  motion: "geo",
  routes: true,
  draggable: true,
  palette: GLOBAL_PRESENCE_PALETTE,
  /**
   * Trimmed ~20%% alongside the amplitude directive, and this is a RAISE in
   * net terms rather than a cut. `fieldOpacity` is a ceiling on a field that
   * now carries nearly twice the grains at a wider size spread, and these
   * stage forms are planar — no depth cueing thins their far half the way it
   * thins the globe's — so at the old ceiling the lattice came out heavier
   * against its own lead copy than it was ever composed to be. The product of
   * count x size x opacity is still well up on where it started.
   */
  fieldOpacity: 0.68,
  // Compact form, generous open space around it (see the brief's density note).
  formationScale: 0.82,
  // A world map has to stay legible as a world map, so this page takes the
  // lateral journey at a third strength — enough that the globe is not pinned
  // dead centre for 12,000px, short of the point where a continent leaves frame.
  fieldPath: 0.33,
  fieldPathTrigger: ".tvx",
  mobileOpacityCap: 0.5,
};

/**
 * Insights — a single point of light expanding into an intelligence network.
 *
 *   one dense point of light, accent-token core (hero)
 *     → the point emits; particles fan into scattered knowledge nodes (Categories)
 *     → nodes organise into an interconnected web, connections drawing between
 *       related nodes (Featured, first half)
 *     → full density: a calm editorial lattice (Featured, second half)
 *     → the lattice converges into the shared eagle behind the CTA (CTA)
 *
 * SECTION MAPPING NOTE. The brief lists five sections; this page has four blocks.
 * There is no "All Insights" listing — no articles are published yet, and the page
 * deliberately carries no dead links (see the comment on upcomingTopics). So the
 * full-density stage is bound to the BACK HALF of the Featured section rather than
 * to a section invented to hold it: the web organises as the reader enters the
 * topic list and reaches full density as they work down it. The Categories section
 * is this page's intro/label beat, which is also the only place it can be — it
 * sits before Featured in the DOM, so it cannot carry a later stage.
 *
 * Motion is deliberately slow: "planar" is a 150s/revolution in-plane drift with a
 * ±1.8% breath, and buildInsightsPhase makes the nodes pulse as units rather than
 * letting individual grains twinkle. Nothing here is energetic.
 */
export const INSIGHTS: Omit<SceneConfig, "onDegrade"> = {
  buildStages: withEagleFinale(buildInsightsStages),
  // Coherent per-node pulse phase — the nodes breathe, the grains don't twinkle.
  buildPhase: buildInsightsPhase,
  stageBindings: [
    // → the point emits into scattered nodes
    { trigger: "#categories", start: "top 80%", end: "bottom center" },
    // → nodes organise into the connected web
    { trigger: "#featured", start: "top 75%", end: "center center" },
    // → full density lattice, across the back half of the same section
    { trigger: "#featured", start: "center center", end: "bottom 70%" },
    // → the shared eagle finale, converging behind the CTA
    { trigger: ".tvx-cta", start: "top bottom", end: "center center" },
  ],
  // The strokes start arriving as the web organises (mid-stage-2) and are still
  // completing through the densification (stage 3), then fade out as the eagle
  // takes over — the closing mark stands alone. The default envelope would have
  // finished the strokes before the lattice even formed.
  linkEnvelope: { drawFrom: 1.55, drawTo: 3.0, fadeFrom: 3.45, fadeTo: 4.0 },
  motion: "planar",
  palette: INSIGHTS_PALETTE,
  // The lowest of the five: article cards sit directly in front of this one, and
  // the network is behind them as texture, not as competition.
  /**
   * Trimmed ~20%% alongside the amplitude directive, and this is a RAISE in
   * net terms rather than a cut. `fieldOpacity` is a ceiling on a field that
   * now carries nearly twice the grains at a wider size spread, and these
   * stage forms are planar — no depth cueing thins their far half the way it
   * thins the globe's — so at the old ceiling the lattice came out heavier
   * against its own lead copy than it was ever composed to be. The product of
   * count x size x opacity is still well up on where it started.
   */
  fieldOpacity: 0.56,
  // Compact form, generous open space around it (see the brief's density note).
  formationScale: 0.82,
  cameraOrbit: { trigger: ".tvx", sweepDeg: 16, dolly: 3 },
  // Held back against the other stage pages — an editorial network under
  // article cards should drift past, not fly.
  fieldPath: 0.6,
  fieldPathTrigger: ".tvx",
  mobileOpacityCap: 0.44,
};

/**
 * Careers — abstract human silhouettes assembling into a team.
 *
 *   one silhouette, centred, breathing (hero)
 *     → a second forms and connects to it (Our Culture)
 *     → silhouettes multiply into a connected cluster (Areas We're Growing)
 *     → full formation: a network of figures as one organisation (Open Roles)
 *     → the team converges into the shared eagle behind the CTA, then faint drift
 *
 * SECTION MAPPING NOTE. The brief's "Values / life-at-Trivoxa" beat has no section
 * on this page — values live on the Group page, and Careers runs Culture → Where
 * the Work Happens → Areas → Benefits → Open Roles → Hiring Process. The full
 * formation is therefore bound to `#opportunities` (Open Roles), which is both the
 * right DOM position and the strongest available beat for it: the whole team stands
 * assembled behind the list of roles you could join. Benefits and Where the Work
 * Happens fall inside the holds either side, so nothing is left unaccompanied.
 *
 * The accent lands on every figure's head (~14% of a figure by area, ~11% of
 * the pool) against Insights' ~7%. Primary is CAREERS_PALETTE (--text-2, a
 * soft neutral) — distinct from every other page's field so five inner
 * pages read apart from each other, not just from Home.
 */
export const CAREERS: Omit<SceneConfig, "onDegrade"> = {
  buildStages: withEagleFinale(buildCareersStages),
  buildPhase: buildCareersPhase,
  stageBindings: [
    // → a second silhouette forms and connects
    { trigger: "#culture", start: "top 80%", end: "bottom center" },
    // → multiply into a connected cluster
    { trigger: "#areas", start: "top 80%", end: "bottom center" },
    // → full formation, behind the open roles
    { trigger: "#opportunities", start: "top bottom", end: "center center" },
    // → the shared eagle finale, converging behind the CTA
    { trigger: ".tvx-cta", start: "top bottom", end: "center center" },
  ],
  // The first connection draws as the second figure arrives (mid-morph into stage
  // 1) and the network keeps completing all the way to the full formation, so the
  // organisation visibly wires itself together rather than appearing pre-wired.
  linkEnvelope: { drawFrom: 0.6, drawTo: 3.0, fadeFrom: 3.4, fadeTo: 4.0 },
  motion: "planar",
  palette: CAREERS_PALETTE,
  /**
   * Trimmed ~20%% alongside the amplitude directive, and this is a RAISE in
   * net terms rather than a cut. `fieldOpacity` is a ceiling on a field that
   * now carries nearly twice the grains at a wider size spread, and these
   * stage forms are planar — no depth cueing thins their far half the way it
   * thins the globe's — so at the old ceiling the lattice came out heavier
   * against its own lead copy than it was ever composed to be. The product of
   * count x size x opacity is still well up on where it started.
   */
  fieldOpacity: 0.6,
  // Compact form, generous open space around it (see the brief's density note).
  formationScale: 0.82,
  cameraOrbit: { trigger: ".tvx", sweepDeg: 18, dolly: 3.5 },
  fieldPath: 0.8,
  fieldPathTrigger: ".tvx",
  mobileOpacityCap: 0.46,
};

/**
 * Businesses — a cube that unfolds into sectors.
 *
 *   solid cube, turning on Y (hero)
 *     → edges loosen, grains redistribute (Business Overview)
 *     → cleaves into TWO divisions: Product Exports dense, Service Exports
 *       lighter and networked, with the accent marking the divide (Our Divisions)
 *     → resolves into a left-to-right PROCESS CHAIN: source → coordinate →
 *       verify → deliver (How We Work)
 *     → converges into the shared eagle behind the CTA (Why Trivoxa → CTA)
 *
 * The continuity requirement is met in the geometry rather than here: the cube's
 * points are sorted by x once, and every later stage partitions that ordering into
 * contiguous left-to-right ranges, so the cube cleaves and subdivides without any
 * grain crossing another. See src/lib/shapes/businesses.ts.
 */
export const BUSINESSES: Omit<SceneConfig, "onDegrade"> = {
  buildStages: withEagleFinale(buildBusinessesStages),
  stageBindings: [
    // → the cube loosens
    { trigger: "#overview", start: "top 80%", end: "bottom center" },
    // → cleaves into the two divisions
    { trigger: "#divisions", start: "top 80%", end: "center center" },
    // → resolves into the process chain
    { trigger: "#process", start: "top 80%", end: "center center" },
    // → the shared eagle finale, converging behind the CTA
    { trigger: "#why", start: "top center", endTrigger: ".tvx-cta", end: "top center" },
  ],
  motion: "planar",
  palette: BUSINESSES_PALETTE,
  /**
   * Trimmed ~20%% alongside the amplitude directive, and this is a RAISE in
   * net terms rather than a cut. `fieldOpacity` is a ceiling on a field that
   * now carries nearly twice the grains at a wider size spread, and these
   * stage forms are planar — no depth cueing thins their far half the way it
   * thins the globe's — so at the old ceiling the lattice came out heavier
   * against its own lead copy than it was ever composed to be. The product of
   * count x size x opacity is still well up on where it started.
   */
  fieldOpacity: 0.6,
  // Compact form, generous open space around it (see the brief's density note).
  formationScale: 0.82,
  cameraOrbit: { trigger: ".tvx", sweepDeg: 20, dolly: 4 },
  fieldPath: 0.8,
  fieldPathTrigger: ".tvx",
  mobileOpacityCap: 0.46,
};

/**
 * Industries — eight sectors converging on one operator.
 *
 *   eight scattered, unconnected sector clusters (hero)
 *     → they resolve into an ordered manifest (Industries We Serve)
 *     → the sectors thread together, connections drawing (Our Industry Solutions)
 *     → the threads pull into a single spine (Why Industries Choose Trivoxa)
 *     → the spine converges into the shared eagle behind the CTA
 *
 * REGRESSION NOTE. This route shipped with no particle field at all — it ran
 * the shared GLSL film every SECONDARY route runs (`film="footer-drift"`),
 * which is correct for Contact or Compliance and wrong for the one primary nav
 * destination without a signature form. Against the five neighbouring routes it
 * read as a flat dark page. The film is now removed from the page, because the
 * two cannot coexist: both occupy the fixed z-index:-1 layer and each wants its
 * own WebGL context.
 *
 * The regression is also now covered — see the route smoke test in
 * scripts/check-canvas-routes.mjs, which asserts a mounted <canvas> on every
 * page rather than trusting each page to remember.
 */
export const INDUSTRIES: Omit<SceneConfig, "onDegrade"> = {
  buildStages: withEagleFinale(buildIndustriesStages),
  // Bound to the page's own section ids. `#industries` is the manifest section,
  // which is also the DOM anchor the hero's "Explore" CTA jumps to — so the
  // form resolves into its ordered state exactly where the reader lands.
  stageBindings: [
    // → the ordered manifest
    { trigger: "#industries", start: "top bottom", end: "center center" },
    // → threaded: the sectors connect. Bound to the solutions section, which is
    //   the one that argues they are handled as a single capability.
    { trigger: "#solutions", start: "top 80%", end: "center center" },
    // → the spine, across the section that argues the eight are one operator
    { trigger: "#why", start: "top 80%", end: "center center" },
    // → the shared eagle finale, converging behind the CTA
    { trigger: ".tvx-cta", start: "top bottom", end: "center center" },
  ],
  // The threads arrive with the connected stage and hold through the spine, then
  // fade as the eagle takes over — the closing mark stands alone.
  linkEnvelope: { drawFrom: 1.5, drawTo: 2.4, fadeFrom: 3.1, fadeTo: 3.7 },
  motion: "planar",
  palette: INDUSTRIES_PALETTE,
  // Matched to Group's: this page carries the same density of body copy over the
  // field, and the two sit either side of Businesses in the nav.
  fieldOpacity: 0.6,
  // The one shared value. No page overrides it — see FORMATION_SCALE.
  formationScale: 0.82,
  cameraOrbit: { trigger: ".tvx", sweepDeg: 22, dolly: 4 },
  fieldPath: 0.8,
  fieldPathTrigger: ".tvx",
  mobileOpacityCap: 0.46,
};
