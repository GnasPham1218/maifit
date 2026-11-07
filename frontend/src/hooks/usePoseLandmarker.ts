import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import { useEffect, useState } from 'react';

// Both served by the app itself (see scripts/copy-mediapipe.mjs and public/models), no CDN
const WASM_PATH = '/mediapipe/wasm';

// full (~9 MB): steadier and more accurate, ~16 fps on a recent phone.
// lite (~5 MB): for slower phones (full ran at ~8 fps on one: too few frames per rep).
export type PoseModel = 'full' | 'lite';
const MODEL_PATHS: Record<PoseModel, string> = {
  full: '/models/pose_landmarker_full.task',
  lite: '/models/pose_landmarker_lite.task',
};

export type PoseLandmarkerStatus =
  | { kind: 'loading' }
  | { kind: 'ready'; landmarker: PoseLandmarker; model: PoseModel }
  | { kind: 'error' };

async function createLandmarker(model: PoseModel, delegate: 'GPU' | 'CPU'): Promise<PoseLandmarker> {
  const fileset = await FilesetResolver.forVisionTasks(WASM_PATH);
  return PoseLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: MODEL_PATHS[model], delegate },
    runningMode: 'VIDEO',
    numPoses: 1, // one person per session; also cheaper
  });
}

// GPU (WebGL, several times faster) before CPU; if the full model cannot load at all,
// the lite one is used instead
async function createBest(model: PoseModel): Promise<{ landmarker: PoseLandmarker; model: PoseModel }> {
  const order: PoseModel[] = model === 'full' ? ['full', 'lite'] : ['lite'];
  let lastError: unknown;
  for (const m of order) {
    for (const delegate of ['GPU', 'CPU'] as const) {
      try {
        return { landmarker: await createLandmarker(m, delegate), model: m };
      } catch (err) {
        lastError = err;
      }
    }
  }
  throw lastError;
}

// One landmarker per model for the whole app session: compiling the WASM and loading the model
// onto the GPU takes 1-3 s, so it is done the first time and reused on every later visit.
// Never closed (a few tens of MB until the tab closes). A failed attempt is not kept.
const shared = new Map<PoseModel, Promise<{ landmarker: PoseLandmarker; model: PoseModel }>>();

function getLandmarker(model: PoseModel) {
  let promise = shared.get(model);
  if (!promise) {
    promise = createBest(model);
    shared.set(model, promise);
    promise.catch(() => shared.delete(model));
  }
  return promise;
}

export function usePoseLandmarker(model: PoseModel): PoseLandmarkerStatus {
  const [status, setStatus] = useState<PoseLandmarkerStatus>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    getLandmarker(model)
      .then((loaded) => {
        if (!cancelled) setStatus({ kind: 'ready', ...loaded });
      })
      .catch(() => {
        if (!cancelled) setStatus({ kind: 'error' });
      });
    return () => {
      cancelled = true; // only stop updating this page; the landmarker stays for the next visit
    };
  }, [model]);

  return status;
}

// The model choice is remembered per device: a slow phone goes straight to lite next time.
// localStorage can be missing or throw (private mode): then simply start with full.
const STORAGE_KEY = 'maifit.poseModel';

export function savedPoseModel(): PoseModel {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'lite' ? 'lite' : 'full';
  } catch {
    return 'full';
  }
}

export function savePoseModel(model: PoseModel) {
  try {
    localStorage.setItem(STORAGE_KEY, model);
  } catch {
    // not remembered: harmless, the speed check runs again next time
  }
}
