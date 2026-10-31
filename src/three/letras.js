import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { patchFade } from './glsl.js';

const PALAVRA = 'SPEED RACE';
const SIZE = 0.65;

// estrela de quatro pontas com os lados côncavos (o "brilho" que hoje significa IA)
function starGeometry(r) {
  const s = new THREE.Shape();
  const k = r * 0.13;
  s.moveTo(0, r);
  s.quadraticCurveTo(k, k, r, 0);
  s.quadraticCurveTo(k, -k, 0, -r);
  s.quadraticCurveTo(-k, -k, -r, 0);
  s.quadraticCurveTo(-k, k, 0, r);
  return new THREE.ExtrudeGeometry(s, { depth: 0.08, curveSegments: 16, bevelEnabled: true, bevelThickness: 0.014, bevelSize: 0.01, bevelSegments: 3 });
}

// estúdio escuro com faixas de luz brancas e vermelhas: o cromo reflete a página em vez de um cinza neutro
function chromeEnv(pmrem) {
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.SphereGeometry(12, 32, 16), new THREE.MeshBasicMaterial({ color: 0x3e3438, side: THREE.BackSide })));
  const strip = (w, h, color, k, x, y, z) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(x, y, z);
    m.lookAt(0, 0, 0);
    s.add(m);
  };
  strip(14, 3, 0xffffff, 6, 0, 7, 2);
  strip(3, 12, 0xffffff, 5, 7, 0.5, 3);
  strip(2, 12, 0xffffff, 4, -7, 0.5, -2);
  strip(3, 12, 0xff2a3d, 3, -6.5, 0, 4);
  strip(14, 4, 0xe5141f, 2.2, 0, -6, 3);
  strip(8, 6, 0xffffff, 2.2, 0, 1.5, 10);
  strip(12, 6, 0xb3101c, 1.6, 0, 1, -10);
  return pmrem.fromScene(s, 0.015).texture;
}

export async function createLetras(stage, count) {
  const json = await (await fetch(`${import.meta.env.BASE_URL}fonts/bodoni-mia.typeface.json`)).json();
  const font = new FontLoader().parse(json);

  const text = new TextGeometry(PALAVRA, {
    font, size: SIZE, depth: 0.15, curveSegments: 14,
    bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.011, bevelSegments: 4,
  });
  text.computeBoundingBox();
  const bb = text.boundingBox.clone();
  const shift = new THREE.Vector3(-(bb.min.x + bb.max.x) / 2, -(bb.min.y + bb.max.y) / 2, -0.075);
  text.translate(shift.x, shift.y, shift.z);

  const star = starGeometry(0.18);
  star.translate(0, bb.max.y + shift.y + 0.26, -0.04);

  const material = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 1, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.04,
    envMap: chromeEnv(stage.pmrem), envMapIntensity: 1.25,
  });
  const fade = {
    uDissolve: { value: 1 },
    uBase: { value: -10 },
    uCut: { value: -10 },
    uEdge: { value: new THREE.Color('#ff3d6e') },
    uInvGroup: { value: new THREE.Matrix4() },
  };
  patchFade(material, fade, 'letras-fade');

  const group = new THREE.Group();
  group.add(new THREE.Mesh(text, material), new THREE.Mesh(star, material));
  group.visible = false;
  stage.scene.add(group);

  const merged = mergeGeometries([text.clone().deleteAttribute('uv'), star.clone().deleteAttribute('uv')].map(x => {
    x.deleteAttribute('normal');
    return x;
  }));
  const sampler = new MeshSurfaceSampler(new THREE.Mesh(merged)).build();
  const targets = new Float32Array(count * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    sampler.sample(v);
    targets.set([v.x, v.y, v.z], i * 3);
  }
  const width = bb.max.x - bb.min.x;
  const height = bb.max.y - bb.min.y + 0.56;

  function layout(view) {
    const k = Math.min((view.visW * (view.w < 760 ? 0.78 : 0.5)) / width, (view.visH * 0.46) / height);
    group.scale.setScalar(k);
    group.position.set(0, view.centerY - view.visH * 0.05, 0.1);
  }

  function update(s) {
    group.visible = s.visible && (s.chrome > 0.001 || s.morph > 0.001);
    group.rotation.y = s.spin;
    group.updateMatrixWorld(true);
    fade.uInvGroup.value.copy(group.matrixWorld).invert();
    fade.uDissolve.value = 1 - s.chrome;
  }

  return { group, targets, layout, update };
}
