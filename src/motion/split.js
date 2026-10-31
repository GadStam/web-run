import gsap from 'gsap';

/** quebra cada [data-split] em letras (.ch); espaços ficam como texto para não juntar as palavras */
export function splitAll(root = document) {
  root.querySelectorAll('[data-split]').forEach(el => {
    const txt = el.textContent;
    el.textContent = '';
    for (const c of txt) {
      if (c === ' ') { el.append(' '); continue; }
      const s = document.createElement('span');
      s.className = 'ch';
      s.textContent = c;
      el.append(s);
    }
  });
}

/** letras acendem (ou apagam) em ordem aleatória */
export function lightUp(el, on = true, { duration = 0.5, spread = 0.9 } = {}) {
  const chars = el.querySelectorAll('.ch');
  return gsap.to(chars, {
    opacity: on ? 1 : 0.0,
    duration,
    ease: on ? 'power2.out' : 'power2.in',
    stagger: { each: spread / Math.max(chars.length, 1), from: 'random' },
    overwrite: true,
  });
}
