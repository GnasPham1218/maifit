import type { Exercise, JointChain } from '../../exercises/types';
import { jointAngle, type Point } from './angle';
import { MIN_SOFT_VISIBILITY, MIN_VISIBILITY, seen, type Check, type Landmark, type Pose } from './poseMath';

export type { Check, Landmark } from './poseMath';

// Left and right counting angles further apart than this = one-sided movement
const MAX_SIDE_DIFF = 30;

export interface FrameAnalysis {
  angle: number | null; // the counting joint, null when not seen well enough
  joint: Point | null; // that joint on screen (normalized 0..1), to draw the angle next to it
  form: Check; // straight body lines + both sides moving together
  posture: Check; // in the exercise's body position (see Exercise.checkPosture)
  tilt: number | null; // degrees the back leans from the camera's vertical (shown with "Hiện số đo")
  height: number | null; // meters, see Exercise.measureHeight
  limb: number | null; // meters, what the height drop is compared to
  anchors: (Point | null)[]; // exercise.anchors on screen, in pixels; null when not seen
  scale: number | null; // pixels: size of the seen body on screen, to judge how far an anchor moved
}

export const EMPTY_ANALYSIS: FrameAnalysis = {
  angle: null,
  joint: null,
  form: { kind: 'unknown' },
  posture: { kind: 'unknown' },
  tilt: null,
  height: null,
  limb: null,
  anchors: [],
  scale: null,
};

interface Measured {
  angle: number;
  joint: Point;
  visibility: number;
}

// Angle of one chain per side that is seen well enough.
// Angles come from the WORLD landmarks: 3D in meters, centered on the hips. A joint bending
// towards the camera (a knee in a squat filmed from the front) barely changes in 2D, but does in 3D.
// Visibility comes from the image landmarks: it says whether the point is really seen in this frame.
function measureSides(image: Pose, world: Pose, sides: readonly JointChain[], min: number): Measured[] {
  const result: Measured[] = [];
  for (const [ia, ib, ic] of sides) {
    const b = image[ib];
    const [wa, wb, wc] = [world[ia], world[ib], world[ic]];
    if (!b || !wa || !wb || !wc) continue;
    const visibility = Math.min(image[ia]?.visibility ?? 0, b.visibility ?? 0, image[ic]?.visibility ?? 0);
    if (visibility < min) continue;
    const angle = jointAngle(wa, wb, wc);
    if (!Number.isNaN(angle)) result.push({ angle, joint: { x: b.x, y: b.y }, visibility });
  }
  return result;
}

const best = (measured: Measured[]) =>
  measured.reduce<Measured | null>((top, m) => (!top || m.visibility > top.visibility ? m : top), null);

function checkForm(image: Pose, world: Pose, exercise: Exercise, counting: Measured[]): Check {
  let form: Check = { kind: 'ok' };
  for (const rule of exercise.formRules) {
    const line = best(measureSides(image, world, rule.sides, MIN_SOFT_VISIBILITY));
    if (!line) {
      form = { kind: 'unknown' }; // cannot see it: say so, never guess
      continue;
    }
    if (line.angle < rule.minAngle) return { kind: 'bad', message: rule.message };
  }
  // Both sides clearly seen: they must move together (no one-arm or one-leg tricks)
  if (counting.length === 2 && Math.abs(counting[0].angle - counting[1].angle) > MAX_SIDE_DIFF) {
    return { kind: 'bad', message: 'Làm đều hai bên' };
  }
  return form;
}

// Everything the counter needs from one camera frame. The exercise-specific parts (posture,
// body height) are asked to the exercise itself; this function does not know which one it is.
// image: result.landmarks[0] (normalized), world: result.worldLandmarks[0] (meters), same indices.
// frame: the video size in pixels, to measure anchors and the body on screen.
export function analyzeFrame(
  image: Pose | undefined,
  world: Pose | undefined,
  exercise: Exercise,
  frame: { width: number; height: number },
): FrameAnalysis {
  if (!image || !world) return EMPTY_ANALYSIS;

  const counting = measureSides(image, world, exercise.sides, MIN_VISIBILITY);
  const main = best(counting);
  const input = { image, world, atTop: main != null && main.angle > exercise.upAbove };

  const toPx = (p: Landmark): Point => ({ x: p.x * frame.width, y: p.y * frame.height });
  const anchors = exercise.anchors.map((i) => (seen(image, i, MIN_SOFT_VISIBILITY) ? toPx(image[i]!) : null));

  // Body size on screen: diagonal of the box around the seen points
  const visible = image.filter((p) => (p.visibility ?? 0) >= MIN_SOFT_VISIBILITY).map(toPx);
  const scale = visible.length >= 4
    ? Math.hypot(
      Math.max(...visible.map((p) => p.x)) - Math.min(...visible.map((p) => p.x)),
      Math.max(...visible.map((p) => p.y)) - Math.min(...visible.map((p) => p.y)),
    )
    : null;

  return {
    angle: main?.angle ?? null,
    joint: main?.joint ?? null,
    form: checkForm(image, world, exercise, counting),
    ...exercise.checkPosture(input),
    ...exercise.measureHeight(input),
    anchors,
    scale,
  };
}
