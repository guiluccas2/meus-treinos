import { useEffect, useRef, useState } from 'react';

// Desenha a animação padronizada (boneco) num canvas.
const IDX = (points) => (id) => points.indexOf(id);

export default function AnimationPlayer({ anim, height = 260 }) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [mirror, setMirror] = useState(false);
  const state = useRef({ t: 0, last: 0 });

  useEffect(() => {
    if (!anim || !anim.frames?.length) return;
    const cv = ref.current;
    const ctx = cv.getContext('2d');
    const P = IDX(anim.points);
    const N = anim.points.length;
    const frames = anim.frames;
    // limites do movimento todo (enquadramento fixo)
    let minX = Infinity, maxX = -Infinity, minY = Infinity;
    for (const f of frames)
      for (let k = 0; k < N; k++) {
        minX = Math.min(minX, f[k * 3]);
        maxX = Math.max(maxX, f[k * 3]);
        minY = Math.min(minY, f[k * 3 + 1]);
      }
    minY -= 0.35; // espaço para a cabeça
    let raf;
    const draw = (now) => {
      const st = state.current;
      const dt = st.last ? (now - st.last) / 1000 : 0;
      st.last = now;
      if (playing) st.t = (st.t + dt * speed * anim.fps) % frames.length;
      const dpr = window.devicePixelRatio || 1;
      const W = cv.clientWidth, H = cv.clientHeight;
      if (cv.width !== W * dpr) {
        cv.width = W * dpr;
        cv.height = H * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cs = getComputedStyle(cv);
      const ac = cs.getPropertyValue('--ac').trim() || '#c6f432';
      const tx = cs.getPropertyValue('--tx').trim() || '#fff';
      const mut = cs.getPropertyValue('--mut').trim() || '#888';
      const line = cs.getPropertyValue('--line').trim() || '#333';
      ctx.clearRect(0, 0, W, H);
      const padX = 24, padTop = 16, floorH = 26;
      const bw = Math.max(maxX - minX, 0.8), bh = Math.max(0 - minY, 0.8);
      const s = Math.min((W - padX * 2) / bw, (H - padTop - floorH) / bh);
      const ox = W / 2 - ((minX + maxX) / 2) * s * (mirror ? -1 : 1);
      const oy = H - floorH;
      const i0 = Math.floor(st.t), i1 = (i0 + 1) % frames.length, a = st.t - i0;
      const f0 = frames[i0], f1 = frames[i1];
      const pt = (id) => {
        const k = P(id) * 3;
        const x = f0[k] + (f1[k] - f0[k]) * a;
        const y = f0[k + 1] + (f1[k + 1] - f0[k + 1]) * a;
        return [ox + x * s * (mirror ? -1 : 1), oy + y * s];
      };
      // chão e sombra
      ctx.strokeStyle = line;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(12, oy + 4);
      ctx.lineTo(W - 12, oy + 4);
      ctx.stroke();
      const hipC = [(pt(23)[0] + pt(24)[0]) / 2];
      ctx.fillStyle = line;
      ctx.beginPath();
      ctx.ellipse(hipC[0], oy + 6, s * 0.45, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      const limb = (ids, color, w) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = w;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ids.forEach((id, j) => {
          const p = pt(id);
          j ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
        });
        ctx.stroke();
      };
      const lw = Math.max(5, s * 0.16);
      // lado esquerdo (atrás, cor neutra)
      limb([11, 13, 15], mut, lw);
      limb([23, 25, 27, 29, 31, 27], mut, lw);
      // tronco
      const sh = [pt(11), pt(12)], hp = [pt(23), pt(24)];
      ctx.fillStyle = tx;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.moveTo(sh[0][0], sh[0][1]);
      ctx.lineTo(sh[1][0], sh[1][1]);
      ctx.lineTo(hp[1][0], hp[1][1]);
      ctx.lineTo(hp[0][0], hp[0][1]);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = tx;
      ctx.lineWidth = lw * 1.1;
      ctx.stroke();
      ctx.globalAlpha = 1;
      // pescoço e cabeça
      const ms = [(sh[0][0] + sh[1][0]) / 2, (sh[0][1] + sh[1][1]) / 2];
      const e1 = pt(7), e2 = pt(8), nose = pt(0);
      const head = [(e1[0] + e2[0] + nose[0]) / 3, (e1[1] + e2[1] + nose[1]) / 3];
      ctx.strokeStyle = tx;
      ctx.lineWidth = lw * 0.9;
      ctx.beginPath();
      ctx.moveTo(ms[0], ms[1]);
      ctx.lineTo(head[0], head[1]);
      ctx.stroke();
      ctx.fillStyle = tx;
      ctx.beginPath();
      ctx.arc(head[0], head[1], s * 0.2, 0, Math.PI * 2);
      ctx.fill();
      // nariz indica para onde o rosto aponta
      ctx.fillStyle = ac;
      ctx.beginPath();
      ctx.arc(head[0] + (nose[0] - head[0]) * 1.6, head[1] + (nose[1] - head[1]) * 1.6, Math.max(2.5, s * 0.04), 0, Math.PI * 2);
      ctx.fill();
      // lado direito (frente, cor de destaque)
      limb([24, 26, 28, 30, 32, 28], ac, lw);
      limb([12, 14, 16], ac, lw);
      // articulações
      ctx.fillStyle = ref.current ? cs.getPropertyValue('--surface').trim() || '#000' : '#000';
      for (const id of [13, 14, 25, 26])
        {
          const p = pt(id);
          ctx.beginPath();
          ctx.arc(p[0], p[1], lw * 0.28, 0, Math.PI * 2);
          ctx.fill();
        }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      state.current.last = 0;
    };
  }, [anim, playing, speed, mirror]);

  if (!anim) return null;
  return (
    <div className="anim">
      <canvas ref={ref} style={{ height }} onClick={() => setPlaying((p) => !p)} />
      <div className="anim-ctl">
        <button className="btn sm ghost" onClick={() => setPlaying((p) => !p)}>{playing ? '❚❚ Pausar' : '▶ Tocar'}</button>
        <div className="seg sm">
          {[0.5, 1, 1.5].map((v) => (
            <button key={v} className={speed === v ? 'on' : ''} onClick={() => setSpeed(v)}>{v}×</button>
          ))}
        </div>
        <button className={'btn sm ghost' + (mirror ? ' on' : '')} onClick={() => setMirror((m) => !m)}>⇋ Espelhar</button>
      </div>
    </div>
  );
}
