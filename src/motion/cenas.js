import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { lightUp } from './split.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smoothstep = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
// arranca suave e segue em velocidade constante: o giro não pode frear entre os pins
const RAMPA = 0.08;
const easeInLinear = t => (t < RAMPA ? (t * t) / (2 * RAMPA) : t - RAMPA / 2) / (1 - RAMPA / 2);
const GIRO = Math.PI * 1.5;

// título que acende ao entrar e apaga ao sair, chamado a cada quadro só quando muda
function toggler(selector) {
  const els = [...document.querySelectorAll(selector)];
  let on = null;
  return cond => {
    if (cond === on) return;
    on = cond;
    els.forEach(el => lightUp(el, cond, { duration: cond ? 0.55 : 0.35, spread: cond ? 0.9 : 0.5 }));
  };
}

export function cenas({ stage, reduced }) {
  const escuro = document.querySelector('.escuro');
  const processo = document.querySelector('.processo');
  const fecho = document.querySelector('.fecho');
  const bloco = document.querySelector('.fecho__bloco');
  const fechoRow = document.querySelector('.fecho__row');
  // pins de cima para baixo, antes do Lenis
  const stRosto = ScrollTrigger.create({ trigger: '.rosto', start: 'top top', end: '+=140%', pin: true });
  const stEnt = ScrollTrigger.create({ trigger: '.entrega', start: 'top top', end: '+=230%', pin: true });

  gsap.fromTo(bloco, { '--inset': '5vw', '--raio': '28px' }, {
    '--inset': '0vw', '--raio': '0px', ease: 'none',
    scrollTrigger: { trigger: fecho, start: 'top bottom', end: 'top top', scrub: true },
  });

  const tHero = toggler('.hero__title .split');
  const tRosto = toggler('.rosto__title .split');
  const tEnt = toggler('.entrega__title .split');
  const tFecho = toggler('.fecho__title .split');
  document.querySelectorAll('.passo__nome, .fecho__title .split, .rosto__title .split, .entrega__title .split').forEach(el => {
    if (!el.querySelector('.ch')) {
      const t = el.textContent; el.textContent = '';
      for (const c of t) { const s = document.createElement('span'); s.className = 'ch'; s.textContent = c; el.append(s); }
    }
  });

  let introDone = false;

  /** estado-alvo da cena para a posição atual do scroll */
  function read(dissolveIntro) {
    const vh = window.innerHeight;
    const esc = escuro.getBoundingClientRect();
    const proc = processo.getBoundingClientRect();
    const fe = bloco.getBoundingClientRect();
    const pR = stRosto.progress;
    const pE = stEnt.progress;
    const s = {};

    if (proc.bottom > vh) {
      s.cut = esc.top >= vh ? -10 : Math.min(stage.screenToWorldY(esc.top), 6);
      // do início do pin do rosto até a Mia sumir na explosão (out termina em pE 0.7), contínuo pelo vão entre os pins
      const fimGiro = stEnt.start + (stEnt.end - stEnt.start) * 0.7;
      s.turn = -easeInLinear(clamp((stRosto.scroll() - stRosto.start) / (fimGiro - stRosto.start))) * GIRO;
      s.scatter = smoothstep(0.02, 0.24, pE);
      s.morph = smoothstep(0.16, 0.56, pE);
      s.chrome = smoothstep(0.5, 0.66, pE);
      s.out = smoothstep(0.56, 0.7, pE);
      s.spin = easeInOut(clamp((pE - 0.42) / 0.58)) * Math.PI * 2;
      s.visible = proc.top > 0;
      s.follow = clamp((esc.top - vh * 0.25) / (vh * 0.45));
      // o idle (peso numa perna, balanço) some logo no começo do scroll: a nuvem de pontos é a pose neutra
      s.vivo = clamp((esc.top - vh * 0.85) / (vh * 0.15));
      s.hatch = s.follow;
      s.dissolve = dissolveIntro;
      s.base = -10;
      s.offsetY = 0;
    } else {
      s.cut = -10; s.scatter = 0; s.morph = 0; s.chrome = 0; s.out = 1; s.spin = 0; s.turn = 0;
      s.visible = fe.top < vh;
      s.follow = 1;
      s.vivo = 1;
      s.hatch = 0.8;
      s.dissolve = 1 - smoothstep(0.05, 0.75, (vh - fe.top) / vh);
      s.offsetY = -stage.pxToWorld(fe.top);
      // o dissolve da base fica preso ao pé do bloco vermelho (espaço da personagem, já com o deslocamento);
      // no retrato ele sobe até a linha de contato, como no hero, para o texto não brigar com o corpo
      const pe = stage.view.retrato ? fechoRow.getBoundingClientRect().top : fe.bottom;
      s.base = stage.screenToWorldY(pe) + (stage.view.retrato ? 0.22 : 0.26) - s.offsetY;
    }

    if (introDone && !reduced) {
      tHero(esc.top > vh * 0.45);
      tRosto(esc.top < vh * 0.3 && pR < 0.96 && pE < 0.02);
      tEnt(pE > 0.12 && proc.top > vh * 0.45);
      tFecho(fe.top < vh * 0.55);
    }
    return s;
  }

  return { read, start: () => { introDone = true; } };
}
