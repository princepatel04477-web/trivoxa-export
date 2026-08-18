/**
 * Shape registry for the home-page particle field.
 *
 * The scene builds only the shapes its choreography names. Home happens to
 * name all of them, so this saves nothing today — the laziness exists so a
 * second choreography can be added without every page paying to sample every
 * shape (each builder runs a MeshSurfaceSampler, and the globe additionally
 * oversamples tens of thousands of Fibonacci points through a point-in-polygon
 * test against the continent rings).
 *
 * A per-page shape vocabulary was designed and prototyped for the Group,
 * Businesses, Insights and Careers pages; it was dropped because those pages
 * already carry bespoke GLSL shader backgrounds (see ShaderBackground and
 * src/shaders), which occupy the same fixed z-index:-1 layer and already give
 * each page its own visual identity. The design work is preserved in
 * docs/research/ANIMATION_CHOREOGRAPHY.md.
 */

import { buildCargoShip, buildContainer, buildEagle, buildGlobeShape } from "./home";
import type { Shape, ShapeContext } from "./types";

export type ShapeKey = "globe" | "cargo-ship" | "container" | "eagle";

type Builder = (ctx: ShapeContext) => Shape | Promise<Shape>;

/**
 * Every shape except the globe, which produces a per-particle layer attribute
 * alongside its positions and so is built directly by the scene.
 */
const BUILDERS: Record<Exclude<ShapeKey, "globe">, Builder> = {
  "cargo-ship": buildCargoShip,
  container: buildContainer,
  eagle: buildEagle,
};

/**
 * Build the named shapes, once each, in parallel. The globe is skipped if
 * present — callers handle it via buildGlobeShape so they can bind its layer
 * attribute.
 */
export async function buildShapes(
  keys: Iterable<ShapeKey>,
  ctx: ShapeContext
): Promise<Map<ShapeKey, Shape>> {
  const wanted = [...new Set(keys)].filter((k): k is Exclude<ShapeKey, "globe"> => k !== "globe");
  const built = await Promise.all(wanted.map((key) => BUILDERS[key](ctx)));
  return new Map(wanted.map((key, i) => [key as ShapeKey, built[i]]));
}

export { buildGlobeShape };
export { buildEagleStage, withEagleFinale } from "./eagle";
export { buildBusinessesStages } from "./businesses";
export { buildGroupStages } from "./group";
export { buildInsightsStages, buildInsightsPhase } from "./insights";
export { buildCareersStages, buildCareersPhase } from "./careers";
export { buildIndustriesStages } from "./industries";
export { type Shape, type ShapeContext } from "./types";
