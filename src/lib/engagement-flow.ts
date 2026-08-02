/**
 * The engagement-model schematic: a wireframe blueprint of how a project moves
 * through Trivoxa.
 *
 * Three ring nodes sit on a horizontal axis. A packet travels left to right
 * along that axis; each ring brightens and swells as the packet passes through
 * it, then settles back. The read is deliberately technical rather than
 * decorative — this section is explaining a delivery model, so the animation
 * behaves like an instrument panel, not an ornament.
 *
 * Every colour is read from a design token at construction (see design-tokens.ts).
 * Nothing in this module carries a hue of its own.
 *
 * Client-only: needs a live document for token resolution and a WebGL context.
 */

import * as THREE from "three";
import { tokenColor } from "@/lib/design-tokens";

/** Where the three nodes sit on the axis, in world units. */
const NODE_X = [-1.85, 0, 1.85] as const;

/** Half-length of the axis rule; slightly overshoots the outer rings. */
const AXIS_HALF = 2.25;

/** Seconds for the packet to travel the full axis once. */
const TRAVEL_SECONDS = 5.2;

/** How close (world units) the packet must be for a ring to read as "active". */
const ACTIVE_RADIUS = 0.55;

export interface EngagementFlow {
  domElement: HTMLCanvasElement;
  /** Re-reads the container box and updates camera + drawing buffer. */
  resize: () => void;
  dispose: () => void;
}

/** A flat wireframe circle on the XY plane, tilted back so it reads as a ring. */
function ringGeometry(radius: number, segments = 72): THREE.BufferGeometry {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(t) * radius, Math.sin(t) * radius, 0));
  }
  return new THREE.BufferGeometry().setFromPoints(points);
}

function lineGeometry(points: THREE.Vector3[]): THREE.BufferGeometry {
  return new THREE.BufferGeometry().setFromPoints(points);
}

export function createEngagementFlow(container: HTMLElement): EngagementFlow {
  // --- palette (tokens only) -------------------------------------------------
  const lineColor = tokenColor("--line");
  const ringColor = tokenColor("--gold");
  const activeColor = tokenColor("--gold-particle");
  const packetColor = tokenColor("--gold-packet");

  // --- renderer --------------------------------------------------------------
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  // Clamped: this is a small inline panel, not a hero field. Above 2x the extra
  // fragments buy nothing visible and cost real milliseconds on mobile.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearAlpha(0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0.62, 5.1);
  camera.lookAt(0, 0, 0);

  // Everything hangs off one root so the whole schematic can be tilted as a unit,
  // which is what gives the rings their elliptical, blueprint-like foreshortening.
  const root = new THREE.Group();
  root.rotation.x = -0.34;
  scene.add(root);

  // Tracked for disposal — WebGL resources are not garbage collected.
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  function trackedLineMaterial(color: THREE.Color, opacity: number): THREE.LineBasicMaterial {
    const m = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
    materials.push(m);
    return m;
  }

  // --- axis ------------------------------------------------------------------
  const axisGeo = lineGeometry([new THREE.Vector3(-AXIS_HALF, 0, 0), new THREE.Vector3(AXIS_HALF, 0, 0)]);
  geometries.push(axisGeo);
  root.add(new THREE.Line(axisGeo, trackedLineMaterial(lineColor, 0.85)));

  // --- ticks -----------------------------------------------------------------
  // Evenly spaced measurement marks, the way a schematic rules its baseline.
  const tickPoints: THREE.Vector3[] = [];
  const TICKS = 25;
  for (let i = 0; i < TICKS; i++) {
    const x = -AXIS_HALF + (i / (TICKS - 1)) * (AXIS_HALF * 2);
    // Every fifth tick is taller, so the eye can count along the axis.
    const h = i % 5 === 0 ? 0.14 : 0.07;
    tickPoints.push(new THREE.Vector3(x, -h, 0), new THREE.Vector3(x, 0, 0));
  }
  const tickGeo = lineGeometry(tickPoints);
  geometries.push(tickGeo);
  root.add(new THREE.LineSegments(tickGeo, trackedLineMaterial(lineColor, 0.6)));

  // --- node rings ------------------------------------------------------------
  // Two concentric rings per node: an outer hairline that holds the node's
  // footprint, and an inner ring that carries the pulse.
  interface NodeRing {
    outer: THREE.Line;
    inner: THREE.Line;
    outerMat: THREE.LineBasicMaterial;
    innerMat: THREE.LineBasicMaterial;
    group: THREE.Group;
    x: number;
  }

  const nodes: NodeRing[] = NODE_X.map((x) => {
    const group = new THREE.Group();
    group.position.x = x;

    const outerGeo = ringGeometry(0.52);
    const innerGeo = ringGeometry(0.3);
    geometries.push(outerGeo, innerGeo);

    const outerMat = trackedLineMaterial(ringColor, 0.55);
    const innerMat = trackedLineMaterial(ringColor, 0.32);

    const outer = new THREE.Line(outerGeo, outerMat);
    const inner = new THREE.Line(innerGeo, innerMat);
    group.add(outer, inner);
    root.add(group);

    return { outer, inner, outerMat, innerMat, group, x };
  });

  // --- packet ----------------------------------------------------------------
  // A small filled diamond riding the axis. Rendered as a 4-point line loop so
  // it stays crisp at any DPR and needs no texture.
  const packetGeo = lineGeometry([
    new THREE.Vector3(0, 0.1, 0),
    new THREE.Vector3(0.1, 0, 0),
    new THREE.Vector3(0, -0.1, 0),
    new THREE.Vector3(-0.1, 0, 0),
    new THREE.Vector3(0, 0.1, 0),
  ]);
  geometries.push(packetGeo);
  const packetMat = trackedLineMaterial(packetColor, 1);
  const packet = new THREE.Line(packetGeo, packetMat);
  root.add(packet);

  // A wake that trails the packet, so direction of travel is unambiguous.
  const wakeGeo = lineGeometry([new THREE.Vector3(-0.42, 0, 0), new THREE.Vector3(0, 0, 0)]);
  geometries.push(wakeGeo);
  const wakeMat = trackedLineMaterial(packetColor, 0.4);
  const wake = new THREE.Line(wakeGeo, wakeMat);
  root.add(wake);

  // --- sizing ----------------------------------------------------------------
  function resize() {
    const { clientWidth, clientHeight } = container;
    // A zero box (display:none, or measured before layout) would make the
    // projection matrix non-finite; skip until the element actually has one.
    if (clientWidth === 0 || clientHeight === 0) return;
    renderer.setSize(clientWidth, clientHeight, false);
    camera.aspect = clientWidth / clientHeight;
    // Narrow viewports crop the axis at a fixed FOV, so pull the camera back in
    // proportion to how far below the design aspect we are. Without this the
    // outer two rings sit outside the frustum on a phone.
    const designAspect = 3.1;
    camera.position.z = 5.1 * Math.max(1, designAspect / Math.max(camera.aspect, 0.35));
    camera.updateProjectionMatrix();
  }
  resize();

  // --- loop ------------------------------------------------------------------
  const clock = new THREE.Clock();
  let frame = 0;

  function tick() {
    frame = requestAnimationFrame(tick);
    const elapsed = clock.getElapsedTime();

    // Packet position: a sawtooth across the axis, eased so it eases out of the
    // left edge and into the right rather than running at a machine-constant rate.
    const p = (elapsed % TRAVEL_SECONDS) / TRAVEL_SECONDS;
    const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    const packetX = -AXIS_HALF + eased * AXIS_HALF * 2;

    packet.position.x = packetX;
    packet.rotation.z = elapsed * 1.6;
    wake.position.x = packetX;

    // The packet fades in and out at the extremes so the loop has no visible seam.
    const edgeFade = Math.min(1, Math.min(p, 1 - p) * 12);
    packetMat.opacity = edgeFade;
    wakeMat.opacity = edgeFade * 0.4;

    for (const node of nodes) {
      const distance = Math.abs(packetX - node.x);
      // 1 at the ring's centre, 0 outside the active radius.
      const proximity = Math.max(0, 1 - distance / ACTIVE_RADIUS);
      const pulse = proximity * proximity;

      node.outerMat.opacity = 0.55 + pulse * 0.45;
      node.innerMat.opacity = 0.32 + pulse * 0.6;
      node.outerMat.color.copy(ringColor).lerp(activeColor, pulse);
      node.innerMat.color.copy(ringColor).lerp(activeColor, pulse);

      // A gentle swell on approach; the ring "receives" the packet.
      const scale = 1 + pulse * 0.14;
      node.group.scale.setScalar(scale);
      // Slow counter-rotation keeps the rings from reading as flat stickers.
      node.group.rotation.z = elapsed * 0.16 * (node.x === 0 ? -1 : 1);
    }

    renderer.render(scene, camera);
  }
  tick();

  return {
    domElement: renderer.domElement,
    resize,
    dispose() {
      cancelAnimationFrame(frame);
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
      renderer.dispose();
      // Frees the underlying WebGL context immediately rather than waiting for
      // the GC — this panel mounts and unmounts on scroll, so contexts would
      // otherwise accumulate against the browser's hard per-page cap.
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
