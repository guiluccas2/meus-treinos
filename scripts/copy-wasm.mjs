// Copia os arquivos WebAssembly do MediaPipe para public/mediapipe (servidos pelo próprio app).
import { cpSync, mkdirSync, existsSync } from 'node:fs';
const src = 'node_modules/@mediapipe/tasks-vision/wasm';
if (existsSync(src)) {
  mkdirSync('public/mediapipe', { recursive: true });
  cpSync(src, 'public/mediapipe', { recursive: true });
  console.log('MediaPipe wasm copiado para public/mediapipe');
}
