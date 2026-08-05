igger:{
trigger:"#content",scrub:1,start:"top top",end:()=>`+=${
window.innerHeight*(Dn?1.3:1.5)*7}
px`}
}
),_E=document.querySelectorAll('a[href^="#"]:not(.has-dropdown a)');
_E.forEach(s=>{
s.addEventListener("click",e=>{
e.preventDefault(),Ef.scrollTo(s.hash,!0)}
)}
);
const vE=document.querySelectorAll(".has-dropdown");
vE.forEach(s=>{
const e=s.querySelector("ul"),t=s.querySelectorAll("li"),n=Pt.timeline({
paused:!0,onStart:()=>{
Pt.set(e,{
autoAlpha:1}
)}
,onReverseComplete:()=>{
Pt.set(e,{
autoAlpha:0}
)}
}
);
n.add(Pt.from(t,{
duration:.5,ease:"back",autoAlpha:0,y:-50,stagger:{
amount:.2}
}
)),Dn&&n.fromTo(e,{
backgroundColor:"rgba(0,0,0,0.)"}
,{
backgroundColor:"rgba(0,0,0,0.9)",duration:.5}
,0),t.forEach(i=>{
i.addEventListener("click",r=>{
const o=r.target;
r.preventDefault(),r.stopPropagation(),o.hash?(Ef.scrollTo(o.hash,!0),n.reverse()):n.reverse().then(()=>{
o.href&&(window.location.href=o.href)}
)}
)}
),Dn?s.addEventListener("click",()=>{
n.reversed()||!n.reversed()&&n.paused()?n.play():n.reverse()}
):(s.addEventListener("mouseenter",()=>{
n.play()}
),s.addEventListener("mouseleave",()=>{
n.reverse()}
))}
);
const xE=document.querySelectorAll(".strip");
xE.forEach(s=>{
let{
duration:e=30,direction:t}
=s.dataset;
const n=[0,-25];
t&&n.reverse();
const i={
value:1}
;
s.innerHTML+=s.innerHTML+s.innerHTML+s.innerHTML;
const r=Pt.to(s,{
keyframes:{
xPercent:n,ease:"none",easeEach:"none"}
,duration:e,repeat:-1,ease:"none"}
),o=Pt.to(i,{
value:.15,paused:!0,onUpdate:()=>{
r.timeScale(i.value)}
,ease:"power3.out",duration:.5}
);
s.addEventListener("mouseenter",()=>{
o.play()}
),s.addEventListener("mouseleave",()=>{
o.reverse()}
)}
);
const wr=[new We("#f48c18"),new We("#4089dd"),new We("#33478B"),new We("#8A5894"),new We("#DE466E"),new We("#EC9354")],Tf=new fg;
Tf.onProgress=function(s,e,t){
const n=100*e/t;
Pt.to("#counter",{
duration:1,innerText:n.toFixed(0),snap:"innerText",onComplete:n>=100?ME:()=>{
}
}
)}
;
const yE=new mw(Tf),bE=new pg(Tf),SE=bE.load(gE),Ss={
uOpacity:{
value:Dn?.5:1}
,uProgress:{
value:0}
,uIntro:{
value:0}
,uTime:{
value:0}
,uCursor:{
value:new Oe}
,uColorA:{
value:wr[0]}
,uColorB:{
value:wr[2]}
,uColorC:{
value:wr[1]}
,uColorD:{
value:wr[1]}
}
;
function ME(){
LE(v0);
const s=new is("#loader",{
type:"chars"}
);
Xr.to(s.chars,{
autoAlpha:0,duration:.8,y:200,ease:"back.in",stagger:{
amount:.5}
,onComplete:()=>{
Pt.set("#loader",{
autoAlpha:0}
)}
}
),Xr.to([Ss.uIntro,Qa.uniforms.uIntro],{
value:1,duration:3,ease:"Power4.easeOut"}
),Xr.call(OE,[{
duration:3,delay:0,z:12,ease:"Power4.easeOut"}
],.5),Pt.to(Ss.uProgress,{
value:1,ease:"linear",scrollTrigger:{
trigger:"#content",scrub:1,start:"top top",end:()=>`+=${
window.innerHeight*(Dn?1.3:1.5)*6}
px`}
,onUpdate:IE}
);
const e=new is("#main-title",{
type:"words,lines",linesClass:"overflow-hidden",wordsClass:"inline-block"}
),t=new is("#main-description",{
type:"chars,words",wordsClass:"overflow-hidden",charsClass:"inline-block"}
);
Xr.fromTo(e.words,{
y:200,rotate:15}
,{
y:0,rotate:0,duration:1,stagger:.1,ease:"Power4.easeOut",onStart:()=>{
Pt.set("#main-title",{
opacity:1}
)}
}
,1.75),Xr.fromTo(t.chars,{
y:50,rotate:15,opacity:0}
,{
y:0,rotate:0,duration:.5,opacity:1,stagger:{
amount:.5}
,ease:"Power4.easeOut",onStart:()=>{
Pt.set("#main-description",{
opacity:1}
)}
}
,2),Xr.fromTo("#main-header",{
opacity:0,y:-50}
,{
opacity:1,y:0,ease:"Power4.easeOut",duration:1}
,"<"),Xr.to("#content",{
autoAlpha:1,duration:.5}
,.5),[...document.querySelectorAll(".words-splitted")].map(o=>{
const a=o.dataset.amount||.5;
return{
splitted:new is(o,{
type:"chars,words",wordsClass:"overflow-hidden"}
),amount:a}
}
).forEach(({
splitted:o,amount:a}
)=>{
Pt.set(o.chars,{
autoAlpha:0,y:100}
),Pt.to(o.chars,{
y:0,rotate:0,autoAlpha:1,stagger:{
amount:a/2}
,ease:"power3.out",scrollTrigger:{
trigger:o.elements[0],start:`top ${
Dn?"60%":"90%"}
`,end:()=>`+=${
window.innerHeight*(Dn?1:1.5)/2}
px`}
}
)}
),Pt.to(PE.rotation,{
y:Math.PI*2,x:Math.PI*2,scrollTrigger:{
trigger:document.body,scrub:1,start:"top top",end:"bottom bottom"}
}
);
const r=Dn?.5:1;
Ql.fromTo(Li.position,{
x:3*r,y:0*r}
,{
duration:1,x:-4*r,y:-2*r,ease:"power3.inOut"}
),Ql.to(Li.position,{
duration:1,x:8*r,y:0*r,z:-3*r,ease:"power3.inOut"}
),Ql.to(Li.position,{
duration:1,x:-4*r,y:-1*r,z:0*r,ease:"power3.inOut"}
),Ql.to(Li.position,{
x:0*r,y:-1*r,z:-5*r,duration:1,ease:"power3.inOut"}
),Li.position.set(3,0,0)}
const il=new PM;
new Vh(0,15,50);
const Ih=document.getElementById("cursor");
let Oh=16,Nh=1;
const Ra=new Oe(-.85,-.45),wE=new Pc(200,200),AE=new Fc({
visible:!1}
),Df=new Tn(wE,AE);
il.add(Df);
const p0=1;
Df.position.z=p0;
const Em=new dw,qt={
width:window.innerWidth,height:window.innerHeight}
,EE=60,Oi=new yn(EE,qt.width/qt.height,.1);
Oi.position.set(0,0,60);
const Bo=new ng({
antialias:window.devicePixelRatio<2}
);
document.body.appendChild(Bo.domElement);
console.log(Bo);
const $a=new eA(Bo),m0=new pw(Oi,Bo.domElement);
m0.enableDamping=!0;
let wo;
if(!Dn){
const s=new rg({
map:SE,transparent:!0,opacity:.15}
);
wo=new RM(s),wo.scale.setScalar(0),il.add(wo)}
const Tm=new mg,TE=new tA(il,Oi);
$a.addPass(TE);
const DE={
uniforms:{
tDiffuse:{
value:null}
,uTime:{
value:0}
,uIntro:{
value:0}
,uResolution:{
value:new Oe(qt.width,qt.height)}
,uSize:{
value:300}
,dpr:{
value:Math.min(window.devicePixelRatio,2)}
,uOpacity:Ss.uOpacity}
,vertexShader:`
        varying vec2 vUv;


        void main()
        {

            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);


            vUv = uv;

        }

    `,fragmentShader:`
        uniform sampler2D tDiffuse;

				uniform float uTime;

				uniform float uIntro;

				uniform float uSize;

				uniform float dpr;

				uniform float uOpacity;

				uniform vec2 uResolution;


				float random (vec2 st) {

    			return fract(sin(dot(st.xy,
                         vec2(12.9898,78.233)))*
        									43758.5453123);

				}


        varying vec2 vUv;


        void main()
        {

						vec2 st = gl_FragCoord.xy/uResolution.xy;

						float aspect = uResolution.y / uResolution.x;

						st.y *= aspect;

						vec2 sti = st;


            vec4 color = texture2D(tDiffuse, vUv);

						
						st *= uSize;

						vec2 ipos = floor(st);
  // get the integer coords
						// vec2 fpos = fract(st);
  // get the fractional coords
						vec3 modColor = vec3(1. - smoothstep(0.1,0.3,length(ipos + vec2(0.5) - st)));


						modColor *= 1./dpr;

						modColor *= 1./dpr;

						modColor *= random( ipos * uTime );


						float tcp = max(max(color.r,color.g),color.g);

						vec2 center = vec2(0.5,0.5*aspect) * dpr;
 
            gl_FragColor.rgb = mix(color.rgb, modColor * 0.15 * (1. * (dpr * dpr) - length(center - sti)) * uIntro, 1. - smoothstep(0.,0.2,tcp) );

						gl_FragColor.a = 1.;

        }

    `}
,Qa=new vg(DE);
$a.addPass(Qa);
_0();
function g0(){
const s=Tm.getDelta(),e=Tm.getElapsedTime();
Ss.uTime.value=e,Qa.uniforms.uTime.value=e,m0.update(),$a.render(),Em.setFromCamera(Ra,Oi);
const n=Em.intersectObject(Df)[0]||{
}
,{
point:i=new Oe(0,0)}
=n;
Dn||(wo.scale.setScalar(Ku.lerp(wo.scale.x,Nh,s*10)),wo.position.lerp(new I(i.x,i.y,p0),s*6)),Oi.position.lerp(new I(Ra.x*4,Ra.y*4,Oi.position.z),s*4),Ss.uCursor.value.lerp(new Oe(i.x,i.y),s*4),Dn||Pt.set(Ih,{
width:Ku.lerp(Pt.getProperty(Ih,"width"),Oh,s*10)}
),Li&&(Li.rotation.y=Math.sin(e*.5)*.15,Li.rotation.z=Math.sin(-e*.5)*.15),Oi.updateProjectionMatrix(),requestAnimationFrame(g0)}
requestAnimationFrame(g0);
window.addEventListener("resize",_0);
function _0(){
Dn=window.innerWidth<=768,qt.width=window.innerWidth,qt.height=window.innerHeight,Oi.aspect=qt.width/qt.height,Oi.updateProjectionMatrix(),Bo.setSize(qt.width,qt.height);
const s=Math.min(window.devicePixelRatio,2);
Bo.setPixelRatio(s),$a.setSize(qt.width,qt.height),$a.setPixelRatio(s),Qa.uniforms.uResolution.value=new Oe(qt.width,qt.height);
let e=0;
qt.width<540?e=40:qt.width<768?e=80:qt.width<1020?e=120:qt.width<1400?e=200:e=300,Qa.uniforms.uSize.value=e}
function CE(s){
const e=new In,t=new Float32Array(s*3),n=new Float32Array(s*3),i=20;
for(let g=0;
g<s;
g++){
const m=Math.random()*i-i/2,p=Math.random()*i-i/2,S=Math.random()*i-i/2,x=new I(m,p,S),v=new I().randomDirection();
t.set([x.x,x.y,x.z],g*3),n.set([v.x,v.y,v.z],g*3)}
const r=new Mt(t,3);
e.setAttribute("position",r);
const o=new Mt(n,3);
e.setAttribute("normal",o);
const a=new Float32Array(s*3);
a.fill(1);
const l=new Mt(a,1);
e.setAttribute("opacity",l);
const c=new Float32Array(s*3),u=new Mt(c,3);
for(let g=0;
g<s;
g++){
const m=wr[g%wr.length],{
r:p,g:S,b:x}
=m;
c.set([p,S,x],g*3)}
e.setAttribute("color",u);
const h=new Float32Array(s*3);
for(let g=0;
g<s*3;
g++)h[g]=Math.random()*2;
const f=new Mt(h,1);
e.setAttribute("scale",f);
const d=new xi({
uniforms:{
...Ss,uProgress:{
value:0}
}
,vertexColors:!0,blending:hc,depthWrite:!1,depthTest:!0,vertexShader:f0,fragmentShader:d0,transparent:!0}
),_=new Xh(e,d);
return il.add(_),_}
const PE=CE(700),v0=[{
src:nA,mainSamplerIndex:0,rotation:new I(Math.PI*.5,Math.PI*.85,Math.PI*-.75),translate:new I(4,0,0),scale:1.1}
,{
src:Kw,mainSamplerIndex:4,rotation:new I(Math.PI*0,Math.PI*.1,Math.PI*-.05),translate:new I(0,0,0),scale:1.1}
,{
src:jw,mainSamplerIndex:0,single:!0,rotation:new I(Math.PI*-.65,Math.PI*-.3,Math.PI*.1),translate:new I(3,1,0),scale:Dn?1.5:2}
,{
src:iA,mainSamplerIndex:1,rotation:new I(Math.PI*.2,Math.PI*.3,Math.PI*.3),translate:new I(3,-1,1),scale:.95}
];
v0.forEach(s=>{
yE.load(s.src,e=>{
s.scene=e.scene}
)}
);
let Li;
function Zl(s,e){
const t=RE(s),{
mainSamplerIndex:n,single:i=!1}
=s,r=Math.floor(.7*e/(t.length-1)),o=e-r*(t.length-1),a=new Float32Array(e*3);
let l=0;
return t.filter((u,h)=>i===!1?!0:h===n).forEach(({
sampler:u}
,h)=>{
let f;
i?f=e:h===n?f=o:f=r;
for(let d=0;
d<f;
d++){
const _=new I;
u.sample(_),a.set([_.x,_.y,_.z],l*3),l++}
}
),new Mt(a,3)}
function RE({
scene:s,rotation:e,translate:t,scale:n,mainSamplerIndex:i}
){
let r=[];
return s.traverse(a=>{
a.isMesh&&a.geometry&&r.push(a)}
),r.map(a=>(a.geometry.scale(.01*n,.01*n,.01*n),a.geometry.rotateX(e.x),a.geometry.rotateY(e.y),a.geometry.rotateZ(e.z),{
sampler:new qw(a).build(),mesh:a,rotation:e,scale:n,translate:t,mainSamplerIndex:i}
))}
function LE(s){
const e=window.innerWidth>768?3e4:15e3,t=new In,n=new Float32Array(e*3);
let i=0;
for(let p=0;
p<e;
p++){
const S=new I().randomDirection();
n.set([S.x,S.y,S.z],i*3),i++}
const r=Zl(s[0],e);
FE(r),t.setAttribute("position",r);
const o=Zl(s[3],e);
t.setAttribute("position2",o);
const a=Zl(s[2],e);
t.setAttribute("position3",a);
const l=Zl(s[1],e);
t.setAttribute("position4",l);
const c=new Mt(n,3);
t.setAttribute("normal",c);
const u=new Float32Array(e*3);
u.fill(1);
const h=new Mt(u,1);
t.setAttribute("opacity",h);
const f=new Float32Array(e*3),d=new Mt(f,3);
for(let p=0;
p<e;
p++){
const S=wr[p%wr.length],{
r:x,g:v,b}
=S;
f.set([x,v,b],p*3)}
t.setAttribute("color",d);
const _=new Float32Array(e*3);
for(let p=0;
p<e*3;
p++)_[p]=Math.random();
const g=new Mt(_,1);
t.setAttribute("scale",g);
const m=new xi({
uniforms:{
...Ss}
,vertexColors:!0,blending:hc,depthWrite:!1,depthTest:!0,vertexShader:f0,fragmentShader:d0,transparent:!0}
);
Li=new Xh(t,m),il.add(Li)}
function FE(s){
const{
count:e,itemSize:t}
=s;
for(let n=e-1;
n>0;
n--){
const i=Math.floor(Math.random()*(n-1)),r=[s.getX(n),s.getY(n),s.getZ(n)],o=[s.getX(i),s.getY(i),s.getZ(i)];
s.set(o,n*t),s.set(r,i*t)}
}
function IE(){
}
function OE(s){
Pt.to(Oi.position,{
...s}
)}
window.addEventListener("mousemove",s=>{
Ra.x=2*s.clientX/window.innerWidth-1,Ra.y=-2*s.clientY/window.innerHeight+1,Dn||Pt.set(Ih,{
top:s.clientY,left:s.clientX}
)}
);
const NE=document.querySelectorAll("[data-cursor]");
NE.forEach(s=>{
s.addEventListener("mouseenter",()=>{
Oh=Pt.getProperty(s,"data-cursor"),Nh=0}
),s.addEventListener("mouseleave",()=>{
Oh=16,Nh=1}
)}
);
(function(s,e,t,n,i){
s[n]=s[n]||[],s[n].push({
"gtm.start":new Date().getTime(),event:"gtm.js"}
);
var r=e.getElementsByTagName(t)[0],o=e.createElement(t),a=n!="dataLayer"?"&l="+n:"";
o.async=!0,o.src="https://www.googletagmanager.com/gtm.js?id="+i+a,r.parentNode.insertBefore(o,r)}
)(window,document,"script","dataLayer","GTM-NB3TPR38");

