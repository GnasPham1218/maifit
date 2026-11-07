import type { Landmark } from './analyzeFrame';

// One Euro filter (Casiez et al., CHI 2012), the usual way to steady pose landmarks:
// strong smoothing while a point is still (removes the shake that made the skeleton jump and
// broke the "hold still" step), little smoothing while it moves fast (no lag on a quick rep).
//   cutoff = minCutoff + beta * speed;  alpha = 1 / (1 + tau / dt), tau = 1 / (2 pi cutoff)

export interface FilterOptions {
  minCutoff: number; // Hz: lower = steadier when still
  beta: number; // how fast the cutoff rises with speed (units of the coordinates per second)
  dCutoff: number; // Hz: smoothing of the speed estimate itself
}

// Coordinates are ~0..1 (image) or meters (world): a fast limb moves ~1-3 units/s
export const DEFAULT_FILTER: FilterOptions = { minCutoff: 1.0, beta: 10, dCutoff: 1.0 };

const alpha = (cutoff: number, dt: number) => 1 / (1 + 1 / (2 * Math.PI * cutoff) / dt);

interface AxisState {
  value: number;
  speed: number;
}

// Same shape as MediaPipe's NormalizedLandmark, so the result can be drawn with DrawingUtils
export interface FilteredLandmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export type LandmarkFilter = (landmarks: readonly Landmark[] | undefined, timeMs: number) => FilteredLandmark[] | undefined;

const copy = (p: Landmark): FilteredLandmark => ({ x: p.x, y: p.y, z: p.z ?? 0, visibility: p.visibility ?? 0 });

// One filter per landmark stream (image and world separately). Visibility is passed through.
// No landmarks in a frame (person lost) resets the filter, so it never blends two different people.
export function createLandmarkFilter(options: FilterOptions = DEFAULT_FILTER): LandmarkFilter {
  let state: AxisState[][] | null = null; // [landmark][axis x, y, z]
  let lastTime = 0;

  return (landmarks, timeMs) => {
    if (!landmarks) {
      state = null;
      return undefined;
    }
    const dt = (timeMs - lastTime) / 1000;
    lastTime = timeMs;
    if (!state || state.length !== landmarks.length || dt <= 0) {
      state = landmarks.map((p) => [p.x, p.y, p.z ?? 0].map((value) => ({ value, speed: 0 })));
      return landmarks.map(copy);
    }

    const current = state;
    return landmarks.map((p, i) => {
      const axes = [p.x, p.y, p.z ?? 0].map((raw, k) => {
        const prev = current[i][k];
        const speed = prev.speed + alpha(options.dCutoff, dt) * ((raw - prev.value) / dt - prev.speed);
        const cutoff = options.minCutoff + options.beta * Math.abs(speed);
        const value = prev.value + alpha(cutoff, dt) * (raw - prev.value);
        current[i][k] = { value, speed };
        return value;
      });
      return { x: axes[0], y: axes[1], z: axes[2], visibility: p.visibility ?? 0 };
    });
  };
}
