// Small helpers shared by the pose analysis and every exercise. No MediaPipe import.
import type { Point } from './angle';

// The fields of a MediaPipe landmark used here (NormalizedLandmark and world Landmark)
export interface Landmark extends Point {
  visibility?: number; // 0..1, how likely the point is visible (not hidden or out of frame)
}

export type Pose = readonly Landmark[];

// Result of a check that may not be decidable from what the camera sees
export type Check = { kind: 'ok' } | { kind: 'bad'; message: string } | { kind: 'unknown' };

// Below this a point is a guess by the model: no angle is better than a wrong one
export const MIN_VISIBILITY = 0.6;
// Form, posture and anchors accept less visible points (legs are often half hidden on the floor),
// but not hidden ones
export const MIN_SOFT_VISIBILITY = 0.5;

// MediaPipe Pose (33 points), left then right
export const LM = {
  SHOULDERS: [11, 12],
  ELBOWS: [13, 14],
  WRISTS: [15, 16],
  HIPS: [23, 24],
  KNEES: [25, 26],
  ANKLES: [27, 28],
} as const;

export const seen = (image: Pose, i: number, min: number) => (image[i]?.visibility ?? 0) >= min;

export const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0));

// Middle of the listed points that are seen enough (world coordinates); null if none is
export function midpoint(image: Pose, world: Pose, indices: readonly number[], min = MIN_SOFT_VISIBILITY): Point | null {
  const points = indices.filter((i) => seen(image, i, min) && world[i]).map((i) => world[i]!);
  if (points.length === 0) return null;
  const sum = points.reduce((s, p) => ({ x: s.x + p.x, y: s.y + p.y, z: (s.z ?? 0) + (p.z ?? 0) }), { x: 0, y: 0, z: 0 });
  return { x: sum.x / points.length, y: sum.y / points.length, z: (sum.z ?? 0) / points.length };
}

// Angle between a segment and the vertical, 0 (upright) .. 90 (flat).
// World y points down along the CAMERA's vertical: a phone on the floor looking up ~20-30 degrees
// shifts it, so this is only good for coarse checks (lying vs standing).
export function tiltFromVertical(from: Point, to: Point): number {
  const len = dist(from, to);
  if (len === 0) return NaN;
  return (Math.acos(Math.min(1, Math.abs(to.y - from.y) / len)) * 180) / Math.PI;
}

// Average length (meters) of a chain of segments over the sides listed, e.g. shoulder-elbow-wrist
export function limbLength(world: Pose, chains: readonly (readonly number[])[]): number | null {
  const lengths = chains
    .filter((chain) => chain.every((i) => world[i]))
    .map((chain) => chain.slice(1).reduce((sum, i, k) => sum + dist(world[chain[k]]!, world[i]!), 0));
  return lengths.length ? lengths.reduce((s, l) => s + l, 0) / lengths.length : null;
}
