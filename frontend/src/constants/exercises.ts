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

export interface ExerciseConfig {
  id: ExerciseId;
  label: string;
  sides: readonly JointChain[]; // the joint that counts reps, left and right
  downBelow: number; // angle under this = bottom of the rep
  upAbove: number; // angle over this = top of the rep (a rep is counted here)
  formRules: readonly FormRule[];
  cameraHint: string;
}

// Straight enough for a body line or a leg; first value tried, tune after real tests
const STRAIGHT = 150;

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
    formRules: [
      {
        sides: [
          [11, 23, 27], // shoulder - hip - ankle: no sagging or piked hips
          [12, 24, 28],
        ],
        minAngle: STRAIGHT,
        message: 'Giữ thẳng người, không võng hay đẩy hông',
      },
      {
        sides: [
          [23, 25, 27], // hip - knee - ankle: knees must not touch the floor
          [24, 26, 28],
        ],
        minAngle: STRAIGHT,
        message: 'Giữ thẳng chân, không quỳ gối',
      },
    ],
    cameraHint:
      'Đặt điện thoại dưới sàn, chéo khoảng 45° phía trước hoặc ngang bên cạnh, thấy cả người từ đầu tới chân. ' +
      'Đặt thẳng chính diện thì vai che chân nên app không kiểm tra được chân thẳng.',
  },
};

export const EXERCISE_IDS = Object.keys(EXERCISES) as ExerciseId[];
