import gsap from 'gsap';
import { lightUp } from './split.js';

// contador que acompanha o carregamento real (nunca anda mais rápido que ele)
export function createLoader() {
  const el = document.querySelector('.loader');
  const num = el.querySelector('.loader__num');
  const shown = { v: 0 };
  let real = 0;
  const tick = () => {
    const target = Math.min(real, 0.999) * 100;
    shown.v += (target - shown.v) * 0.12;
    num.textContent = String(Math.floor(shown.v)).padStart(3, '0');
  };
  gsap.ticker.add(tick);

  return {
    progress: p => { real = Math.max(real, p); },
    /** fecha a abertura: 100, o painel sobe e o título acende; a Mia entra andando (motion/chegada.js) */
    done(state, { reduced } = {}) {
      gsap.ticker.remove(tick);
      const html = document.documentElement;
      const title = document.querySelectorAll('.hero__title .split');
      state.dissolve = 0;
      if (reduced) {
        el.remove();
        return gsap.timeline();
      }
      const tl = gsap.timeline({
        onComplete: () => { el.remove(); html.classList.remove('intro-on'); },
      });
      tl.to(shown, { v: 100, duration: 0.45, ease: 'power1.out', onUpdate: () => { num.textContent = String(Math.round(shown.v)).padStart(3, '0'); } })
        .to(num, { opacity: 0, duration: 0.25 }, '+=0.1')
        .to(el, { yPercent: -100, duration: 1.1, ease: 'expo.inOut' }, '<')
        .add(() => title.forEach(t => lightUp(t, true, { duration: 0.6, spread: 1.2 })), 1.3)
        .from('.hero__cta-wrapper, .hero__row, .nav', { opacity: 0, y: 14, duration: 0.9, ease: 'power3.out', stagger: 0.08 }, 1.7);
      return tl;
    },
  };
}
