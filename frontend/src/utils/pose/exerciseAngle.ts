import type { ExerciseConfig } from '../../constants/exercises';
import { jointAngle } from './angle';

// The fields of a MediaPipe NormalizedLandmark this file uses
export interface Landmark {
  x: number; // 0..1 of the frame width
  y: number; // 0..1 of the frame height
  visibility?: number; // 0..1, how likely the point is visible (not hidden or out of frame)
}

// Below this, a point is a guess by the model: no angle is better than a wrong one
export const MIN_VISIBILITY = 0.6;

// Angle of the exercise's joint in this frame, or null when the body is not seen well enough.
// Filmed from the side, one arm/leg hides the other, so the side the camera sees best is used.
//
// x and y are normalized by different lengths (width vs height): on a 16:9 frame one unit of x
// is 1.78 times longer than one unit of y. Measuring the angle on raw x/y would bend it,
// so the points are converted to pixels first.
export function exerciseAngle(
  landmarks: readonly Landmark[] | undefined,
  exercise: Pick<ExerciseConfig, 'sides'>,
  frameWidth: number,
  frameHeight: number,
  minVisibility = MIN_VISIBILITY,
): number | null {
  if (!landmarks) return null;

  let best: { angle: number; visibility: number } | null = null;
  for (const [ia, ib, ic] of exercise.sides) {
    const a = landmarks[ia];
    const b = landmarks[ib];
    const c = landmarks[ic];
    if (!a || !b || !c) continue;

    const visibility = Math.min(a.visibility ?? 0, b.visibility ?? 0, c.visibility ?? 0);
    if (visibility < minVisibility) continue;

    const toPx = (p: Landmark) => ({ x: p.x * frameWidth, y: p.y * frameHeight });
    const angle = jointAngle(toPx(a), toPx(b), toPx(c));
    if (Number.isNaN(angle)) continue;

    if (!best || visibility > best.visibility) best = { angle, visibility };
  }
  return best ? best.angle : null;
}
