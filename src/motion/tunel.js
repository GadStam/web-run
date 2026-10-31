import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { lightUp } from './split.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
/** interpolação por trechos: x nos pontos xs vira o valor correspondente em ys */
function faixa(x, xs, ys) {
  if (x <= xs[0]) return ys[0];
  for (let i = 1; i < xs.length; i++) {
    if (x <= xs[i]) return lerp(ys[i - 1], ys[i], (x - xs[i - 1]) / (xs[i] - xs[i - 1]));
  }
  return ys[ys.length - 1];
}

const JANELA = 0.55; // fatia da viagem que cada carta leva do fundo até passar pela câmera

/** seção 4: as cartas saem do fundo em espiral (ângulo áureo) e atravessam a tela com o scroll */
export function tunel({ reduced }) {
  const sec = document.querySelector('.processo');
  const centro = sec.querySelector('.tunel__centro');
  const dica = sec.querySelector('.tunel__dica');
  const passos = [...sec.querySelectorAll('.passo')];
  const cartas = [...sec.querySelectorAll('.tunel__card')].map((el, i) => {
    const a = i * 137.5 * (Math.PI / 180);
    return {
      el, i,
      cos: Math.cos(a), sin: Math.sin(a),
      rx: 0.28 + (i % 3) * 0.08,
      ry: 0.26 + (i % 2) * 0.09,
      rz: (i % 2 === 0 ? 1 : -1) * (3 + (i % 5) * 2),
    };
  });
  const n = cartas.length;

  const prog = { alvo: 0, v: 0 };
  ScrollTrigger.create({
    trigger: sec, start: 'top top', end: 'bottom bottom',
    onUpdate: st => { prog.alvo = st.progress; },
  });
  const vis = ScrollTrigger.create({ trigger: sec, start: 'top bottom', end: 'bottom top' });

  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  if (!reduced) {
    window.addEventListener('pointermove', e => {
      mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
  }

  let ativo = -2;
  function acender(idx) {
    if (idx === ativo) return;
    passos.forEach((p, i) => {
      const on = i === idx;
      p.classList.toggle('is-on', on);
      if (!reduced) lightUp(p.querySelector('.passo__nome'), on, { duration: on ? 0.55 : 0.3, spread: on ? 0.8 : 0.4 });
    });
    ativo = idx;
  }

  gsap.ticker.add(() => {
    if (!vis.isActive) return;
    prog.v += (prog.alvo - prog.v) * 0.09;
    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;
    const v = prog.v;
    const w = window.innerWidth, h = window.innerHeight;
    const mobile = w < 768;
    const longe = mobile ? -1200 : -1700, perto = mobile ? 350 : 500;
    const pan = mobile ? 20 : 45;
    const abre = mobile ? 1.35 : 1;

    for (const c of cartas) {
      const ini = (c.i / n) * (1 - JANELA);
      const t = clamp((v - ini) / JANELA);
      const x = c.cos * w * c.rx * abre - mouse.x * pan;
      const y = c.sin * h * c.ry - mouse.y * pan;
      c.el.style.opacity = faixa(t, [0, 0.18, 0.82, 0.98], [0, 1, 1, 0]);
      c.el.style.transform = `translate3d(calc(-50% + ${x.toFixed(1)}px), calc(-50% + ${y.toFixed(1)}px), ${lerp(longe, perto, t).toFixed(1)}px) rotateZ(${c.rz}deg)`;
    }

    centro.style.transform = `scale(${faixa(v, [0, 0.5, 1], [0.8, 1, 1.25])})`;
    centro.style.opacity = faixa(v, [0, 0.9, 1], [1, 1, 0]);
    dica.style.opacity = faixa(v, [0, 0.1], [1, 0]);

    const r = sec.getBoundingClientRect();
    const dentro = r.top < h * 0.35 && r.bottom > h * 0.5;
    acender(dentro ? Math.min(2, Math.floor(v * 3)) : -1);
  });
}
