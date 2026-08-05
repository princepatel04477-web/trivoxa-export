# Mechanic Spec — WebGL Particle Field (morph, camera, cursor)

- **Interaction model:** scroll-driven (morph + camera) · pointer-driven (parallax + repulsion) · time-driven (idle wobble)
- **Evidence:** `source/app.shaders.js` (full vertex + fragment source), `source/app.main.js`
- **Screenshots:** `desktop-01-hero.png` (rocket), `desktop-05-expertise.png` (terra)

This answers open questions **1, 4 and 5** in `EXTRACTION_BRIEF.md`.

---

## 1. Two independent point systems

| | Ambient field | Morph cloud |
|---|---|---|
| Count | **700** | **30,000** desktop / **15,000** ≤768px |
| Source | random in a 20³ cube | `MeshSurfaceSampler` over 4 GLTFs |
| Attributes | position, normal, opacity, color, scale | position, position2, position3, position4, normal, opacity, color, scale |
| Motion | one full rotation over the page | morph + wave + cursor repulsion |
| Shader | same `vertexShader` / `fragmentShader` pair | same pair |

Both use `blending: AdditiveBlending`, `depthWrite: false`, `depthTest: true`,
`transparent: true`, `vertexColors: true`.

Ambient rotation:
```js
gsap.to(ambient.rotation, { y: Math.PI*2, x: Math.PI*2,
  scrollTrigger: { trigger: document.body, scrub: 1,
                   start: "top top", end: "bottom bottom" } })
```

---

## 2. The morph — order, and it is continuous

**Load order ≠ morph order.** The config array is declared in one order and assigned to buffer
attributes in another. Getting this wrong swaps the sequence.

```js
// config array v0[]
v0[0] = rocket_v2      v0[1] = astronauta_v5    v0[2] = terra    v0[3] = satellite_v2

// attribute assignment
position  = sample(v0[0])   // rocket
position2 = sample(v0[3])   // satellite
position3 = sample(v0[2])   // terra
position4 = sample(v0[1])   // astronaut
```

### → Visible sequence: **rocket → satellite → terra → astronaut**

Confirmed against captures: hero shows the rocket; the expertise section shows the globe (terra).

| Stage | Model | `mainSamplerIndex` | rotation (×π) | translate | scale |
|---|---|---|---|---|---|
| 1 | `rocket_v2.gltf` | 0 | `(.5, .85, -.75)` | `(4, 0, 0)` | 1.1 |
| 2 | `satellite_v2.gltf` | 1 | `(.2, .3, .3)` | `(3, -1, 1)` | 0.95 |
| 3 | `terra.gltf` | 0, `single: true` | `(-.65, -.3, .1)` | `(3, 1, 0)` | 2 (1.5 mobile) |
| 4 | `astronauta_v5.gltf` | 4 | `(0, .1, -.05)` | `(0, 0, 0)` | 1.1 |

Geometry is pre-scaled by `0.01 × scale` and pre-rotated at sample time, not at render time.

### Sampling distribution

```js
const per   = Math.floor(0.7 * count / (meshes.length - 1))   // 70% split across secondary meshes
const main  = count - per * (meshes.length - 1)               // remainder → mainSamplerIndex mesh
```

So the mesh named by `mainSamplerIndex` gets the **largest share** of points — it is the
silhouette-defining part. `single: true` (terra) bypasses this and samples one mesh with all points.

`position` is additionally **shuffled** (Fisher–Yates, `FE()`) before assignment, so the
point→point correspondence across morph targets is random rather than index-ordered. That is what
makes the transition read as a swarm rather than a mesh slide.

### Driver — one continuous scrub, not discrete beats

```js
gsap.to(uniforms.uProgress, { value: 1, ease: "linear",
  scrollTrigger: { trigger: "#content", scrub: 1, start: "top top",
                   end: () => `+=${innerHeight * (isMobile ? 1.3 : 1.5) * 6}px` } })
```

**8100px of scroll at 1440×900** (900 × 1.5 × 6). `#content` is 8803px tall, so the morph
completes just before the content ends.

In the vertex shader:

```glsl
float progress      = uProgress * 2.999;     // 3 legs
float fractProgress = fract(progress);

vec3 posA = mix(position,  position2, step(1., progress));
     posA = mix(posA,      position3, step(2., progress));
vec3 posB = mix(position2, position3, step(1., progress));
     posB = mix(posB,      position4, step(2., progress));

vec3 mixedPosition = mix(posA, posB, smoothstep(0.01, 0.99, fractProgress));
```

Continuous, but **eased per leg** by `smoothstep(0.01, 0.99, …)` — each of the 3 legs accelerates
in and decelerates out, so it reads as three distinct beats despite a linear scroll driver.
`2.999` (not `3.0`) keeps `fract()` from wrapping to 0 at the very end.

### The burst

```glsl
float vawe = sin(smoothstep(0.1, 0.95, fractProgress) * 3.14);
vawe *= vawe * vawe;                                    // cubed → sharp peak
vec4 pos = vec4(mixedPosition * (1. + vawe * 5.), 1.0); // radial scale-up to 6×
modelPosition.xyz += normalize(normal) * vawe * 6. * scale;
```

At the **midpoint of every leg** the cloud explodes outward — up to 6× radial scale plus a 6-unit
push along each point's normal — then collapses back into the next shape. Peak is sharp
(`sin` cubed). This is the single most characterful part of the effect and it is invisible in any
static screenshot.

It also feeds back into size and opacity:
```glsl
gl_PointSize -= 1.5 * vawe * scaleFactor      // points thin out at peak burst
gl_FragColor.a *= (1. - vVawe * 0.3)          // and fade 30%
```

### Idle wobble

```js
morph.rotation.y = Math.sin(t * .5) * .15
morph.rotation.z = Math.sin(-t * .5) * .15
```
±0.15 rad on two axes, counter-phased, ~12.6 s period. Runs always, independent of scroll.

---

## 3. Cursor repulsion (open question #5, answered)

```glsl
vec4 wPos   = modelMatrix * vec4(vec3(0), 1.0);
vec3 cursor = vec3(uCursor.xy, wPos.z);
vec2  diff       = modelPosition.xy - cursor.xy;
float diffLength = length(diff);
float distTpc    = 1. - smoothstep(0., 4., diffLength);      // ← radius = 4 world units

modelPosition.xyz += normalize(vec3(diff, 1.)) * distTpc * (0.5 + vawe * 1.);
gl_PointSize      += distTpc * 12.;
```

| Quantity | Value |
|---|---|
| Influence radius | **4 world units**, smoothstep falloff |
| Max displacement | **0.5** units at rest, **1.5** at burst peak |
| Max point-size gain | **+12 px** at the centre |

`uCursor` is not the raw pointer — it is the raycast hit point on an invisible 200×200 plane at
`z = 1`, lerped toward the pointer at `delta * 4`:

```js
raycaster.setFromCamera(ndc, camera)
const { point } = raycaster.intersectObject(invisiblePlane)[0] || {}
uCursor.value.lerp(new Vector2(point.x, point.y), delta * 4)
```

So the influence is a **world-space** sphere the pointer drags through the cloud, not a screen-space
circle. At the default camera distance 4 units ≈ a third of the visible field. The `+12px` size
bump is why points near the pointer bloom rather than just move.

**Practical scale:** with the camera at `z = 12` and `fov = 60`, the visible frustum height is
≈ 13.8 units, so the 4-unit radius ≈ **29% of viewport height**. Large and soft, not a tight cursor.

---

## 4. Glow sprite (desktop only)

```js
if (!isMobile) {
  const mat = new SpriteMaterial({ map: texture, transparent: true, opacity: 0.15 })
  glow = new Sprite(mat); glow.scale.setScalar(0)
}
// per frame:
glow.scale.setScalar(lerp(glow.scale.x, glowScale, delta * 10))
glow.position.lerp(new Vector3(point.x, point.y, 1), delta * 6)
```

A 15%-opacity sprite (texture is an inline base64 PNG in the bundle) trailing the pointer.
`glowScale` is **1** normally and **0** while hovering any `[data-cursor]` element — so the soft
bloom disappears exactly when the hard DOM cursor disc expands. Never created on ≤768px.

---

## 5. Camera

`PerspectiveCamera(fov 60, aspect, near .1)`, initial position `(0, 0, 60)`, pulled to `z: 12`
over 3 s during the intro.

Scroll-scrubbed waypoint timeline (`r = 1` desktop, `0.5` mobile), each leg
`duration: 1, ease: "power3.inOut"`:

```
(3,0,0) → (-4r, -2r) → (8r, 0, -3r) → (-4r, -1r, 0) → (0, -1r, -5r)
```

```js
scrollTrigger: { trigger: "#content", scrub: 1, start: "top top",
                 end: () => `+=${innerHeight * (isMobile ? 1.3 : 1.5) * 7}px` }
```

**7** viewport-multiples vs the morph's **6** — the camera keeps moving after the morph settles.
That offset is deliberate and worth preserving: the shape stops changing but the framing does not.

Plus continuous pointer parallax, every frame:
```js
camera.position.lerp(new Vector3(ndc.x * 4, ndc.y * 4, camera.position.z), delta * 4)
```
±4 units of drift — the same magnitude as the cursor repulsion radius.

`OrbitControls` is instantiated with `enableDamping: true` and `.update()` is called each frame,
but GSAP and the parallax lerp overwrite `camera.position` afterwards, so **it has no user-visible
effect**. Leftover from development. Do not port it.

---

## 6. Fragment shader — colour

```glsl
float strength = distance(gl_PointCoord, vec2(0.5)) * 2.0;
      strength = smoothstep(0.7, 0.8, 1.0 - strength);      // soft round dot

float pct = noise((vPos + uTime * 0.5) * 0.5) * 2. - 0.5;   // 3D value noise, drifting
vec3  color = mix(uColorD, uColorA, pct);                   // ← only D and A are used

gl_FragColor  = vec4(vec3(strength * color), vScale * vOpacity * uIntro);
gl_FragColor.a *= (1. - smoothstep(1., -3., vPos.z) * 0.8) * (1. - vVawe * 0.3);
gl_FragColor.a *= uOpacity;
```

Notable:

- Colour is a **noise-driven 2-stop mix**, not the per-particle `vColor` attribute. The
  `vertexColors: true` / `color` attribute is computed, passed through as `vColor`, and then
  **never read** — the line that used it is commented out in the shipped source. Six palette
  entries are assigned per-particle and four `uColor*` uniforms are declared, but only
  `uColorD` (`#4089dd` blue) and `uColorA` (`#f48c18` orange) reach the screen.
- The noise samples `vPos + uTime * 0.5`, so colour **drifts through the cloud over time**
  independently of position — this is the slow blue↔orange churn visible in the captures.
- Depth fade: `smoothstep(1., -3., vPos.z)` fades points up to 80% as they recede.
- `uIntro` multiplies alpha directly, which is how the whole field fades up during the intro.

---

## Responsive summary

| | ≥769px | ≤768px |
|---|---|---|
| Morph point count | 30,000 | 15,000 |
| `uOpacity` | 1.0 | 0.5 |
| Glow sprite | yes | not created |
| Camera travel scale `r` | 1 | 0.5 |
| Scroll multiple (morph / camera) | ×1.5 | ×1.3 |
| terra scale | 2 | 1.5 |

## Porting notes (Trivoxa)

- **The burst is the effect.** A plain A→B position mix looks inert; `sin(smoothstep(...))³`
  driving a radial scale-up is what makes the morph feel alive. Highest-value single idea here.
- Shuffling the position attribute before assignment (so correspondence is random) costs nothing
  and changes the whole character of the transition.
- Offsetting the camera timeline (×7) from the morph (×6) avoids everything resolving at once.
- Per `EXTRACTION_BRIEF.md`: adopt the **structure** (`uCursor` repulsion, 4-stop ramp as
  `uSpectrumA–D`), not the hexes. Note the target only actually uses 2 of its 4 stops — if you
  declare 4, make sure you read 4.
