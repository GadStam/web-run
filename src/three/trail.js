import * as THREE from 'three';

// rastro do cursor num canvas pequeno: o traço some sozinho em ~1,5 s
export function createTrail() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;

  const S = 320;
  let scale = 1, last = null, target = null, pos = null;

  function resize() {
    const ar = window.innerWidth / window.innerHeight;
    canvas.width = ar >= 1 ? S : Math.round(S * ar);
    canvas.height = ar >= 1 ? Math.round(S / ar) : S;
    scale = canvas.width / window.innerWidth;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    tex.needsUpdate = true;
  }
  resize();

  const move = e => { target = { x: e.clientX * scale, y: e.clientY * scale }; if (!pos) pos = { ...target }; };
  window.addEventListener('pointermove', move, { passive: true });

  function update(active) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(0,0,0,0.045)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (active && target) {
      pos.x += (target.x - pos.x) * 0.35;
      pos.y += (target.y - pos.y) * 0.35;
      const from = last ?? pos;
      const r = canvas.width * 0.07;
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(255,255,255,0.32)';
      ctx.lineCap = 'round';
      ctx.lineWidth = r;
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = r * 0.8;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(pos.x + 0.01, pos.y);
      ctx.stroke();
      ctx.shadowBlur = 0;
      last = { ...pos };
    } else {
      last = null;
    }
    tex.needsUpdate = true;
  }

  return { texture: tex, resize, update };
}
