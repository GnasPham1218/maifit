import type { ExerciseConfig, JointChain } from '../../constants/exercises';
import { jointAngle, type Point } from './angle';

// The fields of a MediaPipe landmark this file uses (NormalizedLandmark and world Landmark)
export interface Landmark extends Point {
  visibility?: number; // 0..1, how likely the point is visible (not hidden or out of frame)
}

// Below this a point is a guess by the model: no angle is better than a wrong one
export const MIN_VISIBILITY = 0.6;
// Form, posture and anchors accept less visible points (legs are often half hidden on the floor),
// but not hidden ones: facing the camera in a push-up, the shoulders cover the legs
export const MIN_SOFT_VISIBILITY = 0.5;

// The camera is rarely level (a phone on the floor looks up ~20-30 degrees), and world "vertical"
// is the camera's vertical. So slopes against vertical are only used for coarse checks
// (lying vs standing), and the fine plank check uses an angle inside the body instead.
const PLANK_MIN_TILT = 40; // back at least this far from vertical: down on the floor, not standing
// Squat: the back may lean this far (a deep squat leans ~45, plus up to ~25 of camera tilt)
const STANDING_MAX_TILT = 70;
// Filmed straight on, the hips and legs are behind the shoulders: the model GUESSES them, even
// with a high visibility score (it read a real plank as a knee push-up). So kneeling or raised hips
// are NOT checked for push-ups; the reps are protected by the arm depth, the body drop and the
// hands staying in place instead.
const HIP_SLOPE_VISIBILITY = 0.2; // a guessed hip is still good enough to tell lying from standing

// Plank: hands at least this far (meters) below the shoulders
const HANDS_BELOW_SHOULDERS = 0.1;
// Left and right counting angles further apart than this = one-sided movement
const MAX_SIDE_DIFF = 30;

export type Check = { kind: 'ok' } | { kind: 'bad'; message: string } | { kind: 'unknown' };
export type FormResult = Check;

export interface FrameAnalysis {
  angle: number | null; // the counting joint, null when not seen well enough
  joint: Point | null; // that joint on screen (normalized 0..1), to draw the angle next to it
  form: Check; // straight body lines + both sides moving together
  posture: Check; // in the exercise's body position (plank / standing)
  tilt: number | null; // degrees the back leans from the camera's vertical (shown with "Hiện số đo")
  height: number | null; // meters: shoulders above the hands (push-up) / hips above the feet (squat)
  limb: number | null; // meters: arm (push-up) / thigh (squat), what the height drop is compared to
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

type Pose = readonly Landmark[];

const seen = (image: Pose, i: number, min: number) => (image[i]?.visibility ?? 0) >= min;

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0));

// Middle of the listed points that are seen enough (world coordinates); null if none is
function midpoint(image: Pose, world: Pose, indices: readonly number[], min = MIN_SOFT_VISIBILITY): Point | null {
  const points = indices.filter((i) => seen(image, i, min) && world[i]).map((i) => world[i]!);
  if (points.length === 0) return null;
  const sum = points.reduce((s, p) => ({ x: s.x + p.x, y: s.y + p.y, z: (s.z ?? 0) + (p.z ?? 0) }), { x: 0, y: 0, z: 0 });
  return { x: sum.x / points.length, y: sum.y / points.length, z: (sum.z ?? 0) / points.length };
}

// Angle between a segment and the vertical, 0 (upright) .. 90 (flat).
// World y points down along the camera's vertical, so the phone must stand upright (not tilted much).
function tiltFromVertical(from: Point, to: Point): number {
  const len = dist(from, to);
  if (len === 0) return NaN;
  return (Math.acos(Math.min(1, Math.abs(to.y - from.y) / len)) * 180) / Math.PI;
}

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

function checkForm(image: Pose, world: Pose, exercise: ExerciseConfig, counting: Measured[]): Check {
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

const SHOULDERS = [11, 12];
const WRISTS = [15, 16];
const HIPS = [23, 24];

interface PostureResult {
  posture: Check;
  tilt: number | null;
}

// armsStraight: the counting angle is at the top. Hands under the shoulders is only judged there,
// because at the bottom of a rep the shoulders come down level with the hands.
function checkPosture(image: Pose, world: Pose, exercise: ExerciseConfig, armsStraight: boolean): PostureResult {
  const unknown: PostureResult = { posture: { kind: 'unknown' }, tilt: null };
  const shoulders = midpoint(image, world, SHOULDERS);
  const hips = midpoint(image, world, HIPS, exercise.posture === 'PLANK' ? HIP_SLOPE_VISIBILITY : MIN_SOFT_VISIBILITY);
  if (!shoulders || !hips) return unknown;
  const tilt = tiltFromVertical(hips, shoulders);
  if (Number.isNaN(tilt)) return unknown;
  const result = (posture: Check): PostureResult => ({ posture, tilt });

  if (exercise.posture === 'STANDING') {
    return result(tilt <= STANDING_MAX_TILT ? { kind: 'ok' } : { kind: 'bad', message: 'Đứng thẳng người lên' });
  }
  if (tilt < PLANK_MIN_TILT) return result({ kind: 'bad', message: 'Vào tư thế nằm sấp chống tay (plank)' });
  const wrists = midpoint(image, world, WRISTS);
  if (!wrists) return { ...unknown, tilt };
  // World y points down: hands on the floor are below (greater y than) the shoulders
  if (armsStraight && wrists.y - shoulders.y < HANDS_BELOW_SHOULDERS) {
    return result({ kind: 'bad', message: 'Chống hai tay xuống sàn' });
  }
  return result({ kind: 'ok' });
}

// Average length (meters) of a chain of segments over the sides listed, e.g. shoulder-elbow-wrist
function limbLength(world: Pose, chains: readonly (readonly number[])[]): number | null {
  const lengths = chains
    .filter((chain) => chain.every((i) => world[i]))
    .map((chain) => chain.slice(1).reduce((sum, i, k) => sum + dist(world[chain[k]]!, world[i]!), 0));
  return lengths.length ? lengths.reduce((s, l) => s + l, 0) / lengths.length : null;
}

// Heights are differences of two world points, so they do not move with the hip-centered origin
function measureHeight(image: Pose, world: Pose, exercise: ExerciseConfig): { height: number | null; limb: number | null } {
  if (exercise.posture === 'PLANK') {
    const shoulders = midpoint(image, world, SHOULDERS);
    const wrists = midpoint(image, world, WRISTS);
    return {
      height: shoulders && wrists ? wrists.y - shoulders.y : null,
      limb: limbLength(world, [[11, 13, 15], [12, 14, 16]]), // whole arm
    };
  }
  const hips = midpoint(image, world, HIPS);
  // The lower foot is the floor: lifting one foot must not look like the hips going down
  const feet = [27, 28].filter((i) => seen(image, i, MIN_SOFT_VISIBILITY) && world[i]).map((i) => world[i]!);
  const floor = feet.length ? Math.max(...feet.map((p) => p.y)) : null;
  return {
    height: hips && floor != null ? floor - hips.y : null,
    limb: limbLength(world, [[23, 25], [24, 26]]), // thigh
  };
}

// Everything the counter needs from one camera frame.
// image: result.landmarks[0] (normalized), world: result.worldLandmarks[0] (meters), same indices.
// frame: the video size in pixels, to measure anchors and the body on screen.
export function analyzeFrame(
  image: Pose | undefined,
  world: Pose | undefined,
  exercise: ExerciseConfig,
  frame: { width: number; height: number },
): FrameAnalysis {
  if (!image || !world) return EMPTY_ANALYSIS;

  const counting = measureSides(image, world, exercise.sides, MIN_VISIBILITY);
  const main = best(counting);

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
    ...checkPosture(image, world, exercise, main != null && main.angle > exercise.upAbove),
    ...measureHeight(image, world, exercise),
    anchors,
    scale,
  };
}
