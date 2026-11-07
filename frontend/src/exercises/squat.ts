import { LM, limbLength, midpoint, MIN_SOFT_VISIBILITY, seen, tiltFromVertical } from '../utils/pose/poseMath';
import type { Exercise } from './types';

// The back may lean this far from the camera's vertical: a deep squat leans ~45 degrees,
// plus up to ~25 when the phone looks up from the floor
const STANDING_MAX_TILT = 70;

export const SQUAT: Exercise = {
  id: 'SQUAT',
  label: 'Squat',
  sides: [
    [23, 25, 27], // hip - knee - ankle
    [24, 26, 28],
  ],
  downBelow: 100,
  // Measured standing straight on a phone: ~159 in 3D (the model never reads a fully locked
  // knee), so the top is 150, still 50 degrees above the bottom
  upAbove: 150,
  formRules: [],
  anchors: [27, 28], // feet
  minDropRatio: 0.25, // first value tried; push-ups were tuned from real numbers, squats not yet
  dropMessage: 'Hạ hông xuống thật, không chỉ co gối',
  setupHint: 'Đứng thẳng, hai chân rộng bằng vai, đứng yên 1 giây',
  cameraHint: 'Đứng chính diện hoặc nghiêng so với camera, cách khoảng 2–3 m, thấy cả người từ đầu tới bàn chân.',

  checkPosture({ image, world }) {
    const shoulders = midpoint(image, world, LM.SHOULDERS);
    const hips = midpoint(image, world, LM.HIPS);
    if (!shoulders || !hips) return { posture: { kind: 'unknown' }, tilt: null };
    const tilt = tiltFromVertical(hips, shoulders);
    if (Number.isNaN(tilt)) return { posture: { kind: 'unknown' }, tilt: null };
    return {
      posture: tilt <= STANDING_MAX_TILT ? { kind: 'ok' } : { kind: 'bad', message: 'Đứng thẳng người lên' },
      tilt,
    };
  },

  // Hips above the LOWER foot: lifting one foot must not look like the hips going down.
  // A difference of two world points, so it does not move with the hip-centered origin.
  measureHeight({ image, world }) {
    const hips = midpoint(image, world, LM.HIPS);
    const feet = LM.ANKLES.filter((i) => seen(image, i, MIN_SOFT_VISIBILITY) && world[i]).map((i) => world[i]!);
    const floor = feet.length ? Math.max(...feet.map((p) => p.y)) : null;
    return {
      height: hips && floor != null ? floor - hips.y : null,
      limb: limbLength(world, [[23, 25], [24, 26]]), // thigh
    };
  },
};
