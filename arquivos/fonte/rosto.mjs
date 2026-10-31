// Mede o rosto da personagem para as expressões de src/three/rosto.js (e a boca de SORRISO_PARS em mia.js):
// render ortográfico de frente (eixos z, y do atributo position, câmera em +x) com a textura e grade a cada 0,01.
// Precisa de @gltf-transform/core, @gltf-transform/extensions, meshoptimizer e sharp (neste repo, já na raiz).
// uso: node rosto.mjs <glb> <saida.png> zmin zmax ymin ymax pxPorUnidade [cor|x]
//   rosto inteiro da Mia: node rosto.mjs public/models/mia.glb rosto.png -0.1 0.1 0.66 0.95 4000
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';
const [glb, out, z0, z1, y0, y1, ppu, modo = 'cor'] = process.argv.slice(2);
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(glb);
const prim = doc.getRoot().listMeshes()[0].listPrimitives()[0];
const P = prim.getAttribute('POSITION'), UV = prim.getAttribute('TEXCOORD_0');
const nP = P.getNormalized() ? 32767 : 1, nU = UV.getNormalized() ? 65535 : 1;
const pos = Float32Array.from(P.getArray(), v => Math.max(v / nP, -1));
const uv = Float32Array.from(UV.getArray(), v => v / nU);
const idx = prim.getIndices().getArray();
const tex = doc.getRoot().listMaterials()[0].getBaseColorTexture();
const { data: td, info: ti } = await sharp(Buffer.from(tex.getImage())).raw().toBuffer({ resolveWithObject: true });
const W = Math.round((z1 - z0) * ppu), H = Math.round((y1 - y0) * ppu);
const img = Buffer.alloc(W * H * 3, 240), zb = new Float32Array(W * H).fill(-1e9);
const X = i => (pos[i * 3 + 2] - z0) * ppu, Y = i => (y1 - pos[i * 3 + 1]) * ppu;
for (let t = 0; t < idx.length; t += 3) {
  const [a, b, c] = [idx[t], idx[t + 1], idx[t + 2]];
  const ax = X(a), ay = Y(a), bx = X(b), by = Y(b), cx = X(c), cy = Y(c);
  const minx = Math.max(0, Math.floor(Math.min(ax, bx, cx))), maxx = Math.min(W - 1, Math.ceil(Math.max(ax, bx, cx)));
  const miny = Math.max(0, Math.floor(Math.min(ay, by, cy))), maxy = Math.min(H - 1, Math.ceil(Math.max(ay, by, cy)));
  if (minx > maxx || miny > maxy) continue;
  const d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
  if (Math.abs(d) < 1e-12) continue;
  for (let py = miny; py <= maxy; py++) for (let px = minx; px <= maxx; px++) {
    const x = px + 0.5, y = py + 0.5;
    const w0 = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / d, w1 = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / d, w2 = 1 - w0 - w1;
    if (w0 < 0 || w1 < 0 || w2 < 0) continue;
    const depth = w0 * pos[a * 3] + w1 * pos[b * 3] + w2 * pos[c * 3];
    const k = py * W + px;
    if (depth <= zb[k]) continue;
    zb[k] = depth;
    if (modo === 'x') { const g = Math.max(0, Math.min(255, (depth - 0.0) * 1500)); img[k * 3] = img[k * 3 + 1] = img[k * 3 + 2] = g; continue; }
    const u = w0 * uv[a * 2] + w1 * uv[b * 2] + w2 * uv[c * 2], v = w0 * uv[a * 2 + 1] + w1 * uv[b * 2 + 1] + w2 * uv[c * 2 + 1];
    const tx = Math.min(ti.width - 1, Math.max(0, Math.floor(u * ti.width))), ty = Math.min(ti.height - 1, Math.max(0, Math.floor(v * ti.height)));
    const o = (ty * ti.width + tx) * ti.channels;
    img[k * 3] = td[o]; img[k * 3 + 1] = td[o + 1]; img[k * 3 + 2] = td[o + 2];
  }
}
// grade a cada 0,01
for (let gz = Math.ceil(z0 * 100); gz <= z1 * 100; gz++) { const px = Math.round((gz / 100 - z0) * ppu); for (let py = 0; py < H; py += 2) if (px < W) { const k = py * W + px; img[k * 3] = 0; img[k * 3 + 1] = gz % 5 ? 160 : 255; img[k * 3 + 2] = 255; } }
for (let gy = Math.ceil(y0 * 100); gy <= y1 * 100; gy++) { const py = Math.round((y1 - gy / 100) * ppu); for (let px = 0; px < W; px += 2) if (py < H) { const k = py * W + px; img[k * 3] = 0; img[k * 3 + 1] = gy % 5 ? 160 : 255; img[k * 3 + 2] = 255; } }
await sharp(img, { raw: { width: W, height: H, channels: 3 } }).png().toFile(out);
console.log(out, W, H, 'textura', ti.width, ti.height, 'vértices', pos.length / 3);
