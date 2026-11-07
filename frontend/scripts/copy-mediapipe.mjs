// Copies the MediaPipe WASM runtime from node_modules into public/, so the app serves it itself
// instead of loading code from a CDN at runtime (no third-party script, works with a strict CSP,
// and the runtime always matches the installed @mediapipe/tasks-vision version).
// Runs before dev and build (npm "predev" / "prebuild"); the copy is not committed (.gitignore).
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const from = join(root, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm');
const to = join(root, 'public', 'mediapipe', 'wasm');

// Only the files FilesetResolver.forVisionTasks loads for the classic (non-module) runtime
const FILES = ['vision_wasm_internal.js', 'vision_wasm_internal.wasm'];

mkdirSync(to, { recursive: true });
for (const file of FILES) copyFileSync(join(from, file), join(to, file));
console.log(`MediaPipe WASM copied to ${to}`);
