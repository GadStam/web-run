// Ruído simplex 3D (Ashima Arts / Stefan Gustavson, MIT)
export const SNOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

// Dissolve por ruído (uDissolve 0 = inteira, 1 = sumiu), dissolve pela base (abaixo de uBase)
// e corte em Y (abaixo de uCut a malha some; a nuvem de pontos assume dali para baixo).
export const FADE_PARS = /* glsl */ `
${SNOISE}
uniform float uDissolve;
uniform float uBase;
uniform float uCut;
uniform vec3 uEdge;
varying vec3 vFadeObj;
varying vec3 vFadeW;`;

export const FADE_MAIN = /* glsl */ `
  float fadeN = snoise(vFadeObj * 4.2) * 0.5 + 0.5;
  fadeN = mix(fadeN, snoise(vFadeObj * 13.0) * 0.5 + 0.5, 0.28);
  float fadeD = max(uDissolve, clamp((uBase - vFadeObj.y) / 0.32, 0.0, 1.0));
  float fadeT = fadeD * 1.16 - 0.08;
  if (fadeN < fadeT) discard;
  if (vFadeW.y < uCut) discard;
  float fadeEdge = (1.0 - smoothstep(fadeT, fadeT + 0.07, fadeN)) * step(0.002, fadeD);
  float fadeCut = 1.0 - smoothstep(uCut, uCut + 0.022, vFadeW.y);
  vec3 fadeGlow = uEdge * fadeEdge * 3.2 + vec3(1.0, 0.82, 0.86) * fadeCut * 2.4;`;

export const FADE_VERT_PARS = /* glsl */ `
uniform mat4 uInvGroup;
varying vec3 vFadeObj;
varying vec3 vFadeW;`;

export const FADE_VERT = /* glsl */ `
  vec4 fadeWorld = modelMatrix * vec4(transformed, 1.0);
  vFadeW = fadeWorld.xyz;
  vFadeObj = (uInvGroup * fadeWorld).xyz;`;

/** costura o dissolve num material padrão do Three (Standard, Physical ou Basic) */
export function patchFade(material, uniforms, key, extra = {}) {
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${FADE_VERT_PARS}\n${extra.vertPars ?? ''}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${extra.vertBegin ?? ''}`)
      .replace('#include <project_vertex>', `#include <project_vertex>\n${FADE_VERT}\n${extra.vert ?? ''}`);
    let frag = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${FADE_PARS}\n${extra.fragPars ?? ''}`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\n${FADE_MAIN}`);
    if (extra.fragMap) frag = frag.replace('#include <map_fragment>', extra.fragMap);
    if (extra.fragChunks) frag = extra.fragChunks(frag);
    if (frag.includes('#include <emissivemap_fragment>')) {
      frag = frag.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += fadeGlow;');
    }
    if (extra.fragEnd) frag = frag.replace('#include <dithering_fragment>', `#include <dithering_fragment>\n${extra.fragEnd}`);
    shader.fragmentShader = frag;
  };
  material.customProgramCacheKey = () => key;
}
