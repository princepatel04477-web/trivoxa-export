// Shared GLSL for the Midnight-Navy shader backgrounds. Each fragment shader is
// composed as PRELUDE + its own `void main(){…}`. ShaderMaterial (not Raw) adds
// the precision + `position`/`uv` attributes, so we don't declare those.

/** Fullscreen-quad vertex shader — PlaneGeometry(2,2) spans clip space. */
export const VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

/** Uniforms + palette + noise/SDF helpers shared by every fragment shader. */
export const PRELUDE = /* glsl */ `
varying vec2 vUv;
uniform float uTime;         // seconds (frozen under reduced motion)
uniform float uScroll;       // 0..1 document scroll progress
uniform vec2  uResolution;   // px
uniform float uReducedMotion;// 1.0 when reduced motion

// GROUND. Mirrors --bg / --bg-elev in globals.css by hand: a shader const
// cannot read a custom property, so these two are the only hand-copied
// values left in the palette and they must be changed WITH the tokens.
// (The names are kept so every downstream shader keeps compiling; they now
// carry the neutral ground rather than the old Midnight Navy.)
const vec3 NAVY      = vec3(0.000, 0.000, 0.000); // #000000  --bg
const vec3 NAVY_ELEV = vec3(0.043, 0.043, 0.047); // #0B0B0C  --bg-elev
const vec3 GOLD      = vec3(0.788, 0.635, 0.294); // #C9A24B
const vec3 GOLD_SOFT = vec3(0.831, 0.686, 0.369); // #D4AF5E
const vec3 ROUTE     = vec3(0.561, 0.706, 0.910); // #8FB4E8

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { s += a * vnoise(p); p *= 2.02; a *= 0.5; }
  return s;
}
// distance from point p to segment a-b
float sdSeg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}
// aspect-corrected centered coords (x scaled by aspect)
vec2 aspectUv() {
  vec2 p = vUv - 0.5;
  p.x *= uResolution.x / max(1.0, uResolution.y);
  return p;
}
// navy radial ground
vec3 ground(vec2 uv, vec2 center) {
  float d = length(uv - center);
  return mix(NAVY_ELEV, NAVY, smoothstep(0.0, 0.9, d));
}
`;
