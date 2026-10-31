import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { patchFade } from './glsl.js';
import { ROSTO_FRAG_PARS, ROSTO_MAP, ROSTO_VERT, ROSTO_VERT_PARS, criarPiscadas, rostoChunks, rostoUniforms } from './rosto.js';
import { createCorpo, relaxArms } from './corpo.js';

// mia.glb é a personagem final (Tripo3D, que exporta olhando para +X); provisorio.glb só existe no desenvolvimento
const MODELOS = [
  { url: '/models/mia.glb', giro: -Math.PI / 2 },
  { url: '/models/provisorio.glb', giro: 0 },
];

function loadFirst(onProgress) {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  return MODELOS.reduce(
    (prev, m) => prev.catch(() => loader.loadAsync(m.url, e => e.total && onProgress(e.loaded / e.total)).then(g => ({ ...g, giro: m.giro }))),
    Promise.reject(new Error('início')),
  );
}

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// sorriso sem blendshape: o rig não tem ossos de rosto, então os cantos da boca e as bochechas
// são deslocados antes do skinning. Medidas no espaço do atributo position (rosto olha para +X, boca em y 0,771).
const SORRISO_PARS = /* glsl */ `
uniform float uSorriso;
vec3 sorriso(vec3 p) {
  float lado = sign(p.z);
  float frente = smoothstep(0.075, 0.1, p.x);
  vec2 dc = (p.zy - vec2(lado * 0.035, 0.7715)) / 0.012;
  vec2 db = (p.zy - vec2(lado * 0.034, 0.787)) / 0.017;
  float wc = exp(-dot(dc, dc));
  float wb = exp(-dot(db, db));
  return frente * uSorriso * (wc * vec3(-0.0016, 0.0042, lado * 0.0026) + wb * vec3(0.0012, 0.0024, lado * 0.0006));
}`;
const SORRISO = 'transformed += sorriso(position);';

const HATCH_PARS = /* glsl */ `
uniform sampler2D uTrail;
uniform vec2 uRes;
uniform float uHatch;
uniform vec3 uTinta;
varying vec3 vHN;`;

const HATCH_END = /* glsl */ `
  float light = clamp(dot(normalize(vHN), normalize(vec3(0.35, 0.55, 1.0))), 0.0, 1.0);
  float dark = 1.0 - light;
  vec2 fc = gl_FragCoord.xy;
  float wob = sin(fc.y * 0.045 + fc.x * 0.01) * 1.6;
  float l1 = abs(fract((fc.x + wob) / 4.0) - 0.5);
  float l2 = abs(fract((fc.x * 0.55 + fc.y * 0.84) / 6.0) - 0.5);
  float ink = smoothstep(0.3, 0.1, l1) * (0.5 + dark * 0.8) + smoothstep(0.22, 0.06, l2) * smoothstep(0.4, 0.75, dark);
  vec3 paper = vec3(0.975, 0.97, 0.955);
  vec3 col = mix(paper, uTinta, clamp(ink, 0.0, 1.0));
  float mask = texture2D(uTrail, fc / uRes).r;
  gl_FragColor = vec4(col, smoothstep(0.04, 0.55, mask) * uHatch);`;

export async function loadMia(stage, { onProgress, count }) {
  const gltf = await loadFirst(onProgress);
  const model = gltf.scene;
  model.rotation.y = gltf.giro;
  // grupo: o que o scroll move e gira; raiz: onde ela está andando (volta à origem quando para)
  const group = new THREE.Group();
  const raiz = new THREE.Group();
  raiz.add(model);
  group.add(raiz);
  stage.scene.add(group);

  const meshes = [];
  const bones = [];
  model.traverse(o => {
    if (o.isMesh) meshes.push(o);
    if (o.isBone) bones.push(o);
    o.frustumCulled = false;
  });
  model.updateMatrixWorld(true);
  relaxArms(bones);

  // escala para 1,70 m, pés em y = 0, centrada em x/z
  const box = new THREE.Box3().setFromObject(model, true);
  const size = box.getSize(new THREE.Vector3());
  model.scale.multiplyScalar(stage.ALTURA / size.y);
  model.updateMatrixWorld(true);
  box.setFromObject(model, true);
  const center = box.getCenter(new THREE.Vector3());
  model.position.x -= center.x;
  model.position.z -= center.z;
  model.position.y -= box.min.y;
  model.updateMatrixWorld(true);

  // uniforms do dissolve, compartilhados entre a malha e a camada de traço
  const fade = {
    uDissolve: { value: 1 },
    uBase: { value: -10 },
    uCut: { value: -10 },
    uEdge: { value: new THREE.Color('#ff3d6e') },
    uInvGroup: { value: new THREE.Matrix4() },
    uSorriso: { value: 0 },
    ...rostoUniforms(meshes.find(m => m.material.map)?.geometry ?? meshes[0].geometry),
  };
  const patched = new Set();
  for (const m of meshes) {
    for (const mat of [m.material].flat()) {
      if (patched.has(mat)) continue;
      patched.add(mat);
      // a textura do Tripo já traz luz; metal zero evita o cabelo acinzentado pelo reflexo do ambiente
      if ('metalness' in mat) { mat.metalness = 0; mat.metalnessMap = null; }
      if ('envMapIntensity' in mat) mat.envMapIntensity = 0.6;
      patchFade(mat, fade, 'mia-fade', {
        vertPars: SORRISO_PARS + ROSTO_VERT_PARS, vertBegin: `${SORRISO}\n${ROSTO_VERT}`,
        fragPars: ROSTO_FRAG_PARS, fragMap: ROSTO_MAP, fragChunks: rostoChunks,
      });
    }
  }

  const hatchU = {
    ...fade,
    uTrail: { value: null },
    uRes: { value: new THREE.Vector2(1, 1) },
    uHatch: { value: 1 },
    // sRGB direto: o traço é escrito depois da conversão de cor do three
    uTinta: { value: new THREE.Vector3(0.898, 0.078, 0.122) },
  };
  const hatchMat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });
  patchFade(hatchMat, hatchU, 'mia-hatch', {
    vertPars: `varying vec3 vHN;\n${SORRISO_PARS}`,
    vertBegin: SORRISO,
    vert: `#if defined( USE_ENVMAP ) || defined( USE_SKINNING )
      vHN = normalize(normalMatrix * objectNormal);
    #else
      vHN = normalize(normalMatrix * normal);
    #endif`,
    fragPars: HATCH_PARS,
    fragEnd: HATCH_END,
  });
  for (const m of meshes) {
    const h = m.isSkinnedMesh ? new THREE.SkinnedMesh(m.geometry, hatchMat) : new THREE.Mesh(m.geometry, hatchMat);
    if (m.isSkinnedMesh) h.bind(m.skeleton, m.bindMatrix);
    h.position.copy(m.position);
    h.quaternion.copy(m.quaternion);
    h.scale.copy(m.scale);
    h.renderOrder = 2;
    h.frustumCulled = false;
    m.parent.add(h);
  }

  // a pose atual "assada" em espaço do grupo vira a superfície da nuvem de pontos
  const v = new THREE.Vector3();
  const baked = meshes.map(m => {
    const pos = m.geometry.attributes.position;
    const arr = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      if (m.isSkinnedMesh) m.applyBoneTransform(i, v);
      v.applyMatrix4(m.matrixWorld);
      arr[i * 3] = v.x; arr[i * 3 + 1] = v.y; arr[i * 3 + 2] = v.z;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    if (m.geometry.index) g.setIndex(m.geometry.index);
    return g.index ? g.toNonIndexed() : g;
  });
  const sampler = new MeshSurfaceSampler(new THREE.Mesh(mergeGeometries(baked))).build();
  const body = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    sampler.sample(v);
    body.set([v.x, v.y, v.z], i * 3);
  }

  const corpo = createCorpo({ raiz, bones });
  const pose = corpo?.pose ?? { sorriso: 0, sobrancelha: 0 };
  const piscadas = criarPiscadas();
  const look = { x: 0, y: 0 };
  let tAnt = null, saltoAnt = 0;

  function update(s, t, pointer, trail, view) {
    const dt = tAnt === null ? 1 / 60 : Math.max(0, t - tAnt);
    tAnt = t;
    look.x += (pointer.x - look.x) * 0.06;
    look.y += (pointer.y - look.y) * 0.06;
    // sem rig (GLB estático) o corpo inteiro acompanha o cursor e balança de leve
    const solto = corpo ? 0 : s.follow;
    group.rotation.y = s.turn + solto * (look.x * 0.2 + Math.sin(t * 0.43) * 0.018);
    group.rotation.x = solto * (look.y * 0.035 + Math.sin(t * 1.3) * 0.005);
    group.position.y = s.offsetY;
    group.visible = s.visible;
    model.visible = s.cut < stage.ALTURA + 0.15 && s.dissolve < 0.999;
    group.updateMatrixWorld(true);
    fade.uInvGroup.value.copy(group.matrixWorld).invert();
    fade.uDissolve.value = s.dissolve;
    fade.uBase.value = s.base;
    fade.uCut.value = s.cut;
    hatchU.uTrail.value = trail;
    hatchU.uRes.value.set(view.w * view.dpr, view.h * view.dpr);
    hatchU.uHatch.value = s.hatch;
    fade.uSorriso.value = pose.sorriso;
    fade.uSobrancelha.value = pose.sobrancelha;
    if (!corpo) return;

    const { olhos } = corpo.update(dt, t, { camera: stage.camera, ponteiro: look, follow: s.follow, vivo: s.vivo, retrato: view.retrato });
    // salto grande do olhar costuma vir com uma piscada; olhando para baixo, a pálpebra acompanha
    if (olhos.desvio > 0.3 && saltoAnt <= 0.3 && Math.random() < 0.7) piscadas.piscar(t);
    saltoAnt = olhos.desvio;
    fade.uPisca.value = Math.max(piscadas.valor(t), clamp(-olhos.y * 1.1, 0, 0.3));
    fade.uOlhar.value.set(clamp(-olhos.x * 0.0145, -0.0065, 0.0065), clamp(olhos.y * 0.011, -0.003, 0.003));
  }

  return { group, body, pose, update, fade, corpo };
}
