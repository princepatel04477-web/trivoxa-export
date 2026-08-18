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
 * Vertical extent of a label's screen-space box, in normalised device units.
 * The HORIZONTAL extent is measured per label from its own sprite width — a
 * single pad cannot serve both "Tokyo" and "Los Angeles".
 */
const DECLUTTER_PAD_Y = 0.038;

/**
 * Extra breathing room either side of a label's measured box, in NDC. Labels
 * that merely touch still read as a collision.
 */
const DECLUTTER_GUTTER_X = 0.012;

/** How far a label trails its own marker, in ms. */
const LABEL_LAG_MS = 80;

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
  /**
   * Reveal ordinal. 0 is the origin; destinations follow in the same
   * nearest-first order the arcs draw in, so "reveal order", "draw order" and
   * "declutter priority" are one number rather than three independent notions
   * that can disagree.
   */
  order: number;
  /**
   * Label width in world units, for the screen-space box test. A fixed pad
   * cannot serve both "Tokyo" and "Los Angeles" — it is either too tight for
   * the long ones (they overlap anyway) or too loose for the short ones (they
   * get suppressed for no reason).
   */
  labelWorldW: number;
  /**
   * Set by declutter when this label has nowhere free to sit, or is on the far
   * side of the globe. Read by the fade loop, which is the only thing that
   * writes opacity — so suppression is a request, not a second writer.
   */
  suppressed: boolean;
  /** performance.now() when this node's route completed; drives the label lag. */
  arrivedAt: number;
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
      // The reveal ordinal. 1-based, because the origin is 0 — so `order` reads
      // directly as "this is the Nth city to light up".
      node.order = i + 1;
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
      // Overwritten in the constructor once the arc order is known; the origin
      // keeps 0, which is also its reveal ordinal.
      order: 0,
      labelWorldW: label.scale.x,
      suppressed: false,
      arrivedAt: 0,
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
    // Clear the arrival clocks, so a reader who scrolls back up and returns
    // gets the staggered reveal again rather than every label at once.
    this.nodes.forEach((n) => (n.arrivedAt = 0));

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
   * Declutter runs in screen space, which needs the camera, and it runs in EVERY
   * projection — sphere included.
   *
   * It used to be gated on `blend > 0.6`, on the reasoning that the globe's own
   * curvature separates the labels. It does not: the sphere projects a whole
   * hemisphere of cities into a disc, so the crowded regions crowd HARDER than
   * on the flat map — Dubai over Jeddah, Los Angeles over New York, Mombasa
   * over Durban, every load. The flat map has since been removed from the
   * choreography entirely (every geo stage holds bend 1), so that gate meant
   * the declutter never ran anywhere at all.
   *
   * Throttled to every 6th frame: fourteen projections plus a sort is not free
   * and the layout only changes when the camera or the draw does.
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

    // Labels fade in behind their own marker, and only where declutter found
    // them a free slot. This loop is the ONLY writer of label opacity.
    const now = performance.now();
    for (const node of this.nodes) {
      let want = this.labelVisible(node) && !node.suppressed ? 1 : 0;
      if (want && !node.city.origin && !this.reducedMotion) {
        // The marker lands when its route arrives; the label follows LABEL_LAG
        // later, so the eye is drawn to the point on the globe first and the
        // name confirms it. Reading them as one simultaneous event is what made
        // a scrubbed reveal still feel like a switch being thrown.
        if (node.arrived < 1) {
          node.arrivedAt = 0;
          want = 0;
        } else {
          if (!node.arrivedAt) node.arrivedAt = now;
          if (now - node.arrivedAt < LABEL_LAG_MS) want = 0;
        }
      }
      const k = this.reducedMotion ? 1 : 0.12;
      node.labelMaterial.opacity += (want - node.labelMaterial.opacity) * k;
      // A suppressed or hidden label must not leave its leader hairline behind.
      if (node.labelMaterial.opacity < 0.02) node.leaderMaterial.opacity = 0;
    }

    if (camera && this.declutterTick++ % 6 === 0) this.declutter(camera);
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
    /** Placed boxes in NDC: x spans [x0,x1], y is a band of ±DECLUTTER_PAD_Y. */
    const placed: { x0: number; x1: number; y: number }[] = [];
    const ndc = new THREE.Vector3();
    const edge = new THREE.Vector3();
    const centre = new THREE.Vector3();
    // Camera-right in world space, for measuring a label's projected width: the
    // sprite always faces the camera, so its width lies along this axis.
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);

    // The globe's centre in NDC — anything behind it is on the far hemisphere.
    this.group.getWorldPosition(centre);
    centre.project(camera);

    // Priority is the reveal ordinal: the origin first, then each city in the
    // order it lit up. A label that has held a slot keeps it as later cities
    // arrive, which is what stops the layout reshuffling under the reader.
    const order = [...this.nodes].sort((a, b) => a.order - b.order);

    for (const node of order) {
      node.labelOffset.set(0, 0);
      node.label.position.set(0, 0, 0);

      if (!this.labelVisible(node)) {
        node.suppressed = true;
        continue;
      }

      node.group.getWorldPosition(ndc);
      edge.copy(ndc).addScaledVector(right, node.labelWorldW * this.group.scale.x);
      ndc.project(camera);
      edge.project(camera);

      // Far hemisphere: the label would read through the body of the globe.
      // Nothing else culled these, which is most of why the network looked like
      // every city was shouting at once.
      if (ndc.z > centre.z) {
        node.suppressed = true;
        continue;
      }

      // The label's own measured box. `center` is (0, 0.5), so the sprite grows
      // to the RIGHT of the node — the box is [x, x + width].
      const halfW = Math.abs(edge.x - ndc.x);
      const x0 = ndc.x - DECLUTTER_GUTTER_X;
      const x1 = ndc.x + halfW + DECLUTTER_GUTTER_X;

      // Directive §5: SKIP a label whose projected box intersects one already
      // placed this frame, rather than nudging it. Nudging is what produced
      // "SURAT" sitting a centimetre above a dot it no longer appears to
      // belong to; on a sphere carrying fourteen cities there is frequently no
      // free slot within reach, and eight failed nudges still ends in an
      // overlap. A missing label is recoverable — the globe turns, and it takes
      // its slot on the next pass. An unreadable one is not.
      const clash = placed.some((p) => x0 < p.x1 && x1 > p.x0 && Math.abs(p.y - ndc.y) < DECLUTTER_PAD_Y);
      if (clash) {
        node.suppressed = true;
        continue;
      }

      placed.push({ x0, x1, y: ndc.y });
      node.suppressed = false;
      // Nothing is offset any more, so the leader hairline has nothing to draw.
      node.leaderMaterial.opacity = 0;
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
