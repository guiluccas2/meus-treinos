// Gera uma animação padronizada (boneco) a partir de um vídeo, usando detecção de pose por IA
// (MediaPipe Pose Landmarker), executada no próprio navegador — o vídeo não sai do aparelho.

// Pontos usados (índices do MediaPipe)
export const POINTS = [0, 7, 8, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32];
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task';

let landmarkerPromise = null;
let lastTs = 0;

async function getLandmarker() {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision');
      const fileset = await FilesetResolver.forVisionTasks(import.meta.env.BASE_URL + 'mediapipe');
      const make = (delegate) =>
        PoseLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.4,
          minTrackingConfidence: 0.4
        });
      try {
        return await make('GPU');
      } catch {
        return await make('CPU');
      }
    })();
    landmarkerPromise.catch(() => (landmarkerPromise = null));
  }
  return landmarkerPromise;
}

const seek = (video, t) =>
  new Promise((res) => {
    const done = () => {
      video.removeEventListener('seeked', done);
      res();
    };
    video.addEventListener('seeked', done);
    video.currentTime = t;
  });

export async function videoToAnimation(file, { start = 0, end = null, fps = 15, onProgress = () => {} } = {}) {
  onProgress(0, 'Carregando modelo de IA…');
  const lm = await getLandmarker();
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.src = url;
  await new Promise((res, rej) => {
    video.onloadeddata = res;
    video.onerror = () => rej(new Error('Não foi possível ler este vídeo neste navegador.'));
  });
  const dur = video.duration;
  const t0 = Math.max(0, Math.min(start || 0, dur));
  const t1 = Math.min(dur, end && end > t0 ? end : dur, t0 + 30); // máx. 30s
  const aspect = video.videoWidth / video.videoHeight || 1;
  const raw = [];
  const total = Math.max(1, Math.floor((t1 - t0) * fps));
  for (let i = 0; i <= total; i++) {
    const t = t0 + i / fps;
    await seek(video, Math.min(t, dur - 0.01));
    lastTs = Math.max(lastTs + 1, Math.round(performance.now()));
    const r = lm.detectForVideo(video, lastTs);
    const p = r.landmarks && r.landmarks[0];
    raw.push(p ? POINTS.map((k) => [p[k].x * aspect, p[k].y, p[k].visibility ?? 1]) : null);
    onProgress(i / total, `Analisando movimento… ${Math.round((i / total) * 100)}%`);
  }
  URL.revokeObjectURL(url);
  const found = raw.filter(Boolean).length;
  if (found < Math.max(3, raw.length * 0.3)) throw new Error('Não consegui identificar o corpo no vídeo. Use um vídeo com o corpo inteiro visível, boa luz e câmera parada.');
  onProgress(1, 'Gerando animação…');
  return { v: 1, fps, points: POINTS, frames: normalize(smooth(fill(raw))), createdAt: new Date().toISOString(), source: { name: file.name, start: t0, end: t1 } };
}

// Preenche quadros sem detecção por interpolação
function fill(raw) {
  const out = raw.slice();
  const idx = out.map((f, i) => (f ? i : -1)).filter((i) => i >= 0);
  for (let i = 0; i < out.length; i++) {
    if (out[i]) continue;
    const prev = [...idx].reverse().find((j) => j < i);
    const next = idx.find((j) => j > i);
    if (prev == null) out[i] = out[next];
    else if (next == null) out[i] = out[prev];
    else {
      const a = (i - prev) / (next - prev);
      out[i] = out[prev].map((p, k) => [p[0] + (out[next][k][0] - p[0]) * a, p[1] + (out[next][k][1] - p[1]) * a, Math.min(p[2], out[next][k][2])]);
    }
  }
  return out;
}

// Suavização (média ponderada em janela de 5 quadros) para tirar tremidos
function smooth(frames) {
  const w = [1, 2, 3, 2, 1];
  return frames.map((f, i) =>
    f.map((_, k) => {
      let sx = 0, sy = 0, sw = 0;
      for (let j = -2; j <= 2; j++) {
        const g = frames[i + j];
        if (!g) continue;
        sx += g[k][0] * w[j + 2];
        sy += g[k][1] * w[j + 2];
        sw += w[j + 2];
      }
      return [sx / sw, sy / sw, f[k][2]];
    })
  );
}

const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)] || 1;
};

// Normaliza escala (tronco = 1) e posição, para todas as animações terem o mesmo enquadramento
function normalize(frames) {
  const I = (id) => POINTS.indexOf(id);
  const mid = (f, a, b) => [(f[I(a)][0] + f[I(b)][0]) / 2, (f[I(a)][1] + f[I(b)][1]) / 2];
  const torso = median(frames.map((f) => {
    const s = mid(f, 11, 12), h = mid(f, 23, 24);
    return Math.hypot(s[0] - h[0], s[1] - h[1]);
  }));
  const cx = median(frames.map((f) => mid(f, 23, 24)[0]));
  // "chão" = ponto mais baixo do corpo ao longo do vídeo (funciona em pé ou deitado)
  const ys = frames.flatMap((f) => f.map((p) => p[1])).sort((a, b) => a - b);
  const ground = ys[Math.floor(ys.length * 0.99)];
  const r = (n) => Math.round(n * 1000) / 1000;
  return frames.map((f) => f.flatMap((p) => [r((p[0] - cx) / torso), r((p[1] - ground) / torso), Math.round(p[2] * 10) / 10]));
}
