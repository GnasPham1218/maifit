import type { ExerciseConfig, JointChain } from '../../constants/exercises';
import { jointAngle, type Point } from './angle';

// The fields of a MediaPipe landmark this file uses (NormalizedLandmark and world Landmark)
export interface Landmark extends Point {
  visibility?: number; // 0..1, how likely the point is visible (not hidden or out of frame)
}

// Below this a point is a guess by the model: no angle is better than a wrong one
export const MIN_VISIBILITY = 0.6;
// Form checks accept slightly less visible points (legs are often half hidden on the floor),
// but not hidden ones: facing the camera in a push-up, the shoulders cover the legs
export const MIN_FORM_VISIBILITY = 0.5;

export type FormResult = { kind: 'ok' } | { kind: 'bad'; message: string } | { kind: 'unknown' };

export interface FrameAnalysis {
  angle: number | null; // the counting joint, null when not seen well enough
  joint: Point | null; // that joint on screen (normalized 0..1), to draw the angle next to it
  form: FormResult;
}

interface Measured {
  angle: number;
  joint: Point;
  visibility: number;
}

// The angle of one chain on the better seen side.
// Angles come from the WORLD landmarks: 3D in meters, centered on the hips. A joint bending
// towards the camera (a knee in a squat filmed from the front) barely changes in 2D, but does in 3D.
// Visibility comes from the image landmarks: it says whether the point is really seen in this frame.
function measure(
  image: readonly Landmark[],
  world: readonly Landmark[],
  sides: readonly JointChain[],
  minVisibility: number,
): Measured | null {
  let best: Measured | null = null;
  for (const [ia, ib, ic] of sides) {
    const a = image[ia];
    const b = image[ib];
    const c = image[ic];
    const wa = world[ia];
    const wb = world[ib];
    const wc = world[ic];
    if (!a || !b || !c || !wa || !wb || !wc) continue;

    const visibility = Math.min(a.visibility ?? 0, b.visibility ?? 0, c.visibility ?? 0);
    if (visibility < minVisibility) continue;

    const angle = jointAngle(wa, wb, wc);
    if (Number.isNaN(angle)) continue;
    if (!best || visibility > best.visibility) best = { angle, joint: { x: b.x, y: b.y }, visibility };
  }
  return best;
}

// Everything the counter needs from one camera frame.
// image: result.landmarks[0] (normalized), world: result.worldLandmarks[0] (meters), same indices.
export function analyzeFrame(
  image: readonly Landmark[] | undefined,
  world: readonly Landmark[] | undefined,
  exercise: Pick<ExerciseConfig, 'sides' | 'formRules'>,
): FrameAnalysis {
  if (!image || !world) return { angle: null, joint: null, form: { kind: 'unknown' } };

  const counting = measure(image, world, exercise.sides, MIN_VISIBILITY);

  let form: FormResult = { kind: 'ok' };
  for (const rule of exercise.formRules) {
    const line = measure(image, world, rule.sides, MIN_FORM_VISIBILITY);
    if (!line) {
      form = { kind: 'unknown' }; // cannot see it: say so, never guess
      continue;
    }
    if (line.angle < rule.minAngle) {
      form = { kind: 'bad', message: rule.message }; // first broken rule wins
      break;
    }
  }

  return { angle: counting?.angle ?? null, joint: counting?.joint ?? null, form };
}
