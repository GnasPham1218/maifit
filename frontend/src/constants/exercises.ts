// Exercises the rep counter supports. Angles are inner joint angles in 3D (180 = straight),
// measured on MediaPipe world landmarks, so the camera can face the person or be at the side.
// Two counting thresholds far apart (hysteresis): an angle shaking around one value never counts twice.

export type ExerciseId = 'SQUAT' | 'PUSH_UP';

// [first point, joint, last point] as MediaPipe Pose landmark indices (33-point model)
export type JointChain = readonly [number, number, number];

// A body line that must stay straight during the whole rep, or the rep is not counted
export interface FormRule {
  sides: readonly JointChain[]; // left and right; the better seen one is checked
  minAngle: number;
  message: string; // shown while the rule is broken
}

// The body position the exercise is done in (checked every frame, see analyzeFrame).
// Doing something else (curling the arms standing up "as push-ups") pauses counting.
export type PostureKind =
  | 'PLANK' // body roughly horizontal, hands under the shoulders
  | 'STANDING'; // torso roughly upright

export interface ExerciseConfig {
  id: ExerciseId;
  label: string;
  sides: readonly JointChain[]; // the joint that counts reps, left and right
  downBelow: number; // angle under this = bottom of the rep
  upAbove: number; // angle over this = top of the rep (a rep is counted here)
  formRules: readonly FormRule[];
  posture: PostureKind;
  anchors: readonly number[]; // points that stay in place during a set (hands, feet)
  // The body must really go down: the drop of a height (shoulders above the hands, hips above
  // the feet) must be at least this share of a limb length (arm, thigh), or the rep is refused
  minDropRatio: number;
  dropMessage: string;
  setupHint: string; // what to do to be "in position" before counting starts
  cameraHint: string;
}

// MediaPipe indices: 11/12 shoulders, 13/14 elbows, 15/16 wrists, 23/24 hips, 25/26 knees, 27/28 ankles
export const EXERCISES: Record<ExerciseId, ExerciseConfig> = {
  SQUAT: {
    id: 'SQUAT',
    label: 'Squat',
    sides: [
      [23, 25, 27], // hip - knee - ankle
      [24, 26, 28],
    ],
    downBelow: 100,
    upAbove: 160,
    formRules: [],
    posture: 'STANDING',
    anchors: [27, 28], // feet
    minDropRatio: 0.25,
    dropMessage: 'Hạ hông xuống thật, không chỉ co gối',
    setupHint: 'Đứng thẳng, hai chân rộng bằng vai, đứng yên 1 giây',
    cameraHint: 'Đứng chính diện hoặc nghiêng so với camera, cách khoảng 2–3 m, thấy cả người từ đầu tới bàn chân.',
  },
  PUSH_UP: {
    id: 'PUSH_UP',
    label: 'Hít đất',
    sides: [
      [11, 13, 15], // shoulder - elbow - wrist
      [12, 14, 16],
    ],
    downBelow: 90,
    upAbove: 150, // fast reps rarely lock the elbows fully
    // Filmed straight from the front the legs are hidden behind the shoulders, so straight legs
    // are checked through the posture instead (a back sloping like a knee push-up is refused)
    formRules: [],
    posture: 'PLANK',
    anchors: [15, 16, 27, 28], // hands and feet
    minDropRatio: 0.25,
    dropMessage: 'Hạ cả người xuống, không chỉ gập tay',
    setupHint: 'Vào tư thế plank, tay thẳng, giữ yên 1 giây',
    cameraHint:
      'Đặt điện thoại dưới sàn ngay trước mặt, cách khoảng 1–1,5 m, dựng hơi ngửa lên ' +
      'để thấy đầu, vai, hai tay và lưng.',
  },
};

export const EXERCISE_IDS = Object.keys(EXERCISES) as ExerciseId[];
