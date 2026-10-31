import gsap from 'gsap';

/**
 * A chegada da Mia: entra pela direita andando e olhando o caminho, percebe que estamos olhando (os olhos
 * chegam antes da cabeça; a primeira olhada é rápida e ela volta a olhar de verdade), ergue as sobrancelhas,
 * sorri, para de frente para a câmera e acena; depois descansa o peso numa perna e segue o cursor.
 */
export function chegada(corpo, view, { aoParar } = {}) {
  const p = corpo.pose;
  // começa logo além da borda direita, um pouco ao fundo; no retrato a tela é estreita, então ela vem
  // de longe, quase em direção à câmera, para a caminhada aparecer
  const z = view.retrato ? -2.6 : -1.2;
  const meia = ((view.visW / 2) * (view.dist - z)) / view.dist;
  const plano = corpo.entrar({ x: meia + (view.retrato ? 0.3 : 0.38), z });
  const nota = plano.t1 * 0.62;
  const para = plano.fim;

  return gsap.timeline()
    .to(p, { tempo: plano.duracao, duration: plano.duracao, ease: 'none' }, 0)
    .set(p, { atencao: 1 }, nota)
    .set(p, { atencao: 0 }, nota + 0.3)
    .set(p, { atencao: 1 }, nota + 0.62)
    .to(p, { sobrancelha: 1, duration: 0.13, ease: 'power2.out' }, nota + 0.66)
    .to(p, { sobrancelha: 0, duration: 0.5, ease: 'power2.inOut' }, '+=0.2')
    .to(p, { sorriso: 0.5, duration: 0.55, ease: 'power2.out' }, nota + 0.72)
    // o braço começa a subir enquanto o último passo assenta
    .to(p, { aceno: 1, duration: 0.75, ease: 'power2.inOut' }, para - 0.95)
    .to(p, { sorriso: 1, duration: 0.6, ease: 'power1.inOut' }, '<0.1')
    .add(() => aoParar?.(), para)
    .to(p, { balanco: 1, duration: 0.3, ease: 'power1.out' }, para - 0.35)
    .to(p, { balanco: 0, duration: 0.45, ease: 'power1.in' }, para + 1.35)
    .to(p, { aceno: 0, duration: 0.95, ease: 'power2.inOut' }, '-=0.15')
    .to(p, { sorriso: 0.3, duration: 1.4, ease: 'power1.inOut' }, '<0.35')
    .to(p, { peso: 1, duration: 1.8, ease: 'sine.inOut' }, para + 0.6)
    .to(p, { fixo: 0, duration: 1.2, ease: 'power1.inOut' }, '>-0.8');
}
