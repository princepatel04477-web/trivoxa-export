import * as THREE from "three";
import { gsap } from "@/lib/gsap";
import { DURATION, EASE, STAGGER } from "@/lib/motion";
import { latLonToVec3, latLonToFlatVec3 } from "./geo-sphere";
import { canvasFont, tokenColor } from "./design-tokens";
import { TRADE_CITIES, tradeDestinations, tradeOrigin, type TradeCity } from "@/data/trade-cities";

/**
 * The trade-route overlay: one origin, a route to every destination, labels.
 *
 * Cities come from `src/data/trade-cities.ts` — the same list the homepage globe
 * renders — so the two surfaces can never drift apart. Every route departs from the
 * single origin flagged there (Surat); there is no second origin and no local list.
 *
 * Arcs are LINE GEOMETRY with an animated draw offset (never particles), drawn by
 * advancing each line's `drawRange`. The draw is scrubbed from the scroll timeline
 * via setDrawProgress, staggered so routes complete outward from the origin in
 * sequence rather than all at once, and each destination's label fades in only once
 * its own route has arrived.
 *
 * Colours and the label face come from design tokens; nothing here names a value.
 */

const ARC_SEGMENTS = 64;
const PACKET_SPEED = 0.18; // loops per second along the arc

/** Fraction of the draw window spent staggering starts; the rest is each arc's own draw. */
const DRAW_STAGGER = 0.55;

/** Label typography, in canvas px before the sprite is scaled into world units. */
const LABEL_SIZE_ORIGIN = 21;
const LABEL_SIZE_DEST = 14;

/**
 * Screen-space padding used when decluttering labels, in normalised device units.
 * Two labels closer than this on either axis are treated as colliding.
 */
const DECLUTTER_PAD_X = 0.085;
const DECLUTTER_PAD_Y = 0.038;

export interface ArcColors {
  /** Route lines. */
  route?: number;
  /** Origin hub marker + its label. */
  origin?: number;
  /** Destination markers. */
  destination?: number;
}

interface CityNode {
  city: TradeCity;
  group: THREE.Group;
  /** Pulse ring — origin only. */
  ring: THREE.Mesh | null;
  ringMaterial: THREE.MeshBasicMaterial | null;
  label: THREE.Sprite;
  labelMaterial: THREE.SpriteMaterial;
  /** Hairline from node to label, shown only when declutter offsets the label. */
  leader: THREE.Line;
  leaderMaterial: THREE.LineBasicMaterial;
  /** Local label offset applied by declutter, in world units. */
  labelOffset: THREE.Vector2;
  spherePos: THREE.Vector3;
  flatPos: THREE.Vector3;
  /** 0..1 — how far this node's own route has drawn. Drives label opacity. */
  arrived: number;
}

interface Arc {
  curve: THREE.QuadraticBezierCurve3;
  flatCurve: THREE.QuadraticBezierCurve3;
  spherePoints: THREE.Vector3[];
  flatPoints: THREE.Vector3[];
  line: THREE.Line;
  lineMaterial: THREE.LineBasicMaterial;
  packet: THREE.Mesh;
  packetMaterial: THREE.MeshBasicMaterial;
  node: CityNode;
  /** Position in the stagger order, 0..1. */
  seq: number;
}

function buildArcCurve(
  radius: number,
  from: TradeCity,
  to: TradeCity
): THREE.QuadraticBezierCurve3 {
  const a = new THREE.Vector3(...latLonToVec3(from.lat, from.lon, radius));
  const b = new THREE.Vector3(...latLonToVec3(to.lat, to.lon, radius));
  const mid = a.clone().add(b).multiplyScalar(0.5);
  // Lift the control point along the shared midpoint normal so the arc bulges off
  // the sphere rather than cutting through it.
  const lift = radius * (0.22 + a.distanceTo(b) / radius / 8);
  mid.normalize().multiplyScalar(radius + lift);
  return new THREE.QuadraticBezierCurve3(a, mid, b);
}

/** The same lane on the flat map: a shallow bow toward the camera, flight-path style. */
function buildFlatArcCurve(
  w: number,
  h: number,
  from: TradeCity,
  to: TradeCity
): THREE.QuadraticBezierCurve3 {
  const a = new THREE.Vector3(...latLonToFlatVec3(from.lat, from.lon, w, h));
  const b = new THREE.Vector3(...latLonToFlatVec3(to.lat, to.lon, w, h));
  const mid = a.clone().add(b).multiplyScalar(0.5);
  mid.z += w * 0.06 + a.distanceTo(b) * 0.15;
  return new THREE.QuadraticBezierCurve3(a, mid, b);
}

export class TradeArcs {
  group: THREE.Group;
  private arcs: Arc[] = [];
  private nodes: CityNode[] = [];
  private originNode!: CityNode;
  private clockStart = 0;
  private active = false;
  private tweens: gsap.core.Tween[] = [];
  private reducedMotion: boolean;
  private blend = 0;
  private drawProgress = 0;
  private mobile = false;
  private radius: number;
  private declutterTick = 0;

  constructor(
    radius: number,
    reducedMotion = false,
    flatWidth = radius * 3.2,
    flatHeight = radius * 1.6,
    colors: ArcColors = {},
    mobile = false
  ) {
    this.reducedMotion = reducedMotion;
    this.radius = radius;
    this.mobile = mobile;
    this.group = new THREE.Group();
    this.group.visible = false;

    const routeColor = colors.route ?? tokenColor("--route").getHex();
    const originColor = colors.origin ?? tokenColor("--gold-particle").getHex();
    const destColor = colors.destination ?? tokenColor("--text-2").getHex();

    const origin = tradeOrigin();
    const destinations = tradeDestinations();

    // Nodes for every city in the shared dataset.
    for (const city of TRADE_CITIES) {
      const node = this.buildNode(
        city,
        radius,
        flatWidth,
        flatHeight,
        city.origin ? originColor : destColor
      );
      this.nodes.push(node);
      if (city.origin) this.originNode = node;
      this.group.add(node.group);
    }

    // One arc per destination, all departing from the single origin. Ordered
    // nearest-first so the network grows outward from Surat as the draw advances.
    const ordered = [...destinations].sort(
      (a, b) =>
        new THREE.Vector3(...latLonToVec3(a.lat, a.lon, radius)).distanceTo(
          new THREE.Vector3(...latLonToVec3(origin.lat, origin.lon, radius))
        ) -
        new THREE.Vector3(...latLonToVec3(b.lat, b.lon, radius)).distanceTo(
          new THREE.Vector3(...latLonToVec3(origin.lat, origin.lon, radius))
        )
    );

    ordered.forEach((city, i) => {
      const node = this.nodes.find((n) => n.city.name === city.name)!;
      this.arcs.push(
        this.buildArc(
          buildArcCurve(radius, origin, city),
          buildFlatArcCurve(flatWidth, flatHeight, origin, city),
          routeColor,
          node,
          ordered.length > 1 ? i / (ordered.length - 1) : 0
        )
      );
    });

    this.arcs.forEach((a) => this.group.add(a.line, a.packet));
    // The origin label always sits above everything else on the map.
    this.originNode.label.renderOrder = 12;
    this.originNode.group.renderOrder = 11;
  }

  // ── construction ─────────────────────────────────────────────────────────────

  private buildNode(
    city: TradeCity,
    radius: number,
    flatWidth: number,
    flatHeight: number,
    color: number
  ): CityNode {
    const isOrigin = !!city.origin;
    const group = new THREE.Group();
    const spherePos = new THREE.Vector3(...latLonToVec3(city.lat, city.lon, radius * 1.002));
    const flatPos = new THREE.Vector3(...latLonToFlatVec3(city.lat, city.lon, flatWidth, flatHeight));
    group.position.copy(spherePos);
    group.lookAt(group.position.clone().add(spherePos.clone().normalize()));

    // The origin is the larger node; destinations are deliberately small dots.
    const dotR = radius * (isOrigin ? 0.03 : 0.017);
    const dot = new THREE.Mesh(
      new THREE.CircleGeometry(dotR, 16),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 })
    );

    // Soft pulse ring — origin only. Every route leaves from here, so it is the one
    // node that earns continuous motion.
    let ring: THREE.Mesh | null = null;
    let ringMaterial: THREE.MeshBasicMaterial | null = null;
    if (isOrigin) {
      ringMaterial = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
      });
      ring = new THREE.Mesh(new THREE.RingGeometry(dotR, dotR * 1.22, 24), ringMaterial);
      group.add(ring);
    }

    const label = this.buildLabel(city.name, isOrigin, color, radius);
    const labelMaterial = label.material as THREE.SpriteMaterial;

    // Leader hairline, node → label. Zero-length until declutter offsets the label.
    const leaderGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(),
      new THREE.Vector3(),
    ]);
    const leaderMaterial = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false,
    });
    const leader = new THREE.Line(leaderGeo, leaderMaterial);
    leader.renderOrder = 3;

    group.add(dot, label, leader);
    return {
      city,
      group,
      ring,
      ringMaterial,
      label,
      labelMaterial,
      leader,
      leaderMaterial,
      labelOffset: new THREE.Vector2(),
      spherePos,
      flatPos,
      arrived: 0,
    };
  }

  /**
   * Label sprite, drawn into a canvas texture.
   *
   * The face is the site's mono token so map labels match the rest of the site's
   * mono type; the origin is uppercased and tracked out, understated rather than
   * badged. No plate, no banner — just type.
   */
  private buildLabel(name: string, isOrigin: boolean, color: number, radius: number): THREE.Sprite {
    const dpr = 2;
    const px = isOrigin ? LABEL_SIZE_ORIGIN : LABEL_SIZE_DEST;
    const text = isOrigin ? name.toUpperCase() : name;
    const tracking = isOrigin ? 2.2 : 0.4;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const font = canvasFont("--font-mono", px, isOrigin ? 600 : 500);
    ctx.font = font;
    const glyphWidth = ctx.measureText(text).width + tracking * (text.length - 1);
    const padX = 6;
    const w = Math.ceil(glyphWidth + padX * 2);
    const h = Math.ceil(px + 10);

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.font = font;
    ctx.textBaseline = "middle";
    ctx.fillStyle = `#${new THREE.Color(color).getHexString()}`;
    // A faint shadow keeps the type legible over the particle field without
    // introducing a plate behind it.
    ctx.shadowColor = `#${tokenColor("--bg").getHexString()}`;
    ctx.shadowBlur = 4;

    let x = padX;
    for (const ch of text) {
      ctx.fillText(ch, x, h / 2 + 1);
      x += ctx.measureText(ch).width + tracking;
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        opacity: 0,
      })
    );
    const worldH = radius * (isOrigin ? 0.115 : 0.075);
    sprite.scale.set(worldH * (w / h), worldH, 1);
    sprite.center.set(0, 0.5); // anchor at the node, type reads to the right
    sprite.renderOrder = isOrigin ? 12 : 4;
    return sprite;
  }

  private buildArc(
    curve: THREE.QuadraticBezierCurve3,
    flatCurve: THREE.QuadraticBezierCurve3,
    color: number,
    node: CityNode,
    seq: number
  ): Arc {
    const spherePoints = curve.getPoints(ARC_SEGMENTS);
    const flatPoints = flatCurve.getPoints(ARC_SEGMENTS);
    const geometry = new THREE.BufferGeometry().setFromPoints(spherePoints);
    geometry.setDrawRange(0, 0);

    const lineMaterial = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      // Thin arcs on mobile, where they cross a much smaller map.
      opacity: this.mobile ? 0.45 : 0.7,
    });
    const line = new THREE.Line(geometry, lineMaterial);

    const packetMaterial = new THREE.MeshBasicMaterial({
      color: tokenColor("--gold-packet"),
      transparent: true,
      opacity: 0,
    });
    const packet = new THREE.Mesh(new THREE.SphereGeometry(this.radius * 0.018, 8, 8), packetMaterial);

    return { curve, flatCurve, spherePoints, flatPoints, line, lineMaterial, packet, packetMaterial, node, seq };
  }

  // ── driving ──────────────────────────────────────────────────────────────────

  getFlatBlend(): number {
    return this.blend;
  }

  /** Blend every arc, node and label between its sphere and flat position. */
  setFlatBlend(blend: number): void {
    this.blend = Math.min(1, Math.max(0, blend));

    for (const arc of this.arcs) {
      const posAttr = arc.line.geometry.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i <= ARC_SEGMENTS; i++) {
        const s = arc.spherePoints[i];
        const f = arc.flatPoints[i];
        posAttr.setXYZ(
          i,
          s.x + (f.x - s.x) * this.blend,
          s.y + (f.y - s.y) * this.blend,
          s.z + (f.z - s.z) * this.blend
        );
      }
      posAttr.needsUpdate = true;
    }

    for (const node of this.nodes) {
      node.group.position.lerpVectors(node.spherePos, node.flatPos, this.blend);
      const dir = node.spherePos.clone().normalize().lerp(new THREE.Vector3(0, 0, 1), this.blend).normalize();
      node.group.lookAt(node.group.position.clone().add(dir));
    }
  }

  /**
   * Scrub the route draw-in, 0..1.
   *
   * Each arc gets a staggered slice of the window so the network grows outward from
   * the origin rather than every lane appearing together, and a destination's label
   * only begins to fade in once its own route has arrived.
   */
  setDrawProgress(p: number): void {
    this.drawProgress = Math.min(1, Math.max(0, p));
    for (const arc of this.arcs) {
      const local = Math.min(
        1,
        Math.max(0, (this.drawProgress - arc.seq * DRAW_STAGGER) / (1 - DRAW_STAGGER))
      );
      const total = (arc.line.geometry.getAttribute("position") as THREE.BufferAttribute).count;
      arc.line.geometry.setDrawRange(0, Math.max(0, Math.floor(total * local)));
      arc.lineMaterial.opacity = (this.mobile ? 0.45 : 0.7) * (local > 0 ? 1 : 0);
      arc.packetMaterial.opacity = local >= 1 && !this.reducedMotion ? 0.9 : 0;
      arc.node.arrived = local;
    }
  }

  /** Reveal the overlay. The origin appears immediately — it is the source. */
  playIn(): void {
    if (this.active) return;
    this.active = true;
    this.clockStart = performance.now();
    this.group.visible = true;
    this.tweens.forEach((t) => t.kill());
    this.tweens = [];

    if (this.reducedMotion) {
      // Everything drawn and every label visible, at once. No stagger, no packets.
      this.setDrawProgress(1);
      this.nodes.forEach((n) => {
        n.group.scale.setScalar(1);
        n.labelMaterial.opacity = this.labelVisible(n) ? 1 : 0;
      });
      return;
    }

    this.nodes.forEach((node, i) => {
      node.group.scale.setScalar(node.city.origin ? 1 : 0.01);
      if (node.city.origin) return;
      this.tweens.push(
        gsap.to(node.group.scale, {
          x: 1,
          y: 1,
          z: 1,
          duration: DURATION.short,
          delay: i * STAGGER,
          ease: EASE.entry,
        })
      );
    });
  }

  playOut(): void {
    if (!this.active) return;
    this.active = false;
    this.tweens.forEach((t) => t.kill());
    this.tweens = [];

    if (this.reducedMotion) {
      this.group.visible = false;
      return;
    }
    const group = this.group;
    this.tweens.push(
      gsap.to(
        this.arcs.map((a) => a.lineMaterial),
        { opacity: 0, duration: DURATION.short, ease: EASE.exit, onComplete: () => (group.visible = false) }
      )
    );
    this.arcs.forEach((a) => this.tweens.push(gsap.to(a.packetMaterial, { opacity: 0, duration: DURATION.short, ease: EASE.exit })));
    this.nodes.forEach((n) => this.tweens.push(gsap.to(n.labelMaterial, { opacity: 0, duration: DURATION.short, ease: EASE.exit })));
  }

  /** Is this node's label shown at the current tier? */
  private labelVisible(node: CityNode): boolean {
    if (node.city.origin) return true;
    // Mobile keeps the origin and the major hubs only — fourteen labels is
    // unreadable at phone width.
    return this.mobile ? !!node.city.major : true;
  }

  /**
   * Per-frame: packet travel, origin pulse, label fades, and label decluttering.
   *
   * Declutter runs in screen space, which needs the camera, and only while the map
   * is substantially flat — on the sphere the labels are already separated by the
   * globe's own curvature and half of them are facing away. It is throttled to
   * every 6th frame because fourteen projections plus a sort is not free and the
   * layout only changes when the camera or the draw does.
   */
  update(camera?: THREE.Camera): void {
    if (!this.active) return;
    const t = (performance.now() - this.clockStart) / 1000;

    if (!this.reducedMotion) {
      for (const arc of this.arcs) {
        if (arc.node.arrived < 1) continue;
        // Pulses travel outward from the origin: u runs 0 → 1 along the arc, which
        // is built origin-first.
        const u = (((t * PACKET_SPEED + arc.seq) % 1) + 1) % 1;
        const sphereP = arc.curve.getPointAt(u);
        if (this.blend === 0) arc.packet.position.copy(sphereP);
        else arc.packet.position.lerpVectors(sphereP, arc.flatCurve.getPointAt(u), this.blend);
      }

      // Origin pulse ring.
      const ring = this.originNode.ring;
      if (ring && this.originNode.ringMaterial) {
        const cycle = (t * 0.5) % 1;
        ring.scale.setScalar(1 + cycle * 2.4);
        this.originNode.ringMaterial.opacity = Math.max(0, 0.5 * (1 - cycle));
      }
    }

    // Labels fade in with their own route's arrival.
    for (const node of this.nodes) {
      const want = this.labelVisible(node) ? (node.city.origin ? 1 : node.arrived) : 0;
      const k = this.reducedMotion ? 1 : 0.12;
      node.labelMaterial.opacity += (want - node.labelMaterial.opacity) * k;
    }

    if (camera && this.blend > 0.6 && this.declutterTick++ % 6 === 0) this.declutter(camera);
  }

  /**
   * Push overlapping labels apart in screen space.
   *
   * Sorted so the origin is placed first and always wins; each subsequent label is
   * tested against those already placed and nudged vertically if it collides,
   * alternating up and down so a dense cluster fans out rather than drifting one
   * way. A label that has been moved gets a hairline leader back to its node, so
   * the association stays unambiguous.
   */
  private declutter(camera: THREE.Camera): void {
    const placed: { x: number; y: number }[] = [];
    const ndc = new THREE.Vector3();

    const order = [...this.nodes].sort((a, b) => {
      if (a.city.origin) return -1;
      if (b.city.origin) return 1;
      // Then by arrival, so settled labels hold their position as later ones appear.
      return b.arrived - a.arrived;
    });

    for (const node of order) {
      node.labelOffset.set(0, 0);
      if (!this.labelVisible(node) || node.labelMaterial.opacity < 0.02) continue;

      node.group.getWorldPosition(ndc);
      ndc.project(camera);
      let y = ndc.y;
      let step = 0;
      // Alternate up/down in increasing increments until the slot is free.
      while (
        placed.some((p) => Math.abs(p.x - ndc.x) < DECLUTTER_PAD_X && Math.abs(p.y - y) < DECLUTTER_PAD_Y) &&
        step < 8
      ) {
        step++;
        const dir = step % 2 === 0 ? 1 : -1;
        y = ndc.y + dir * Math.ceil(step / 2) * DECLUTTER_PAD_Y;
      }
      placed.push({ x: ndc.x, y });

      // NDC delta → world offset on the node's own local axes. The sprite is
      // parented to the node group, so a local y shift is enough.
      const shift = (y - ndc.y) * this.radius * 1.4;
      node.labelOffset.set(0, shift);
      node.label.position.set(0, shift, 0);

      const moved = Math.abs(shift) > 1e-4;
      node.leaderMaterial.opacity = moved ? 0.35 * node.labelMaterial.opacity : 0;
      if (moved) {
        const pos = node.leader.geometry.getAttribute("position") as THREE.BufferAttribute;
        pos.setXYZ(0, 0, 0, 0);
        pos.setXYZ(1, 0, shift, 0);
        pos.needsUpdate = true;
      }
    }
  }

  dispose(): void {
    this.tweens.forEach((t) => t.kill());
    this.arcs.forEach((a) => {
      a.line.geometry.dispose();
      a.lineMaterial.dispose();
      a.packet.geometry.dispose();
      a.packetMaterial.dispose();
    });
    this.nodes.forEach((n) => {
      n.labelMaterial.map?.dispose();
      n.labelMaterial.dispose();
      n.leader.geometry.dispose();
      n.leaderMaterial.dispose();
      n.group.children.forEach((child) => {
        const mesh = child as THREE.Mesh;
        mesh.geometry?.dispose?.();
        const m = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(m)) m.forEach((x) => x.dispose());
        else if (m && m !== n.labelMaterial && m !== n.leaderMaterial) m.dispose();
      });
    });
  }
}
