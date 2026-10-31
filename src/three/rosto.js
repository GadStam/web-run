import { DataTexture, FloatType, NearestFilter, RGFormat, ShaderChunk, Vector2, Vector4 } from 'three';

// Expressões sem blendshape: o rig não tem ossos de rosto e os olhos são pintados na textura.
// Piscada, olhar, sobrancelha e o fundo do sorriso são feitos deslocando onde a textura é lida
// (um "liquify" no fragment shader), medido no espaço do atributo position (rosto olha para +X,
// +Z é o lado direito dela). As medidas saem de fonte/rosto.mjs; regerar o GLB pede medir de novo.

// caixa do rosto visto de frente (z, y do atributo position) e resolução do mapa de uv
const CAIXA = [-0.095, 0.735, 0.095, 0.905];
const PX = 2500;

export const ROSTO_VERT_PARS = /* glsl */ `
varying vec3 vRosto;`;

export const ROSTO_VERT = 'vRosto = position;';

export const ROSTO_FRAG_PARS = /* glsl */ `
uniform sampler2D uMapaRosto;
uniform vec4 uCaixaRosto;
uniform float uPisca;
uniform vec2 uOlhar;
uniform float uSobrancelha;
uniform float uSorriso;
varying vec3 vRosto;

// um olho: eixo do canto de dentro ao de fora, pálpebras como arcos sobre ele (lado +1 = olho direito dela)
vec2 rostoOlho(vec2 p, float lado) {
  vec2 ex = vec2(lado * 0.988, 0.153);
  vec2 ey = vec2(-lado * 0.153, 0.988);
  vec2 d = p - vec2(lado * 0.041, 0.8418);
  float u = dot(d, ex) / 0.0213;
  float cantos = 1.0 - smoothstep(0.8, 1.15, abs(u));
  if (cantos <= 0.0) return vec2(0.0);
  float w = dot(d, ey);
  float k = clamp(1.0 - u * u, 0.0, 1.0);
  float wU = 0.0095 * pow(k, 0.6);
  float wL = -0.003 * k;
  float alt = max(wU - wL, 0.002);
  float s = (w - wL) / alt;
  float src = s;
  // pálpebra de baixo sobe um pouco no sorriso e na piscada; a pele de baixo estica até ela
  float r = uSorriso * 0.13 + uPisca * 0.12;
  if (s > -0.7 && s < r) src = -0.7 + (s + 0.7) * 0.7 / (r + 0.7);
  // a de cima desce até encontrar a de baixo; a pele acima estica e o olho por trás não se mexe
  float lid = 1.0 - uPisca * (1.0 - r);
  if (s >= lid && s < 1.55) src = 1.0 + (s - lid) * 0.55 / (1.55 - lid);
  // íris anda dentro da abertura; some nos cantos para eles ficarem no lugar
  float abertura = smoothstep(-0.35, 0.1, s) * (1.0 - smoothstep(0.95, 1.3, s));
  return (ey * (src - s) * alt - uOlhar * k * k * abertura) * cantos;
}

// uv da pele em (z, y), bilinear à mão (textura float sem filtro); x < 0 marca fora do rosto
vec2 rostoUvEm(vec2 p) {
  vec2 n = vec2(textureSize(uMapaRosto, 0));
  vec2 t = (p - uCaixaRosto.xy) / (uCaixaRosto.zw - uCaixaRosto.xy) * n - 0.5;
  ivec2 i = ivec2(floor(t));
  if (i.x < 0 || i.y < 0 || i.x + 1 >= int(n.x) || i.y + 1 >= int(n.y)) return vec2(-1.0);
  vec2 f = t - floor(t);
  vec2 a = texelFetch(uMapaRosto, i, 0).rg, b = texelFetch(uMapaRosto, i + ivec2(1, 0), 0).rg;
  vec2 c = texelFetch(uMapaRosto, i + ivec2(0, 1), 0).rg, d = texelFetch(uMapaRosto, i + ivec2(1, 1), 0).rg;
  if (min(min(a.x, b.x), min(c.x, d.x)) < 0.0) return vec2(-1.0);
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

vec2 rostoDesvio(vec3 pos) {
  float frente = smoothstep(0.075, 0.1, pos.x);
  if (frente <= 0.0) return vec2(0.0);
  vec2 p = pos.zy;
  float az = abs(p.x), lado = sign(p.x);
  vec2 d = rostoOlho(p, 1.0) + rostoOlho(p, -1.0);
  // sobrancelhas sobem com a testa; a pálpebra fica e a pele entre as duas estica
  float base = 0.8565 + max(az - 0.015, 0.0) * 0.12;
  float mb = smoothstep(base - 0.009, base, p.y) * (1.0 - smoothstep(base + 0.016, base + 0.036, p.y));
  d.y -= 0.0036 * uSobrancelha * mb * (1.0 - smoothstep(0.055, 0.075, az));
  // cantos da boca e maçãs sobem junto com o sorriso da malha
  vec2 dc = (p - vec2(lado * 0.0356, 0.7717)) / 0.01;
  vec2 dm = (p - vec2(lado * 0.052, 0.812)) / 0.018;
  d -= uSorriso * (exp(-dot(dc, dc)) * vec2(lado * 0.0012, 0.0022) + exp(-dot(dm, dm)) * vec2(lado * 0.0006, 0.0022));
  return d * frente;
}`;

// troca o map_fragment: a cor vem do ponto deslocado, achado pelo mapa de uv do rosto. Um salto de uv
// muito maior que o desvio é costura entre ilhas da textura: ali o desvio é ignorado
export const ROSTO_MAP = /* glsl */ `
  vec2 rostoDuv = vec2(0.0);
  vec2 rostoD = rostoDesvio(vRosto);
  if (dot(rostoD, rostoD) > 1e-14) {
    vec2 rostoA = rostoUvEm(vRosto.zy), rostoB = rostoUvEm(vRosto.zy + rostoD);
    if (rostoA.x >= 0.0 && rostoB.x >= 0.0) rostoDuv = rostoB - rostoA;
    if (length(rostoDuv) > length(rostoD) * 3.0 + 0.0015) rostoDuv = vec2(0.0);
  }
#ifdef USE_MAP
  diffuseColor *= textureGrad(map, vMapUv + rostoDuv, dFdx(vMapUv), dFdy(vMapUv));
#endif`;

/** relevo e rugosidade leem do mesmo ponto deslocado: a pálpebra fechada não fica com o brilho do olho */
export const rostoChunks = frag => frag
  .replace('#include <roughnessmap_fragment>', ShaderChunk.roughnessmap_fragment.replace('vRoughnessMapUv', '(vRoughnessMapUv + rostoDuv)'))
  .replace('#include <normal_fragment_maps>', ShaderChunk.normal_fragment_maps.replaceAll('vNormalMapUv', '(vNormalMapUv + rostoDuv)'));

/** rasteriza a frente do rosto (a superfície mais à frente em x) num mapa (z, y) → uv */
function mapaRosto(geometry) {
  const [z0, y0, z1, y1] = CAIXA;
  const W = Math.round((z1 - z0) * PX), H = Math.round((y1 - y0) * PX);
  const data = new Float32Array(W * H * 2).fill(-1);
  const prof = new Float32Array(W * H).fill(-Infinity);
  const pos = geometry.attributes.position, uv = geometry.attributes.uv, idx = geometry.index;
  const n = idx ? idx.count : pos.count;
  const P = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], U = [[0, 0], [0, 0], [0, 0]];
  for (let t = 0; t < n; t += 3) {
    let dentro = false;
    for (let k = 0; k < 3; k++) {
      const i = idx ? idx.getX(t + k) : t + k;
      P[k][0] = (pos.getZ(i) - z0) * PX - 0.5; P[k][1] = (pos.getY(i) - y0) * PX - 0.5; P[k][2] = pos.getX(i);
      U[k][0] = uv.getX(i); U[k][1] = uv.getY(i);
      if (P[k][2] > 0.05 && P[k][0] > -2 && P[k][0] < W + 2 && P[k][1] > -2 && P[k][1] < H + 2) dentro = true;
    }
    if (!dentro) continue;
    const [a, b, c] = P;
    const d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
    if (Math.abs(d) < 1e-9) continue;
    const xa = Math.max(0, Math.ceil(Math.min(a[0], b[0], c[0]))), xb = Math.min(W - 1, Math.floor(Math.max(a[0], b[0], c[0])));
    const ya = Math.max(0, Math.ceil(Math.min(a[1], b[1], c[1]))), yb = Math.min(H - 1, Math.floor(Math.max(a[1], b[1], c[1])));
    for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) {
      const w0 = ((b[1] - c[1]) * (x - c[0]) + (c[0] - b[0]) * (y - c[1])) / d;
      const w1 = ((c[1] - a[1]) * (x - c[0]) + (a[0] - c[0]) * (y - c[1])) / d;
      const w2 = 1 - w0 - w1;
      if (w0 < -1e-4 || w1 < -1e-4 || w2 < -1e-4) continue;
      const o = y * W + x, z = w0 * a[2] + w1 * b[2] + w2 * c[2];
      if (z <= prof[o]) continue;
      prof[o] = z;
      data[o * 2] = w0 * U[0][0] + w1 * U[1][0] + w2 * U[2][0];
      data[o * 2 + 1] = w0 * U[0][1] + w1 * U[1][1] + w2 * U[2][1];
    }
  }
  const tex = new DataTexture(data, W, H, RGFormat, FloatType);
  tex.minFilter = tex.magFilter = NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

export const rostoUniforms = geometry => ({
  uMapaRosto: { value: mapaRosto(geometry) },
  uCaixaRosto: { value: new Vector4(...CAIXA) },
  uPisca: { value: 0 },
  uOlhar: { value: new Vector2() },
  uSobrancelha: { value: 0 },
});

// fecha rápido (75 ms), fica um instante e abre mais devagar
const curvaPisca = d => {
  if (d < 0 || d > 0.3) return 0;
  if (d < 0.075) { const u = d / 0.075; return u * u * (3 - 2 * u); }
  if (d < 0.105) return 1;
  const u = (d - 0.105) / 0.195;
  return 1 - u * u * (3 - 2 * u);
};

/** piscadas sozinhas a cada 2 a 6 s (às vezes duas seguidas) e junto com os giros grandes do olhar */
export function criarPiscadas() {
  let ini = -10, prox = 1.2 + Math.random() * 1.5, dupla = false;
  const piscar = t => {
    if (t - ini < 0.35) return;
    ini = t;
    if (dupla) { dupla = false; prox = t + 2 + Math.random() * 4; return; }
    dupla = Math.random() < 0.12;
    prox = t + (dupla ? 0.36 : 2 + Math.random() * 4);
  };
  return {
    piscar,
    valor(t) {
      if (t >= prox) piscar(t);
      return curvaPisca(t - ini);
    },
  };
}
