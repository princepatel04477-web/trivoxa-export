uwMNgbW7nkv6gaB3+J/+9YqCXxYBEBjfIRz7SwMhk3hDoZByHP9byoLnDh8YAiASfgNSFQ46dMj8tfTx51rQhZQF/te/6lVQ7OEjACLnO4ZMyiDIau+fyP0Gpaz2n2R7/pdFw3t91eKuir16pcgj93+ARB33u1ZZnQAAAABJRU5ErkJggg==",f0=`
attribute float opacity;

attribute float scale;

attribute vec3 position2;

attribute vec3 position3;

attribute vec3 position4;

// attribute vec3 color;

// attribute vec3 normal;

uniform float uIntro;

uniform float uTime;

uniform float uProgress;

uniform vec2 uCursor;


varying float vOpacity;

varying float vScale;

varying vec3 vPos;

varying vec3 vColor;

varying float vVawe;



void main()
{

  /**
    * Position
    */
  // vec4 modelPosition = modelMatrix * vec4(position * (uIntro + uProgress * 10.), 1.0);

  // float progress = uProgress + sin(uTime * 0.5) * 0.02 * smoothstep(0.,0.05,uProgress);

  float progress = uProgress * 2.999;

  float fractProgress = fract(progress);


  vec3 posA = mix(position,position2,step(1.,progress));

  posA = mix(posA,position3,step(2.,progress));

  vec3 posB = mix(position2,position3,step(1.,progress));

  posB = mix(posB,position4,step(2.,progress));


  vec3 mixedPosition = mix(posA,posB,smoothstep(0.01,0.99,fractProgress));


  vec4 wPos = modelMatrix * vec4( vec3(0), 1.0 );

  vec3 cursor = vec3(uCursor.xy,wPos.z);


  float vawe = sin(smoothstep(0.1,0.95,fractProgress) * 3.14);

  vawe *= vawe * vawe;

  vVawe = vawe;

  vec4 pos = vec4(mixedPosition * (1. + vawe * 5.), 1.0);

  // vec4 pos = vec4(mixedPosition, 1.0);

  vec4 modelPosition = modelMatrix * pos;


  
  float sinOffset = scale * 10.;

  float scaleFactor = scale * 2. - 1.;


  modelPosition.xyz += normalize(normal) * vawe * 6. * scale ;

  float intensity = (0.15 + vawe * 0.2) * scaleFactor;

  modelPosition.x += sin(uTime * scale + sinOffset) * intensity;

  modelPosition.y += cos(uTime * scale + sinOffset) * intensity;

  // modelPosition.xyz *=  (1. + progress * 5.);

  
  vec2 diff = modelPosition.xy - cursor.xy;

  float diffLength = length(diff);


  float distTpc = (1. - smoothstep(0.,4.,diffLength));

  modelPosition.xyz += normalize(vec3(diff,1.)) * distTpc * (0.5 + vawe * 1.);
// * 5. * (.3 + progress);

  
  vec4 viewPosition = viewMatrix * modelPosition;

  vec4 projectedPosition = projectionMatrix * viewPosition;

  gl_Position = projectedPosition;


  vOpacity = opacity;

  vScale = scale;

  vPos = modelPosition.xyz;

  vColor = color;

  /**
    * Size
    */
  // gl_PointSize = 5.0 * scale + 3.* sin(uTime + sinOffset) + 10. * progress;

  float size = clamp(6.0 * scale,2.,6.);

  gl_PointSize = 2.5 * (size + (sin(uTime * 5. + sinOffset) * 0.5 + 0.5) * 1.9 * scaleFactor  - 1.5 * vawe * scaleFactor) + distTpc * 12.;

}

`,d0=`
varying float vOpacity;

uniform float uOpacity;

uniform float uIntro;

uniform float uTime;

uniform vec3 uColorA;

uniform vec3 uColorB;

uniform vec3 uColorC;

uniform vec3 uColorD;

varying float vScale;

varying vec3 vPos;

varying vec3 vColor;

varying float vVawe;


float mod289(float x){
return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 mod289(vec4 x){
return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 perm(vec4 x){
return mod289(((x * 34.0) + 1.0) * x);
}


float noise(vec3 p){

    vec3 a = floor(p);

    vec3 d = p - a;

    d = d * d * (3.0 - 2.0 * d);


    vec4 b = a.xxyy + vec4(0.0, 1.0, 0.0, 1.0);

    vec4 k1 = perm(b.xyxy);

    vec4 k2 = perm(k1.xyxy + b.zzww);


    vec4 c = k2 + a.zzzz;

    vec4 k3 = perm(c);

    vec4 k4 = perm(c + 1.0);


    vec4 o1 = fract(k3 * (1.0 / 41.0));

    vec4 o2 = fract(k4 * (1.0 / 41.0));


    vec4 o3 = o2 * d.z + o1 * (1.0 - d.z);

    vec2 o4 = o3.yw * d.x + o3.xz * (1.0 - d.x);


    return o4.y * d.y + o4.x * (1.0 - d.y);

}


void main()
{

  float strength = distance(gl_PointCoord, vec2(0.5));

    strength *= 2.0;

    strength = smoothstep(0.7,0.8,1.0 - strength);

  // vec3 color = vec3(0.7,0.95,0.9);


  float pct = noise((vPos + uTime * 0.5) * 0.5) * 2. - 0.5;

  float partPct = pct * 3.;

  float i = floor(partPct);

  float f = fract(partPct);


  // vec3 color = mix(uColorA,uColorB,pct);

  vec3 color = mix(uColorD,uColorA,pct);


    // gl_FragColor = vec4(vec3(strength * vColor), vScale * vOpacity * uIntro );

    gl_FragColor = vec4(vec3(strength * color), vScale * vOpacity * uIntro );


  gl_FragColor.a *= (1. - smoothstep(1.,-3.,vPos.z) * 0.8) * (1. - vVawe * 0.3);

	gl_FragColor.a *= uOpacity;

    
}

`;
let Dn=window.innerWidth<=768;
Pt.registerPlugin(lt,is,tl,bs);
const Ef=bs.create({
smooth:1.5,speed:1,smoothTouch:.2,effects:!0}
);
Ef.scrollTo(0,!1);
const Xr=Pt.timeline(),Ql=Pt.timeline({
ease:"none",scrollTrigger:{
tri