import { describe, expect, it } from 'vitest';
import { analyzeFrame } from '../utils/pose/analyzeFrame';
import { body, PLANK, STANDING, twoSides } from '../utils/pose/testPoses';
import { PUSH_UP } from './pushUp';

const FRAME = { width: 1000, height: 1000 };

// Same points as image and world landmarks keeps the tests readable
const analyze = (points: ReturnType<typeof body>) => analyzeFrame(points, points, PUSH_UP, FRAME);

describe('push-up posture', () => {
  it('a plank is a push-up posture', () => {
    expect(analyze(body(twoSides(PLANK))).posture).toEqual({ kind: 'ok' });
  });

  it('bending the arms while standing is not a push-up', () => {
    const curl = { ...STANDING, wrist: [0.27, 0.28] as const };
    expect(analyze(body(twoSides(curl))).posture.kind).toBe('bad');
  });

  it('a plank with the hands not under the shoulders is refused', () => {
    const handsForward = { ...PLANK, elbow: [-0.28, 0] as const, wrist: [-0.55, 0] as const };
    expect(analyze(body(twoSides(handsForward))).posture).toEqual({ kind: 'bad', message: 'Chống hai tay xuống sàn' });
  });

  it('a phone tilted 25 degrees still sees a plank', () => {
    const r = (25 * Math.PI) / 180;
    const rotate = ([x, y]: readonly [number, number, number?]) =>
      [x * Math.cos(r) - y * Math.sin(r), x * Math.sin(r) + y * Math.cos(r)] as const;
    const tilted = Object.fromEntries(Object.entries(PLANK).map(([k, v]) => [k, rotate(v)])) as unknown as typeof PLANK;
    expect(analyze(body(twoSides(tilted))).posture).toEqual({ kind: 'ok' });
  });

  it('a real plank whose hidden hips the model guesses wrongly is still a plank', () => {
    // filmed straight on, the model drew the hips as for a knee push-up (seen on a real phone)
    const guessed = { ...PLANK, hip: [0.35, 0.3] as const };
    expect(analyze(body(twoSides(guessed))).posture).toEqual({ kind: 'ok' });
  });

  it('posture is unknown when the hips are not seen at all', () => {
    expect(analyze(body(twoSides(PLANK), { 23: 0.1, 24: 0.1 })).posture).toEqual({ kind: 'unknown' });
  });

  it('the bottom of a rep (shoulders level with the hands) is still a push-up posture', () => {
    const bottom = { ...PLANK, shoulder: [0, 0.5] as const, elbow: [-0.25, 0.35] as const, hip: [0.5, 0.52] as const };
    expect(analyze(body(twoSides(bottom))).posture).toEqual({ kind: 'ok' });
  });
});

describe('push-up body height', () => {
  it('push-up height = shoulders above the hands, compared to the arm length', () => {
    const result = analyze(body(twoSides(PLANK)));
    expect(result.height).toBeCloseTo(0.55);
    expect(result.limb).toBeCloseTo(0.55);
  });

});
