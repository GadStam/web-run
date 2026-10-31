import '@fontsource/instrument-serif/400.css';
import './styles/tokens.css';
import './styles/base.css';
import './sections/loader.css';
import './sections/hero.css';
import './sections/escuro.css';
import './sections/processo.css';
import './sections/fecho.css';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { splitAll } from './motion/split.js';
import { smooth } from './motion/smooth.js';
import { createLoader } from './motion/intro.js';
import { cenas } from './motion/cenas.js';
import { tunel } from './motion/tunel.js';
import { chegada } from './motion/chegada.js';
import { createStage } from './three/stage.js';
import { loadMia } from './three/mia.js';
import { createLetras } from './three/letras.js';
import { createPontos } from './three/pontos.js';
import { createTrail } from './three/trail.js';

gsap.registerPlugin(ScrollTrigger);
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

const reduced = document.documentElement.classList.contains('rm');
const COUNT = window.innerWidth < 760 ? 16000 : 30000;

splitAll();
const loader = createLoader();
const stage = createStage(document.querySelector('.gl'));
const fonts = document.fonts.ready;

const letras = await createLetras(stage, COUNT);
const mia = await loadMia(stage, { count: COUNT, onProgress: p => loader.progress(p * 0.96) });
const pontos = createPontos(stage, mia.body, letras.targets, COUNT);
const trail = createTrail();
await fonts;
loader.progress(1);

const scenes = cenas({ stage, reduced });
tunel({ reduced });
const lenis = reduced ? null : smooth();
letras.layout(stage.view);
ScrollTrigger.refresh();

// valores que o scroll dita direto (corte e posição) e os que amortecem (giro, morph...)
const intro = { dissolve: 1 };
const cur = { ...scenes.read(1) };
const DAMP = ['turn', 'scatter', 'morph', 'chrome', 'out', 'spin', 'follow', 'vivo', 'hatch', 'dissolve', 'base'];

const pointer = { x: 0, y: 0 };
window.addEventListener('pointermove', e => {
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
}, { passive: true });

window.addEventListener('resize', () => {
  stage.resize();
  letras.layout(stage.view);
  trail.resize();
});

gsap.ticker.add(time => {
  const target = scenes.read(intro.dissolve);
  for (const k in target) {
    if (DAMP.includes(k) && Math.abs(target[k] - cur[k]) < 3) cur[k] += (target[k] - cur[k]) * 0.14;
    else cur[k] = target[k];
  }
  mia.update(cur, time, pointer, trail.texture, stage.view);
  letras.update(cur);
  pontos.update(cur, time, mia.group, letras.group, stage.view);
  trail.update(cur.hatch > 0.02 && cur.visible);
  stage.renderer.render(stage.scene, stage.camera);
});

// a chegada corre fora da timeline do loader; o scroll só solta quando ela para de andar
if (reduced || !mia.corpo) Object.assign(mia.pose, { atencao: 1, fixo: 0, sorriso: 0.3, peso: 1 });
else lenis?.stop();
loader.done(intro, { reduced })
  .add(() => scenes.start(), 1.4)
  .add(() => { if (!reduced && mia.corpo) chegada(mia.corpo, stage.view, { aoParar: () => lenis?.start() }); }, 0.55);
