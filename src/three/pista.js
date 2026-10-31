import * as THREE from 'three';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { patchFade } from './glsl.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/** Genera la textura procedural de alta resolución para la pista de atletismo */
function createTrackCanvasTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // Base rojo tartán oscuro reglamentario con grano sintético
  ctx.fillStyle = '#C82B14';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Grano de caucho atlético
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const n = (Math.random() - 0.5) * 18;
    data[i] = Math.min(255, Math.max(0, data[i] + n));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n * 0.35));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n * 0.25));
  }
  ctx.putImageData(imgData, 0, 0);

  const numLanes = 6;
  const laneHeight = canvas.height / numLanes;

  // 7 Líneas blancas reglamentarias de los carriles
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 14;
  ctx.lineCap = 'butt';
  for (let i = 0; i <= numLanes; i++) {
    const y = i * laneHeight;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  // Marcas de salida escalonadas olímpicas (400 metros)
  ctx.fillStyle = '#FFFFFF';
  for (let lane = 0; lane < numLanes; lane++) {
    const laneY = lane * laneHeight;
    const startX = 260 + lane * 120;

    // Barra de largada de carril
    ctx.fillRect(startX, laneY + 8, 16, laneHeight - 16);

    // Número del andarivel pintado en el tartán con tipografía deportiva
    ctx.font = '900 84px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(lane + 1), startX + 110, laneY + laneHeight / 2);
  }

  // Inscripciones sobre el pavimento de la pista
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.font = '900 86px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.letterSpacing = '14px';
  ctx.fillText('SPEED RACE', 1100, 2.5 * laneHeight);

  ctx.font = '700 46px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.letterSpacing = '8px';
  ctx.fillText('CENARD 14.11', 1100, 3.5 * laneHeight);
  ctx.fillText('POSTAS 400M MIXTA', 1100, 4.3 * laneHeight);

  // Línea de llegada a cuadros al final
  const finishX = 1940;
  const sq = 16;
  for (let y = 0; y < canvas.height; y += sq) {
    for (let c = 0; c < 3; c++) {
      if ((Math.floor(y / sq) + c) % 2 === 0) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(finishX + c * sq, y, sq, sq);
      }
    }
  }
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = true;
  return texture;
}

/** Construye la geometría 3D de una auténtica curva de estadio en perspectiva */
function createStadiumTrackGeometry() {
  const segments = 100;
  const widthSegments = 20;
  const innerRadius = 1.7;
  const trackWidth = 1.35;
  const startAngle = -0.15 * Math.PI;
  const endAngle = 0.7 * Math.PI;

  const positions = [];
  const uvs = [];
  const indices = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = startAngle + t * (endAngle - startAngle);
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    for (let j = 0; j <= widthSegments; j++) {
      const u = j / widthSegments; // 0 = interior, 1 = exterior
      const r = innerRadius + u * trackWidth;

      // Geometría apoyada con perspectiva hacia la cámara
      const x = cosA * r * 0.95;
      const z = sinA * r * 0.85 - 0.25;
      const y = 0.8 - (z * 0.32) + (u * 0.08);

      positions.push(x, y, z);
      uvs.push(t, u);
    }
  }

  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < widthSegments; j++) {
      const a = i * (widthSegments + 1) + j;
      const b = (i + 1) * (widthSegments + 1) + j;
      const c = (i + 1) * (widthSegments + 1) + (j + 1);
      const d = i * (widthSegments + 1) + (j + 1);
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** Construye el cordón interior blanco reglamentario */
function createCurbGeometry() {
  const segments = 100;
  const innerRadius = 1.7;
  const startAngle = -0.15 * Math.PI;
  const endAngle = 0.7 * Math.PI;
  const curbPoints = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = startAngle + t * (endAngle - startAngle);
    const x = Math.cos(angle) * innerRadius * 0.95;
    const z = Math.sin(angle) * innerRadius * 0.85 - 0.25;
    const y = 0.8 - (z * 0.32) + 0.015;
    curbPoints.push(new THREE.Vector3(x, y, z));
  }
  const curbCurve = new THREE.CatmullRomCurve3(curbPoints);
  return new THREE.TubeGeometry(curbCurve, 80, 0.018, 8, false);
}

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
  onProgress(0.5);

  const group = new THREE.Group();
  stage.scene.add(group);

  // 1. Textura y Geometría de la pista en perspectiva de estadio
  const trackTexture = createTrackCanvasTexture();
  const trackGeo = createStadiumTrackGeometry();
  const curbGeo = createCurbGeometry();

  // Uniforms de dissolve y corte
  const fade = {
    uDissolve: { value: 1 },
    uBase: { value: -10 },
    uCut: { value: -10 },
    uEdge: { value: new THREE.Color('#FF4422') },
    uInvGroup: { value: new THREE.Matrix4() },
  };

  const trackMat = new THREE.MeshStandardMaterial({
    map: trackTexture,
    roughness: 0.55,
    metalness: 0.08,
    side: THREE.DoubleSide,
  });
  patchFade(trackMat, fade, 'track-fade');

  const curbMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.2,
    metalness: 0.85,
  });
  patchFade(curbMat, fade, 'curb-fade');

  const trackMesh = new THREE.Mesh(trackGeo, trackMat);
  trackMesh.frustumCulled = false;
  group.add(trackMesh);

  const curbMesh = new THREE.Mesh(curbGeo, curbMat);
  curbMesh.frustumCulled = false;
  group.add(curbMesh);

  // 2. Capa de grabado con el cursor (estela de energía sobre la pista)
  const hatchU = {
    ...fade,
    uTrail: { value: null },
    uRes: { value: new THREE.Vector2(1, 1) },
    uHatch: { value: 1 },
    uTinta: { value: new THREE.Vector3(0.85, 0.15, 0.08) },
  };
  const hatchMat = new THREE.MeshBasicMaterial({
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    side: THREE.DoubleSide,
  });
  patchFade(hatchMat, hatchU, 'track-hatch', {
    vertPars: 'varying vec3 vHN;',
    vert: 'vHN = normalize(normalMatrix * normal);',
    fragPars: HATCH_PARS,
    fragEnd: HATCH_END,
  });

  const hatchMesh = new THREE.Mesh(trackGeo, hatchMat);
  hatchMesh.renderOrder = 2;
  hatchMesh.frustumCulled = false;
  group.add(hatchMesh);

  // 3. Muestreo de las 30.000 partículas en la superficie de la pista
  const mergedGeo = mergeGeometries([trackGeo.clone(), curbGeo.clone()]);
  const sampler = new MeshSurfaceSampler(new THREE.Mesh(mergedGeo)).build();
  const body = new Float32Array(count * 3);
  const samplePt = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    sampler.sample(samplePt);
    body.set([samplePt.x, samplePt.y, samplePt.z], i * 3);
  }

  onProgress(1.0);

  const look = { x: 0, y: 0 };
  const pose = { sorriso: 0, sobrancelha: 0 };

  function update(s, t, pointer, trail, view) {
    look.x += (pointer.x - look.x) * 0.06;
    look.y += (pointer.y - look.y) * 0.06;

    // Inclinación e interacción suave de estadio con el cursor
    const followFactor = s.follow;
    group.rotation.y = s.turn + followFactor * (look.x * 0.18 + Math.sin(t * 0.4) * 0.012);
    group.rotation.x = followFactor * (look.y * 0.04 + Math.sin(t * 1.0) * 0.005);
    group.position.y = s.offsetY;
    group.visible = s.visible;

    trackMesh.visible = s.cut < stage.ALTURA + 0.6 && s.dissolve < 0.999;
    curbMesh.visible = trackMesh.visible;

    group.updateMatrixWorld(true);
    fade.uInvGroup.value.copy(group.matrixWorld).invert();
    fade.uDissolve.value = s.dissolve;
    fade.uBase.value = s.base;
    fade.uCut.value = s.cut;

    hatchU.uTrail.value = trail;
    hatchU.uRes.value.set(view.w * view.dpr, view.h * view.dpr);
    hatchU.uHatch.value = s.hatch;
  }

  return { group, body, pose, update, fade, corpo: null };
}
