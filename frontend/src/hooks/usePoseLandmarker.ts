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
    numPoses: 1, // one person per session; also cheaper
  });
}

// Loads the model once per page visit and frees it (WASM + GPU memory) when the page closes.
export function usePoseLandmarker(): PoseLandmarkerStatus {
  const [status, setStatus] = useState<PoseLandmarkerStatus>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    let instance: PoseLandmarker | null = null;

    // GPU (WebGL) is several times faster; some browsers/devices refuse it -> fall back to CPU
    createLandmarker('GPU')
      .catch(() => createLandmarker('CPU'))
      .then((landmarker) => {
        if (cancelled) {
          landmarker.close(); // the page closed while loading
          return;
        }
        instance = landmarker;
        setStatus({ kind: 'ready', landmarker });
      })
      .catch(() => {
        if (!cancelled) setStatus({ kind: 'error' });
      });

    return () => {
      cancelled = true;
      instance?.close();
    };
  }, []);

  return status;
}
