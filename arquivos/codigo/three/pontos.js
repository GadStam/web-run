import * as THREE from 'three';

// cada ponto guarda dois lugares: na pele da Mia (espaço do grupo dela) e na superfície das letras
const VERT = /* glsl */ `
attribute vec3 aLetter;
attribute float aRand;
uniform mat4 uBodyMatrix;
uniform mat4 uLetterMatrix;
uniform float uCut;
uniform float uScatter;
uniform float uMorph;
uniform float uOut;
uniform float uSize;
uniform float uTime;
varying float vA;

void main() {
  vec3 b = (uBodyMatrix * vec4(position, 1.0)).xyz;
  vec3 l = (uLetterMatrix * vec4(aLetter, 1.0)).xyz;

  vec3 dir = normalize(vec3(sin(aRand * 91.7), 0.35 + fract(aRand * 13.3) * 1.2, cos(aRand * 57.1) * 0.8));
  float sc = uScatter * (0.3 + fract(aRand * 3.7) * 0.9);
  vec3 bs = b + dir * sc * 0.55;

  float m = smoothstep(0.0, 1.0, clamp(uMorph * 1.45 - aRand * 0.45, 0.0, 1.0));
  vec3 p = mix(bs, l, m);
  float drift = (0.004 + uScatter * 0.03) * (1.0 - m * 0.85);
  p += vec3(sin(uTime * 0.9 + aRand * 40.0), cos(uTime * 0.7 + aRand * 31.0), sin(uTime * 0.5 + aRand * 17.0)) * drift;

  vec4 mv = viewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;

  float below = smoothstep(uCut + 0.012, uCut - 0.012, b.y);
  vA = max(below, step(0.001, uScatter)) * (1.0 - uOut) * (0.45 + 0.55 * fract(aRand * 7.31));
  gl_PointSize = uSize * (0.55 + fract(aRand * 5.1) * 0.8) / -mv.z;
}`;

const FRAG = /* glsl */ `
varying float vA;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5 || vA < 0.002) discard;
  float a = smoothstep(0.5, 0.15, d) * vA;
  gl_FragColor = vec4(vec3(1.0, 0.96, 0.95) * a, a);
}`;

export function createPontos(stage, body, letters, count) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(body, 3));
  geo.setAttribute('aLetter', new THREE.BufferAttribute(letters, 3));
  const rand = new Float32Array(count);
  for (let i = 0; i < count; i++) rand[i] = Math.random();
  geo.setAttribute('aRand', new THREE.BufferAttribute(rand, 1));

  const uniforms = {
    uBodyMatrix: { value: new THREE.Matrix4() },
    uLetterMatrix: { value: new THREE.Matrix4() },
    uCut: { value: -10 },
    uScatter: { value: 0 },
    uMorph: { value: 0 },
    uOut: { value: 0 },
    uSize: { value: 5 },
    uTime: { value: 0 },
  };
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, uniforms,
    transparent: true, depthWrite: false, blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = 3;
  stage.scene.add(points);

  function update(s, t, miaGroup, letrasGroup, view) {
    points.visible = s.visible && (s.cut > -1 || s.scatter > 0) && s.out < 0.999;
    uniforms.uBodyMatrix.value.copy(miaGroup.matrixWorld);
    uniforms.uLetterMatrix.value.copy(letrasGroup.matrixWorld);
    uniforms.uCut.value = s.cut;
    uniforms.uScatter.value = s.scatter;
    uniforms.uMorph.value = s.morph;
    uniforms.uOut.value = s.out;
    uniforms.uTime.value = t;
    uniforms.uSize.value = 2.1 * view.dpr * view.dist * (view.h / 900);
  }

  return { points, update };
}
