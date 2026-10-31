// Lenis ligado ao ticker do GSAP: uma suavização só (nada de scrub com atraso por cima)
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export function smooth() {
  const lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.9, touchMultiplier: 1.2 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  ScrollTrigger.addEventListener('refresh', () => lenis.resize());
  document.querySelectorAll('a[href^="#"]').forEach(a =>
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      e.preventDefault();
      lenis.scrollTo(id === '#topo' ? 0 : id, { duration: 1.8 });
    }),
  );
  return lenis;
}
