// Hand-made poses for unit tests (not used by the app). The same numbers serve as image and
// world landmarks: world y points down, like the image, so "lower" means a larger y.
import type { Landmark } from './analyzeFrame';

export type Xyz = readonly [number, number, number?];

// 33 landmarks; the ones not listed are hidden (visibility 0)
export function body(points: Record<number, Xyz>, visibility: Record<number, number> = {}): Landmark[] {
  return Array.from({ length: 33 }, (_, i) => {
    const p = points[i];
    return p ? { x: p[0], y: p[1], z: p[2] ?? 0, visibility: visibility[i] ?? 1 } : { x: 0, y: 0, z: 0, visibility: 0 };
  });
}

interface Side {
  shoulder: Xyz;
  elbow: Xyz;
  wrist: Xyz;
  hip: Xyz;
  knee: Xyz;
  ankle: Xyz;
}

// Left side, then the right side 0.3 m further back (z), same shape unless overridden
export function twoSides(left: Side, right: Partial<Side> = {}): Record<number, Xyz> {
  const back = (p: Xyz): Xyz => [p[0], p[1], (p[2] ?? 0) + 0.3];
  const r = { ...left, ...right };
  return {
    11: left.shoulder, 13: left.elbow, 15: left.wrist, 23: left.hip, 25: left.knee, 27: left.ankle,
    12: back(r.shoulder), 14: back(r.elbow), 16: back(r.wrist), 24: back(r.hip), 26: back(r.knee), 28: back(r.ankle),
  };
}

// Side view, arms straight, body in a line: shoulders above the hands, feet to the right
export const PLANK: Side = {
  shoulder: [0, 0],
  elbow: [0, 0.28],
  wrist: [0, 0.55],
  hip: [0.5, 0.05],
  knee: [0.95, 0.1],
  ankle: [1.4, 0.15],
};

// Standing straight, arms down
export const STANDING: Side = {
  shoulder: [0, 0],
  elbow: [0, 0.28],
  wrist: [0, 0.55],
  hip: [0, 0.5],
  knee: [0, 0.95],
  ankle: [0, 1.4],
};
