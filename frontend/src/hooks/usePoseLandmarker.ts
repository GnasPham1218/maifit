import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import { useEffect, useState } from 'react';

// Both served by the app itself (see scripts/copy-mediapipe.mjs and public/models), no CDN
const WASM_PATH = '/mediapipe/wasm';
// lite (~5 MB): fastest, enough to tell 90 from 160 degrees. If counting is off in tests,
// download pose_landmarker_full.task and change this one line.
const MODEL_PATH = '/models/pose_landmarker_lite.task';

export type PoseLandmarkerStatus =
  | { kind: 'loading' }
  | { kind: 'ready'; landmarker: PoseLandmarker }
  | { kind: 'error' };

async function createLandmarker(delegate: 'GPU' | 'CPU'): Promise<PoseLandmarker> {
  const fileset = await FilesetResolver.forVisionTasks(WASM_PATH);
  return PoseLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: MODEL_PATH, delegate },
    runningMode: 'VIDEO',
    numPoses: 2, // 2, not 1: a second person in the frame must be noticed to pause counting
  });
}

// One landmarker for the whole app session: compiling the WASM and loading the model onto the GPU
// takes 1-3 s, so it is done the first time /workout opens and reused on every later visit.
// Never closed: it holds a few tens of MB until the tab closes, only for users who opened /workout.
// A failed attempt is not kept, so the next visit tries again.
let shared: Promise<PoseLandmarker> | null = null;

function getLandmarker(): Promise<PoseLandmarker> {
  if (!shared) {
    // GPU (WebGL) is several times faster; some browsers/devices refuse it -> fall back to CPU
    shared = createLandmarker('GPU').catch(() => createLandmarker('CPU'));
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
