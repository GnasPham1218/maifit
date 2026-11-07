// Exercises the rep counter supports. Thresholds are inner joint angles (180 = straight),
// see docs: squat half depth starts around 100 degrees, a push-up rep goes to 90 degrees at the elbow.
// Two thresholds far apart (hysteresis): an angle shaking around one value can never count twice.

export type ExerciseId = 'SQUAT' | 'PUSH_UP';

// [first point, joint, last point] as MediaPipe Pose landmark indices (33-point model)
export type JointChain = readonly [number, number, number];

export interface ExerciseConfig {
  id: ExerciseId;
  label: string;
  sides: readonly JointChain[]; // left and right chain; the more visible one is used
  downBelow: number; // angle under this = bottom of the rep
  upAbove: number; // angle over this = top of the rep (a rep is counted here)
  cameraHint: string;
}

// MediaPipe indices: 11/12 shoulders, 13/14 elbows, 15/16 wrists, 23/24 hips, 25/26 knees, 27/28 ankles
export const EXERCISES: Record<ExerciseId, ExerciseConfig> = {
  SQUAT: {
    id: 'SQUAT',
    label: 'Squat',
    sides: [
      [23, 25, 27], // left hip - knee - ankle
      [24, 26, 28],
    ],
    downBelow: 100,
    upAbove: 160,
    cameraHint: 'Đặt điện thoại ngang hông, đứng nghiêng so với camera, thấy cả người từ đầu tới bàn chân.',
  },
  PUSH_UP: {
    id: 'PUSH_UP',
    label: 'Hít đất',
    sides: [
      [11, 13, 15], // left shoulder - elbow - wrist
      [12, 14, 16],
    ],
    downBelow: 90,
    upAbove: 160,
    cameraHint: 'Đặt điện thoại dưới sàn, nhìn ngang từ bên cạnh, thấy cả người từ đầu tới gót chân.',
  },
};

export const EXERCISE_IDS = Object.keys(EXERCISES) as ExerciseId[];
