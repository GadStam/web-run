// Converte a Bodoni Moda (OFL) para o JSON de fonte do Three.js, só com os glifos das letras 3D.
// Só precisa rodar se a palavra cromada mudar (outras letras além de M, I e A).
// Baixe a BodoniModa.ttf no Google Fonts para fonte/fontes/ e rode da raiz do projeto, uma vez, fora do site:
//   npm i -D opentype.js@1.3.4 && node fonte/typeface.mjs opentype.js NOVAPALAVRA
// Mesma conversão do TTFLoader do Three, que no navegador buscaria o opentype.js num CDN.
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const [otPath = 'opentype.js', palavra = 'MIA'] = process.argv.slice(2);
const opentype = (await import(otPath.startsWith('/') ? pathToFileURL(otPath).href : otPath)).default;
const GLIFOS = [...new Set(palavra.toUpperCase())].join('');

const buf = readFileSync(new URL('./fontes/BodoniModa.ttf', import.meta.url));
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
const round = Math.round;
const scale = 100000 / ((font.unitsPerEm || 2048) * 72);
const glyphs = {};
for (const ch of GLIFOS) {
  const g = font.charToGlyph(ch);
  let o = '';
  for (const c of g.path.commands) {
    const t = c.type.toLowerCase() === 'c' ? 'b' : c.type.toLowerCase();
    o += t + ' ';
    if (c.x !== undefined) o += `${round(c.x * scale)} ${round(c.y * scale)} `;
    if (c.x1 !== undefined) o += `${round(c.x1 * scale)} ${round(c.y1 * scale)} `;
    if (c.x2 !== undefined) o += `${round(c.x2 * scale)} ${round(c.y2 * scale)} `;
  }
  glyphs[ch] = { ha: round(g.advanceWidth * scale), x_min: round(g.xMin * scale), x_max: round(g.xMax * scale), o };
}
const json = {
  glyphs,
  familyName: 'Bodoni Moda',
  ascender: round(font.ascender * scale),
  descender: round(font.descender * scale),
  underlinePosition: font.tables.post.underlinePosition,
  underlineThickness: font.tables.post.underlineThickness,
  boundingBox: { xMin: font.tables.head.xMin, xMax: font.tables.head.xMax, yMin: font.tables.head.yMin, yMax: font.tables.head.yMax },
  resolution: 1000,
};
writeFileSync(new URL('../public/fonts/bodoni-mia.typeface.json', import.meta.url), JSON.stringify(json));
console.log('ok', Object.keys(glyphs).join(''));
