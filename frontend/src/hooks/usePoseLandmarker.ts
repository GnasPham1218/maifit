import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import { useEffect, useState } from 'react';

// Both served by the app itself (see scripts/copy-mediapipe.mjs and public/models), no CDN
const WASM_PATH = '/mediapipe/wasm';
// full (~9 MB) is noticeably steadier and more accurate than lite (~5 MB) and still real-time
// on a recent phone. If the full file is not in public/models, the lite one is used.
const MODELS = ['/models/pose_landmarker_full.task', '/models/pose_landmarker_lite.task'] as const;

export type PoseLandmarkerStatus =
  | { kind: 'loading' }
  | { kind: 'ready'; landmarker: PoseLandmarker }
  | { kind: 'error' };

async function createLandmarker(modelAssetPath: string, delegate: 'GPU' | 'CPU'): Promise<PoseLandmarker> {
  const fileset = await FilesetResolver.forVisionTasks(WASM_PATH);
  return PoseLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath, delegate },
    runningMode: 'VIDEO',
    numPoses: 1, // one person per session; also cheaper
  });
}

// Best model first, GPU (WebGL, several times faster) before CPU: first combination that loads wins
async function createBest(): Promise<PoseLandmarker> {
  let lastError: unknown;
  for (const model of MODELS) {
    for (const delegate of ['GPU', 'CPU'] as const) {
      try {
        return await createLandmarker(model, delegate);
      } catch (err) {
        lastError = err;
      }
    }
  }
  throw lastError;
}

// One landmarker for the whole app session: compiling the WASM and loading the model onto the GPU
// takes 1-3 s, so it is done the first time /workout opens and reused on every later visit.
// Never closed: it holds a few tens of MB until the tab closes, only for users who opened /workout.
// A failed attempt is not kept, so the next visit tries again.
let shared: Promise<PoseLandmarker> | null = null;

function getLandmarker(): Promise<PoseLandmarker> {
  if (!shared) {
    shared = createBest();
    shared.catch(() => {
      shared = null;
    });
  }
  return shared;
}

export function usePoseLandmarker(): PoseLandmarkerStatus {
  const [status, setStatus] = useState<PoseLandmarkerStatus>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    getLandmarker()
      .then((landmarker) => {
        if (!cancelled) setStatus({ kind: 'ready', landmarker });
      })
      .catch(() => {
        if (!cancelled) setStatus({ kind: 'error' });
      });
    return () => {
      cancelled = true; // only stop updating this page; the landmarker stays for the next visit
    };
  }, []);

  return status;
}
