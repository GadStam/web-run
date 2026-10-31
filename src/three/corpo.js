import * as THREE from 'three';

// O corpo da Mia animado por código, sem clipes: caminhada com os pés plantados (IK de duas juntas),
// quadril e tronco em contrafase, braços em pêndulo, olhos que chegam antes da cabeça, aceno e o peso
// numa perna no idle. As poses são montadas no espaço da raiz (frente +Z, esquerda dela +X, chão em y 0);
// a raiz anda pelo grupo e volta para a origem, de frente para a câmera, quando ela para.

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const suave = t => t * t * t * (t * (t * 6 - 15) + 10);
const bone = (bones, re) => bones.find(b => re.test(b.name));
const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);

// caminhada tranquila: velocidade (m/s), duração de um passo (s), freada (s), meia distância entre os pés,
// pé aberto para fora, giro do pé no calcanhar e na ponta, altura do pé no ar e o vai e vem do quadril
const PASSO = {
  v: 0.95, T: 0.56, freio: 1.3, largura: 0.055, abertura: 0.1,
  calcanhar: 0.24, ponta: 0.42, folga: 0.06,
  lado: 0.017, sobe: 0.011, desce: 0.018, giro: 0.085, inclina: 0.06, peito: 0.065, braco: 0.34,
};

/** gira o osso para o filho apontar na direção pedida (espaço de mundo), qualquer que seja o eixo local do rig */
export function aim(b, child, dir) {
  const a = new THREE.Vector3(), c = new THREE.Vector3();
  b.getWorldPosition(a);
  child.getWorldPosition(c);
  const cur = c.sub(a).normalize();
  const delta = new THREE.Quaternion().setFromUnitVectors(cur, dir.clone().normalize());
  const parentQ = b.parent.getWorldQuaternion(new THREE.Quaternion());
  const worldQ = b.getWorldQuaternion(new THREE.Quaternion());
  b.quaternion.copy(parentQ.invert().multiply(delta.multiply(worldQ)));
  b.updateMatrixWorld(true);
}

/** braços soltos ao lado do corpo (o rig chega em T) */
export function relaxArms(bones) {
  for (const side of ['Left', 'Right']) {
    const arm = bone(bones, new RegExp(`${side}Arm$`, 'i'));
    const fore = bone(bones, new RegExp(`${side}ForeArm$`, 'i'));
    const hand = bone(bones, new RegExp(`${side}Hand$`, 'i'));
    if (!arm || !fore || !hand) continue;
    const s = Math.sign(fore.getWorldPosition(new THREE.Vector3()).x - arm.getWorldPosition(new THREE.Vector3()).x) || (side === 'Left' ? 1 : -1);
    aim(arm, fore, new THREE.Vector3(s * 0.2, -1, 0.02));
    aim(fore, hand, new THREE.Vector3(s * 0.1, -1, 0.2));
  }
}

// segue o alvo quase de uma vez, como um movimento sacádico dos olhos
const segue = (x, alvo, dt, tau) => x + (alvo - x) * (1 - Math.exp(-dt / tau));

// mola amortecida: segue o alvo com atraso natural e um pouco de passada
function mola(k, z = 0.8) {
  const c = 2 * z * Math.sqrt(k);
  return {
    x: 0, v: 0,
    passo(alvo, dt) { this.v += (k * (alvo - this.x) - c * this.v) * dt; this.x += this.v * dt; return this.x; },
    pula(x) { this.x = x; this.v = 0; },
  };
}

/**
 * Caminho da entrada: da direita, fora da tela, até o centro, chegando de frente para a câmera.
 * Os pés pousam onde o quadril vai estar no meio do apoio, então o passo encurta sozinho na freada.
 */
export function planejarEntrada(de, pesRepouso) {
  const { v, T, freio, largura, abertura } = PASSO;
  const p0 = new THREE.Vector2(de.x, de.z), p3 = new THREE.Vector2(0, 0);
  const reta = p3.clone().sub(p0);
  const p1 = p0.clone().addScaledVector(reta, 0.42);
  const p2 = new THREE.Vector2(0, -reta.length() * 0.32);
  const N = 240;
  const xs = new Float32Array(N + 1), zs = new Float32Array(N + 1), ss = new Float32Array(N + 1), ys = new Float32Array(N + 1);
  for (let i = 0; i <= N; i++) {
    const u = i / N, w = 1 - u;
    xs[i] = w * w * w * p0.x + 3 * w * w * u * p1.x + 3 * w * u * u * p2.x + u * u * u * p3.x;
    zs[i] = w * w * w * p0.y + 3 * w * w * u * p1.y + 3 * w * u * u * p2.y + u * u * u * p3.y;
    if (i) ss[i] = ss[i - 1] + Math.hypot(xs[i] - xs[i - 1], zs[i] - zs[i - 1]);
  }
  for (let i = 0; i <= N; i++) {
    const a = Math.max(0, i - 1), b = Math.min(N, i + 1);
    ys[i] = Math.atan2(xs[b] - xs[a], zs[b] - zs[a]);
  }
  const D = ss[N];
  const t1 = Math.max(0, (D - v * freio / 2) / v);
  const fim = t1 + freio;

  /** quanto ela já andou em t (antes de 0 continua para trás, no mesmo ritmo) */
  const andado = t => {
    if (t <= t1) return v * t;
    if (t >= fim) return D;
    const u = (t - t1) / freio;
    return v * t1 + v * freio * (u - u ** 3 + u ** 4 / 2);
  };
  const velocidade = t => (t <= t1 ? v : t >= fim ? 0 : v * (1 - smooth(0, 1, (t - t1) / freio)));

  function ponto(s, out = {}) {
    if (s <= 0) {
      out.yaw = ys[0];
      out.x = xs[0] + Math.sin(ys[0]) * s;
      out.z = zs[0] + Math.cos(ys[0]) * s;
      return out;
    }
    if (s >= D) { out.x = 0; out.z = 0; out.yaw = 0; return out; }
    let lo = 0, hi = N;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (ss[m] < s) lo = m; else hi = m; }
    const f = (s - ss[lo]) / (ss[hi] - ss[lo] || 1);
    out.x = xs[lo] + (xs[hi] - xs[lo]) * f;
    out.z = zs[lo] + (zs[hi] - zs[lo]) * f;
    out.yaw = ys[lo] + (ys[hi] - ys[lo]) * f;
    return out;
  }

  // passo k: esquerdo nos pares; pousa em t0 + kT, fica 1,2 T no chão e voa 0,8 T até o próximo pouso dele
  const t0 = -2 * T;
  const kFim = Math.ceil((fim - 0.6 * T - t0) / T);
  const ultimo = par => (((kFim % 2) + 2) % 2 === par ? kFim : kFim + 1);
  const cache = new Map();
  function pouso(k) {
    if (cache.has(k)) return cache.get(k);
    const par = ((k % 2) + 2) % 2, lado = par === 0 ? 1 : -1;
    let p;
    if (k >= kFim) {
      // os dois últimos fecham na posição de repouso: os pés terminam onde a pose de repouso os tem
      const r = pesRepouso[par];
      p = { x: r.x, z: r.z, yaw: 0 };
    } else {
      const c = ponto(andado(t0 + k * T + 0.6 * T));
      p = { x: c.x + Math.cos(c.yaw) * lado * largura, z: c.z - Math.sin(c.yaw) * lado * largura, yaw: c.yaw + lado * abertura };
    }
    cache.set(k, p);
    return p;
  }
  const passada = 2 * v * T;
  const comprimento = (a, b) => Math.hypot(a.x - b.x, a.z - b.z) / passada;

  /** estado de um pé (par 0 = esquerdo) em t: pouso, giro e, no ar, de onde vem e para onde vai */
  function pe(par, t) {
    let k = Math.floor((t - t0) / T);
    if (((k % 2) + 2) % 2 !== par) k -= 1;
    k = Math.min(k, ultimo(par));
    const tau = (t - (t0 + k * T)) / (2 * T);
    const aqui = pouso(k), antes = pouso(k - 2);
    const fixo = k === ultimo(par);
    const chegou = clamp(comprimento(aqui, antes) * 1.2);
    if (fixo || tau < 0.6) {
      let th = PASSO.calcanhar * chegou * (1 - smooth(0, 0.09, tau));
      if (!fixo) th -= PASSO.ponta * clamp(comprimento(pouso(k + 2), aqui) * 1.2) * smooth(0.3, 0.6, tau) ** 1.6;
      return { de: aqui, para: aqui, u: 0, th, ar: 0 };
    }
    const vai = pouso(k + 2);
    const l = clamp(comprimento(vai, aqui) * 1.2);
    const u = (tau - 0.6) / 0.4;
    return { de: aqui, para: vai, u, l, ar: 1 };
  }

  return { D, t1, fim, T, andado, velocidade, ponto, pe, duracao: fim + 1.4 * T, inicio: t0 };
}

export function createCorpo({ raiz, bones }) {
  const o = {
    hips: bone(bones, /Hips$/i), spine: bone(bones, /Spine$/i), spine1: bone(bones, /Spine1$/i), spine2: bone(bones, /Spine2$/i),
    neck: bone(bones, /Neck$/i), head: bone(bones, /Head$/i),
  };
  const lados = ['Left', 'Right'].map(S => ({
    ombro: bone(bones, new RegExp(`${S}Shoulder$`, 'i')), braco: bone(bones, new RegExp(`${S}Arm$`, 'i')),
    ante: bone(bones, new RegExp(`${S}ForeArm$`, 'i')), mao: bone(bones, new RegExp(`${S}Hand$`, 'i')),
    coxa: bone(bones, new RegExp(`${S}UpLeg$`, 'i')), joelho: bone(bones, new RegExp(`${S}Leg$`, 'i')),
    pe: bone(bones, new RegExp(`${S}Foot$`, 'i')), dedos: bone(bones, new RegExp(`${S}ToeBase$`, 'i')),
    dedo: bone(bones, new RegExp(`${S}HandMiddle1$`, 'i')), indicador: bone(bones, new RegExp(`${S}HandIndex1$`, 'i')),
    mindinho: bone(bones, new RegExp(`${S}HandPinky1$`, 'i')),
  }));
  const [esq, dir] = lados;
  const todos = [...Object.values(o), ...lados.flatMap(l => Object.values(l))];
  if (todos.some(b => !b)) return null;

  // repouso de cada osso no espaço da raiz: orientação, posição e o quaternion local
  raiz.updateMatrixWorld(true);
  const raizQ = new THREE.Quaternion(), raizInvQ = new THREE.Quaternion();
  raiz.getWorldQuaternion(raizInvQ).invert();
  const raizInv = raiz.matrixWorld.clone().invert();
  const rep = new Map(todos.map(b => [b, {
    q: raizInvQ.clone().multiply(b.getWorldQuaternion(new THREE.Quaternion())),
    p: b.getWorldPosition(new THREE.Vector3()).applyMatrix4(raizInv),
    local: b.quaternion.clone(),
  }]));
  for (const l of lados) {
    l.coxaLen = rep.get(l.joelho).p.distanceTo(rep.get(l.coxa).p);
    l.canelaLen = rep.get(l.pe).p.distanceTo(rep.get(l.joelho).p);
    l.tornozelo = rep.get(l.pe).p.y;
    l.bola = Math.max(0.08, rep.get(l.dedos).p.z - rep.get(l.pe).p.z);
    l.lado = Math.sign(rep.get(l.braco).p.x) || (l === esq ? 1 : -1);
  }
  const pesRepouso = lados.map(l => ({ x: rep.get(l.pe).p.x, z: rep.get(l.pe).p.z }));
  const CALCANHAR = 0.045;

  // controles que a coreografia anima (motion/chegada.js)
  const pose = {
    tempo: 0, andando: 0, atencao: 0, sobrancelha: 0, sorriso: 0, aceno: 0, balanco: 0, peso: 0, fixo: 1,
  };
  let plano = null;

  const q = new THREE.Quaternion(), qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), qp = new THREE.Quaternion();
  const e = new THREE.Euler();
  const va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3(), vd = new THREE.Vector3();

  /** rotação no espaço da raiz: guinada (y), rolagem (z) e inclinação (x), nessa ordem */
  const rot = (out, yaw, roll, pitch) => out.setFromEuler(e.set(pitch, yaw, roll, 'YZX'));

  /** põe o osso na orientação de repouso girada por R (espaço da raiz), ignorando o que veio do pai */
  function orientar(b, R) {
    qa.copy(raizQ).multiply(R).multiply(rep.get(b).q);
    b.parent.getWorldQuaternion(qp);
    b.quaternion.copy(qp.invert().multiply(qa));
    b.updateMatrixWorld(true);
  }

  /** ponto no espaço da raiz → mundo */
  const mundo = (v, out) => out.copy(v).applyMatrix4(raiz.matrixWorld);

  /** IK de duas juntas: tornozelo no alvo (mundo), joelho para o lado do polo */
  function perna(l, alvo, polo) {
    l.coxa.quaternion.copy(rep.get(l.coxa).local);
    l.joelho.quaternion.copy(rep.get(l.joelho).local);
    l.coxa.updateMatrixWorld(true);
    const H = l.coxa.getWorldPosition(va);
    const a = l.coxaLen, b = l.canelaLen;
    const d = vb.subVectors(alvo, H);
    const dist = clamp(d.length(), Math.abs(a - b) + 1e-3, (a + b) * 0.9995);
    d.normalize();
    const x = (a * a - b * b + dist * dist) / (2 * dist);
    const h = Math.sqrt(Math.max(a * a - x * x, 0));
    const pp = vc.copy(polo).addScaledVector(d, -polo.dot(d)).normalize();
    const K = vd.copy(H).addScaledVector(d, x).addScaledVector(pp, h);
    aim(l.coxa, l.joelho, K.clone().sub(H));
    const T = H.clone().addScaledVector(d, dist);
    aim(l.joelho, l.pe, T.sub(K));
  }

  /** tornozelo (espaço do grupo) para um pé pousado em (x, z) com giro yaw e inclinação th (+ ponta para cima) */
  function tornozelo(l, x, z, yaw, th, out) {
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    // gira no calcanhar quando a ponta sobe e na bola do pé quando o calcanhar sobe
    const piv = th >= 0 ? -CALCANHAR : l.bola;
    const rf = -piv, ru = l.tornozelo;
    const c = Math.cos(th), s = Math.sin(th);
    const f = piv + rf * c - ru * s, u = rf * s + ru * c;
    return out.set(x + fx * f, u, z + fz * f);
  }

  // o grupo é o pai da raiz; os alvos dos pés são calculados no espaço dele
  const doGrupo = (v, out) => out.copy(v).applyMatrix4(raiz.parent.matrixWorld);

  const molas = {
    cabYaw: mola(70, 0.82), cabPitch: mola(70, 0.85), tronco: mola(38, 0.55), braco: [mola(90, 0.5), mola(90, 0.5)],
  };
  const olho = { yaw: 0, pitch: 0 };
  let velAnt = 0, micro = { x: 0, y: 0, prox: 0 };
  const cabeca = { yaw: 0, pitch: 0 }, olhos = { x: 0, y: 0, desvio: 0 };
  const poloPe = new THREE.Vector3(), cam = new THREE.Vector3(), cabW = new THREE.Vector3();
  const hipsP = new THREE.Vector3(), hipsW = new THREE.Vector3();
  const raizEstado = {};

  /** começa a entrada: ela sai de "de" (espaço do grupo) andando */
  function entrar(de) {
    plano = planejarEntrada(de, pesRepouso);
    pose.tempo = 0;
    pose.andando = 1;
    return plano;
  }

  function update(dt, t, ctx) {
    dt = Math.min(dt, 1 / 30);
    const andando = plano && pose.andando > 0 ? plano : null;
    const tw = pose.tempo;

    // raiz no caminho
    if (andando) {
      andando.ponto(andando.andado(tw), raizEstado);
      raiz.position.set(raizEstado.x, 0, raizEstado.z);
      raiz.rotation.set(0, raizEstado.yaw, 0);
    } else {
      raiz.position.set(0, 0, 0);
      raiz.rotation.set(0, 0, 0);
    }
    raiz.updateMatrixWorld(true);
    raiz.getWorldQuaternion(raizQ);

    // ritmo do passo: fase da passada (0 = pé esquerdo pousa) e quanto do balanço ainda resta
    const vel = andando ? andando.velocidade(tw) : 0;
    const amp = andando ? 1 - smooth(andando.t1, andando.fim + 0.9 * PASSO.T, tw) : 0;
    const fase = andando ? ((((tw - andando.inicio) / (2 * PASSO.T)) % 1) + 1) % 1 : 0;
    const c1 = Math.cos(2 * Math.PI * fase), c2 = Math.cos(2 * Math.PI * (fase - 0.3));
    const acel = (vel - velAnt) / Math.max(dt, 1e-3);
    velAnt = vel;

    // ar de vida no idle: respiração, peso numa perna, balanço lento (some quando a cena pede a pose neutra)
    const vivo = ctx.vivo;
    const resp = Math.sin(t * 1.25);
    const peso = pose.peso * vivo;
    const bal = Math.sin(t * 0.31) * 0.6 + Math.sin(t * 0.53 + 1.3) * 0.4;

    // quadril: desce no apoio duplo, vai para o lado do pé no chão, gira com a perna que avança
    const tronco = molas.tronco.passo(clamp(-acel * 0.03, -0.08, 0.08), dt);
    hipsP.copy(rep.get(o.hips).p);
    hipsP.x += PASSO.lado * amp * c2 + peso * 0.024 + bal * 0.004 * vivo;
    hipsP.y += -PASSO.desce * amp + PASSO.sobe * amp * Math.cos(4 * Math.PI * (fase - 0.3)) - peso * 0.006;
    hipsP.z += 0.008 * amp;
    const hipsYaw = -PASSO.giro * amp * c1 + peso * 0.04;
    const hipsRoll = PASSO.inclina * amp * c2 + peso * 0.05 + bal * 0.008 * vivo;
    const hipsPitch = 0.04 * amp;

    // os pés: alvos no espaço do grupo
    const pes = lados.map((l, i) => {
      if (!andando) return { l, alvo: mundo(rep.get(l.pe).p, new THREE.Vector3()), yaw: 0, th: 0 };
      const s = andando.pe(i, tw);
      let x, z, yaw, th;
      const out = new THREE.Vector3();
      if (!s.ar) {
        ({ x, z, yaw } = s.de);
        th = s.th;
        tornozelo(l, x, z, yaw, th, out);
      } else {
        const u = s.u;
        const a = tornozelo(l, s.de.x, s.de.z, s.de.yaw, -PASSO.ponta * s.l, new THREE.Vector3());
        const b = tornozelo(l, s.para.x, s.para.z, s.para.yaw, PASSO.calcanhar * s.l, new THREE.Vector3());
        const k = suave(u);
        out.lerpVectors(a, b, k);
        out.y += PASSO.folga * (0.35 + 0.65 * s.l) * Math.sin(Math.PI * Math.pow(u, 0.8));
        yaw = s.de.yaw + (s.para.yaw - s.de.yaw) * k;
        th = -PASSO.ponta * s.l + (PASSO.calcanhar * s.l + PASSO.ponta * s.l) * suave(clamp(u * 1.15));
      }
      doGrupo(out, out);
      return { l, alvo: out, yaw: yaw - raiz.rotation.y, th };
    });

    // o quadril não pode subir além do que as pernas alcançam (senão o pé desgruda do chão)
    rot(q, hipsYaw, hipsRoll, hipsPitch);
    orientar(o.hips, q);
    o.hips.position.copy(o.hips.parent.worldToLocal(mundo(hipsP, hipsW)));
    o.hips.updateMatrixWorld(true);
    let baixa = 0;
    for (const p of pes) {
      const H = p.l.coxa.getWorldPosition(va);
      const L = (p.l.coxaLen + p.l.canelaLen) * 0.985;
      const hd = Math.hypot(p.alvo.x - H.x, p.alvo.z - H.z);
      if (hd < L) baixa = Math.max(baixa, H.y - p.alvo.y - Math.sqrt(L * L - hd * hd));
    }
    if (baixa > 0) {
      hipsP.y -= baixa;
      o.hips.position.copy(o.hips.parent.worldToLocal(mundo(hipsP, hipsW)));
      o.hips.updateMatrixWorld(true);
    }

    // tronco em contrafase com o quadril, inclinado para a frente no andar e com inércia na freada
    const ac = pose.aceno;
    const peitoYaw = PASSO.peito * amp * c1 * 0.9 - peso * 0.03;
    const peitoRoll = -PASSO.inclina * amp * c2 * 0.7 - peso * 0.035 - ac * 0.03 - bal * 0.006 * vivo;
    const peitoPitch = 0.05 * amp + tronco + resp * 0.012;

    // olhar: frente no caminho, a câmera quando ela nota, o cursor quando fica à vontade
    ctx.camera.getWorldPosition(cam);
    o.head.getWorldPosition(cabW);
    const livre = (1 - pose.fixo) * ctx.follow;
    cam.x += ctx.ponteiro.x * 1.3 * livre;
    cam.y -= ctx.ponteiro.y * 0.75 * livre;
    const paraCam = cam.sub(cabW).applyQuaternion(qb.copy(raizQ).invert());
    const camYaw = Math.atan2(paraCam.x, paraCam.z), camPitch = Math.atan2(paraCam.y, Math.hypot(paraCam.x, paraCam.z));
    const ate = pose.atencao;
    // fora do hero (o scroll gira o corpo) o olhar volta para a frente do rosto
    const yawT = camYaw * ate * ctx.follow, pitchT = (-0.07 * amp * (1 - ate) + camPitch * ate) * ctx.follow;
    // os olhos passeiam pelo que veem, mais soltos enquanto ela anda
    if (t > micro.prox) {
      const forte = andando && ate < 0.5;
      micro.x = (Math.random() - 0.5) * (forte ? 0.22 : 0.07);
      micro.y = (Math.random() - 0.5) * (forte ? 0.08 : 0.04);
      micro.prox = t + (forte ? 0.5 : 0.7) + Math.random() * 1.6;
    }
    olho.yaw = segue(olho.yaw, yawT + micro.x, dt, 0.022);
    olho.pitch = segue(olho.pitch, pitchT + micro.y, dt, 0.022);
    // a cabeça segue o alvo mais devagar e quase não acompanha os olhares miúdos
    cabeca.yaw = molas.cabYaw.passo(yawT + micro.x * 0.25, dt);
    cabeca.pitch = molas.cabPitch.passo(pitchT, dt);
    olhos.x = clamp(olho.yaw - cabeca.yaw, -0.45, 0.45);
    olhos.y = clamp(olho.pitch - cabeca.pitch, -0.3, 0.3);
    olhos.desvio = Math.abs(yawT - olho.yaw) + Math.abs(pitchT - olho.pitch);

    const cabRoll = ac * 0.1 + Math.sin(t * 0.37) * 0.025 * vivo - PASSO.inclina * amp * c2 * 0.3;
    rot(qa, peitoYaw + cabeca.yaw * 0.18, peitoRoll, peitoPitch);
    const peitoQ = qa.clone();
    const quadrilQ = rot(new THREE.Quaternion(), hipsYaw, hipsRoll, hipsPitch);
    orientar(o.spine, q.slerpQuaternions(quadrilQ, peitoQ, 0.35));
    orientar(o.spine1, q.slerpQuaternions(quadrilQ, peitoQ, 0.7));
    orientar(o.spine2, peitoQ);
    const cabQ = rot(new THREE.Quaternion(), cabeca.yaw, cabRoll, -cabeca.pitch - resp * 0.006);
    orientar(o.neck, q.slerpQuaternions(peitoQ, cabQ, 0.45));
    orientar(o.head, cabQ);

    // pernas e pés
    for (const p of pes) {
      const l = p.l;
      poloPe.set(Math.sin(p.yaw) + l.lado * 0.12, 0, Math.cos(p.yaw)).applyQuaternion(raizQ);
      perna(l, p.alvo, poloPe);
      orientar(l.pe, rot(q, p.yaw, 0, -p.th));
      orientar(l.dedos, rot(q, p.yaw, 0, -Math.max(p.th, 0)));
    }

    // braços em pêndulo: o esquerdo vai à frente com a perna direita; atrasam um pouco e assentam com mola
    lados.forEach((l, i) => {
      const fb = i === 0 ? fase - 0.5 : fase;
      const alvo = PASSO.braco * amp * Math.cos(2 * Math.PI * fb) + 0.02 * resp * vivo;
      const ang = molas.braco[i].passo(alvo, dt);
      const ombroRoll = l === dir ? -0.13 * ac : 0;
      orientar(l.ombro, rot(q, 0, ombroRoll, 0).premultiply(peitoQ));
      const frente = Math.max(ang, 0);
      orientar(l.braco, rot(q, 0, 0, -ang).premultiply(peitoQ));
      orientar(l.ante, rot(q, 0, 0, -(ang + 0.12 + frente * 0.5)).premultiply(peitoQ));
      orientar(l.mao, rot(q, 0, 0, -(ang + 0.1 + frente * 0.4) + molas.braco[i].v * 0.02).premultiply(peitoQ));
    });

    acenar(t, ctx.retrato);

    return { olhos, cabeca };
  }

  // aceno com a mão direita: o cotovelo sobe e o antebraço passa à frente do corpo antes de ficar em pé; no
  // balanço a mão vai e volta atrasada em relação ao antebraço (como um pano preso no pulso) e o cotovelo compensa
  const pa = new THREE.Vector3(), pb = new THREE.Vector3(), eixo = new THREE.Vector3(), atual = new THREE.Vector3();
  const giroQ = new THREE.Quaternion(), paiQ = new THREE.Quaternion(), alvoQ = new THREE.Quaternion();
  const dirBraco = new THREE.Vector3(), dirAnte = new THREE.Vector3(), dirMao = new THREE.Vector3(), polegar = new THREE.Vector3();

  function torcer(b, filho, de, para, alvo) {
    eixo.subVectors(filho.getWorldPosition(pa), b.getWorldPosition(pb)).normalize();
    atual.subVectors(para.getWorldPosition(pa), de.getWorldPosition(pb));
    atual.addScaledVector(eixo, -atual.dot(eixo)).normalize();
    const meta = alvo.clone().addScaledVector(eixo, -alvo.dot(eixo)).normalize();
    const ang = Math.atan2(eixo.dot(pa.crossVectors(atual, meta)), atual.dot(meta));
    giroQ.setFromAxisAngle(eixo, ang);
    b.parent.getWorldQuaternion(paiQ);
    b.quaternion.premultiply(paiQ.clone().invert().multiply(giroQ).multiply(paiQ));
    b.updateMatrixWorld(true);
  }

  const d0 = new THREE.Vector3(), dirFrente = new THREE.Vector3(), alvoD = new THREE.Vector3(), semGiro = new THREE.Quaternion();
  const direcao = (b, filho, out) => out.subVectors(filho.getWorldPosition(pa), b.getWorldPosition(pb)).normalize();
  // caminho por três direções: de (u = 0), meio (u = 0,5) e para (u = 1)
  const arco = (de, meio, para, u, out) => (u < 0.5
    ? out.lerpVectors(de, meio, suave(u * 2))
    : out.lerpVectors(meio, para, suave(u * 2 - 1))).normalize();

  function acenar(t, retrato) {
    const w = pose.aceno, s = dir.lado;
    if (w < 0.001) return;
    const f = t * 11.2;
    const vai = Math.sin(f) * pose.balanco, mao = Math.sin(f - 0.95) * pose.balanco, volta = -Math.sin(f - 0.3) * pose.balanco;
    // no retrato a câmera corta os lados: cotovelo à frente e mão diante do ombro
    if (retrato) {
      dirBraco.set(s * 0.22 + volta * 0.04, -0.6, 0.75);
      dirFrente.set(s * 0.12, 0.2, 1);
      dirAnte.set(s * 0.12 + vai * 0.22, 1, 0.22);
      dirMao.set(s * 0.06 + mao * 0.42, 1, 0.14 - Math.abs(mao) * 0.05);
    } else {
      dirBraco.set(s * 0.46 + volta * 0.06, -0.64, 0.6);
      dirFrente.set(s * 0.3, 0.12, 0.95);
      dirAnte.set(s * 0.18 + vai * 0.3, 1, 0.16);
      dirMao.set(s * 0.1 + mao * 0.46, 1, 0.1 - Math.abs(mao) * 0.05);
    }
    for (const d of [dirBraco, dirFrente, dirAnte, dirMao]) d.normalize().applyQuaternion(raizQ);
    polegar.set(-s, 0, vai * 0.15).applyQuaternion(raizQ);

    // o cotovelo sobe até a altura do peito
    direcao(dir.braco, dir.ante, d0);
    aim(dir.braco, dir.ante, alvoD.lerpVectors(d0, dirBraco, suave(clamp(w / 0.85))).normalize());
    // o antebraço dobra cedo e passa à frente do corpo antes de ficar em pé: a mão nunca abre esticada para o lado
    direcao(dir.ante, dir.mao, d0);
    aim(dir.ante, dir.mao, arco(d0, dirFrente, dirAnte, w, alvoD));
    semGiro.copy(dir.ante.quaternion);
    torcer(dir.ante, dir.mao, dir.mindinho, dir.indicador, polegar);
    dir.ante.quaternion.slerpQuaternions(semGiro, alvoQ.copy(dir.ante.quaternion), smooth(0.15, 0.85, w));
    dir.ante.updateMatrixWorld(true);
    // a mão sobe um pouco antes do antebraço, palma para a frente
    direcao(dir.mao, dir.dedo, d0);
    aim(dir.mao, dir.dedo, alvoD.lerpVectors(d0, dirMao, smooth(0.35, 1, w)).normalize());
  }

  return { pose, update, entrar, get plano() { return plano; } };
}
