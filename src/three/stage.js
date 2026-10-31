import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

// enquadramento do busto: topo da cabeça a ~17% da tela, a tela corta na cintura
const ALTURA = 1.7;
const FOV = 22;

export function createStage(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 40);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.85;

  const key = new THREE.DirectionalLight(0xfdfdff, 2.2);
  key.position.set(2.0, 3.8, 3.2);
  const rim = new THREE.DirectionalLight(0xff3a1e, 1.8);
  rim.position.set(-3.2, 1.8, -2.5);
  scene.add(key, rim, new THREE.HemisphereLight(0xffffff, 0x1f0408, 0.65));

  const view = { w: 1, h: 1, dpr: 1, visH: 1, visW: 1, dist: 1, centerY: 1, top: 1 };

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, w < 760 ? 1.75 : 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    const aspect = w / h;
    // altura visível (em metros) no plano da personagem; no retrato ela fica menor e desce para baixo do título
    const retrato = aspect < 0.8;
    const visH = retrato ? 0.86 / aspect : Math.max(0.98, 0.7 / aspect);
    const top = ALTURA + visH * (retrato ? 0.3 : 0.17);
    const centerY = top - visH / 2;
    const dist = visH / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    camera.aspect = aspect;
    camera.position.set(0, centerY, dist);
    camera.lookAt(0, centerY, 0);
    camera.updateProjectionMatrix();
    Object.assign(view, { w, h, dpr, retrato, visH, visW: visH * aspect, dist, centerY, top });
  }
  resize();

  /** y da tela (px, do topo) → y do mundo no plano z = 0 */
  const screenToWorldY = py => view.centerY + (0.5 - py / view.h) * view.visH;
  /** px de tela → metros no plano da personagem */
  const pxToWorld = px => (px / view.h) * view.visH;

  return { renderer, scene, camera, pmrem, view, resize, screenToWorldY, pxToWorld, ALTURA };
}
