import { LM, limbLength, midpoint, tiltFromVertical } from '../utils/pose/poseMath';
import type { Exercise } from './types';

// Filmed straight on (the only supported camera position). The hips and legs are behind the
// shoulders: the model GUESSES them, even with a high visibility score (it read a real plank as
// a knee push-up on a real phone). So kneeling and raised hips are NOT checked; reps are protected
// by the elbow depth, the body drop, the hands staying in place and both arms moving together.

// Back at least this far from the camera's vertical = lying on the floor, not standing
const PLANK_MIN_TILT = 40;
// A guessed hip is still good enough to tell lying from standing
const HIP_SLOPE_VISIBILITY = 0.2;
// With straight arms the hands are at least this far (meters) below the shoulders
const HANDS_BELOW_SHOULDERS = 0.1;

export const PUSH_UP: Exercise = {
  id: 'PUSH_UP',
  label: 'Hít đất',
  sides: [
    [11, 13, 15], // shoulder - elbow - wrist
    [12, 14, 16],
  ],
  // Filmed straight on, the model underestimates the elbow bend (the forearm points at the
  // camera): chest touching the floor measured only ~100-105 on a phone, never 90.
  // 120 chosen after testing; real depth is also guarded by the body drop (minDropRatio).
  downBelow: 120,
  upAbove: 150, // fast reps rarely lock the elbows fully
  formRules: [],
  // Hands only: the feet are hidden and their guessed position jumps, which looked like leaving the spot
  anchors: [15, 16],
  // Measured on a phone: chest to the floor ~42% of the arm, a half rep ~20% -> 30% in between
  minDropRatio: 0.3,
  dropMessage: 'Hạ cả người xuống, không chỉ gập tay',
  setupHint: 'Vào tư thế plank, tay thẳng, giữ yên 1 giây',
  cameraHint:
    'Đặt điện thoại dưới sàn ngay trước mặt, cách khoảng 1–1,5 m, dựng hơi ngửa lên ' +
    'để thấy đầu, vai và hai tay.',

  // Hands under the shoulders is only judged with straight arms (atTop): at the bottom of a rep
  // the shoulders come down level with the hands
  checkPosture({ image, world, atTop }) {
    const shoulders = midpoint(image, world, LM.SHOULDERS);
    const hips = midpoint(image, world, LM.HIPS, HIP_SLOPE_VISIBILITY);
    if (!shoulders || !hips) return { posture: { kind: 'unknown' }, tilt: null };
    const tilt = tiltFromVertical(hips, shoulders);
    if (Number.isNaN(tilt)) return { posture: { kind: 'unknown' }, tilt: null };
    if (tilt < PLANK_MIN_TILT) return { posture: { kind: 'bad', message: 'Vào tư thế nằm sấp chống tay (plank)' }, tilt };

    const wrists = midpoint(image, world, LM.WRISTS);
    if (!wrists) return { posture: { kind: 'unknown' }, tilt };
    // World y points down: hands on the floor are below (greater y than) the shoulders
    if (atTop && wrists.y - shoulders.y < HANDS_BELOW_SHOULDERS) {
      return { posture: { kind: 'bad', message: 'Chống hai tay xuống sàn' }, tilt };
    }
    return { posture: { kind: 'ok' }, tilt };
  },

  // Shoulders above the hands; compared to the whole arm (shoulder - elbow - wrist)
  measureHeight({ image, world }) {
    const shoulders = midpoint(image, world, LM.SHOULDERS);
    const wrists = midpoint(image, world, LM.WRISTS);
    return {
      height: shoulders && wrists ? wrists.y - shoulders.y : null,
      limb: limbLength(world, [[11, 13, 15], [12, 14, 16]]),
    };
  },
};
