import { describe, expect, it } from 'vitest';
import { analyzeFrame } from '../utils/pose/analyzeFrame';
import { body, PLANK, STANDING, twoSides } from '../utils/pose/testPoses';
import { SQUAT } from './squat';

const FRAME = { width: 1000, height: 1000 };

// Same points as image and world landmarks keeps the tests readable
const analyze = (points: ReturnType<typeof body>) => analyzeFrame(points, points, SQUAT, FRAME);

describe('squat posture', () => {
  it('standing is a squat posture', () => {
    expect(analyze(body(twoSides(STANDING))).posture).toEqual({ kind: 'ok' });
  });

  it('lying down is not', () => {
    expect(analyze(body(twoSides(PLANK))).posture.kind).toBe('bad');
  });
});

describe('squat body height', () => {
  it('squat height = hips above the lower foot, so lifting one foot changes nothing', () => {
    const both = analyze(body(twoSides(STANDING))).height;
    const oneLifted = analyze(body(twoSides(STANDING, { ankle: [0, 1.0] }))).height;
    expect(both).toBeCloseTo(0.9);
    expect(oneLifted).toBeCloseTo(0.9);
  });

});
