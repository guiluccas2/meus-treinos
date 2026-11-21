// Arquivos de mídia (animações e vídeos): cache local em IndexedDB + envio para o GitHub.
import { get, set, del } from 'idb-keyval';
import { uid } from './model.js';
import { putFile, getBlob, getTextFile, bytesToB64, deleteFile } from './github.js';

const Q_UP = 'mt:uploads';
const Q_DEL = 'mt:deletes';
const readQ = (k) => {
  try {
    return JSON.parse(localStorage.getItem(k) || '[]');
  } catch {
    return [];
  }
};
const writeQ = (k, v) => localStorage.setItem(k, JSON.stringify(v));

export const MAX_VIDEO_MB = 40;

export async function saveAnimation(exerciseId, anim) {
  const path = `animacoes/${exerciseId}-${uid()}.json`;
  await set('file:' + path, new Blob([JSON.stringify(anim)], { type: 'application/json' }));
  writeQ(Q_UP, [...readQ(Q_UP), path]);
  return path;
}

export async function saveVideo(file) {
  const ext = (file.name.split('.').pop() || 'mp4').toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp4';
  const path = `videos/${uid()}.${ext}`;
  await set('file:' + path, file);
  writeQ(Q_UP, [...readQ(Q_UP), path]);
  return path;
}

export function removeFile(path) {
  if (!path) return;
  const up = readQ(Q_UP);
  if (up.includes(path)) writeQ(Q_UP, up.filter((p) => p !== path));
  else writeQ(Q_DEL, [...readQ(Q_DEL), path]);
  del('file:' + path);
}

export const pendingUploads = () => readQ(Q_UP).length;

const memo = new Map();
export async function loadAnimation(path, cfg) {
  if (memo.has(path)) return memo.get(path);
  let blob = await get('file:' + path);
  if (!blob && cfg) {
    const f = await getTextFile(cfg, path);
    if (!f) return null;
    blob = new Blob([f.text], { type: 'application/json' });
    await set('file:' + path, blob);
  }
  if (!blob) return null;
  const anim = JSON.parse(await blob.text());
  memo.set(path, anim);
  return anim;
}

const urls = new Map();
export async function loadVideoURL(path, cfg) {
  if (urls.has(path)) return urls.get(path);
  let blob = await get('file:' + path);
  if (!blob && cfg) {
    blob = await getBlob(cfg, path);
    await set('file:' + path, blob);
  }
  if (!blob) return null;
  const u = URL.createObjectURL(blob);
  urls.set(path, u);
  return u;
}

let running = false;
export async function processMediaQueue(cfg) {
  if (running || !cfg) return;
  running = true;
  try {
    for (const path of readQ(Q_UP)) {
      const blob = await get('file:' + path);
      if (blob) {
        const b64 = bytesToB64(new Uint8Array(await blob.arrayBuffer()));
        await putFile(cfg, path, b64, null, `Mídia: ${path}`);
      }
      writeQ(Q_UP, readQ(Q_UP).filter((p) => p !== path));
    }
    for (const path of readQ(Q_DEL)) {
      await deleteFile(cfg, path, `Remove mídia: ${path}`);
      writeQ(Q_DEL, readQ(Q_DEL).filter((p) => p !== path));
    }
  } finally {
    running = false;
  }
}
