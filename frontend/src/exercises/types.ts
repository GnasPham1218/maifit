import type { Check, Pose } from '../utils/pose/poseMath';

// Every exercise implements this interface (Strategy pattern): the shared pose code
// (analyzeFrame, repCounter, workoutSession) never asks which exercise it is.
// Adding an exercise = a new file + one line in index.ts, nothing else changes.

export type ExerciseId = 'SQUAT' | 'PUSH_UP';

// [first point, joint, last point] as MediaPipe Pose landmark indices (33-point model)
export type JointChain = readonly [number, number, number];

// A body line that must stay straight during the whole rep, or the rep is not counted
export interface FormRule {
  sides: readonly JointChain[]; // left and right; the better seen one is checked
  minAngle: number;
  message: string; // shown while the rule is broken
}

// What an exercise gets to judge one frame
export interface PoseInput {
  image: Pose; // normalized landmarks: positions on screen + visibility
  world: Pose; // world landmarks: 3D meters, centered on the hips (y points down)
  atTop: boolean; // the counting angle is at the top of the movement
}

export interface PostureResult {
  posture: Check; // in the exercise's body position, or why not
  tilt: number | null; // degrees the back leans from the camera's vertical (shown with "Hiện số đo")
}

export interface HeightResult {
  height: number | null; // meters of a body height that must drop during a rep
  limb: number | null; // meters of the limb the drop is compared to
}

export interface Exercise {
  id: ExerciseId;
  label: string;
  // Counting: angles are inner joint angles in 3D (180 = straight). Two thresholds far apart
  // (hysteresis): an angle shaking around one value never counts twice.
  sides: readonly JointChain[]; // the joint that counts reps, left and right
  downBelow: number; // angle under this = bottom of the rep
  upAbove: number; // angle over this = top of the rep (a rep is counted here)
  formRules: readonly FormRule[];
  anchors: readonly number[]; // points that stay in place during a set (hands, feet)
  // The body must really go down: the drop of `height` must be at least this share of `limb`
  minDropRatio: number;
  dropMessage: string;
  setupHint: string; // what to do to be "in position" before counting starts
  cameraHint: string;
  // Is the person in this exercise's body position (doing something else pauses counting)?
  checkPosture(input: PoseInput): PostureResult;
  // The body height whose drop proves a real rep
  measureHeight(input: PoseInput): HeightResult;
}
