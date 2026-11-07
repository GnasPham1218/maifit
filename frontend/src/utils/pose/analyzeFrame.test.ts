import { describe, expect, it } from 'vitest';
import { analyzeFrame, type Landmark } from './analyzeFrame';

// Counting chain 0-1-2 (left) and 3-4-5 (right); one form rule on chain 6-7-8
const exercise = {
  sides: [[0, 1, 2], [3, 4, 5]] as const,
  formRules: [{ sides: [[6, 7, 8]] as const, minAngle: 150, message: 'Giữ thẳng chân' }],
};

const p = (x: number, y: number, visibility = 1, z = 0): Landmark => ({ x, y, z, visibility });
const right = [p(0, 0), p(0, 1), p(1, 1)]; // 90 degrees
const straight = [p(0, 0), p(0, 1), p(0, 2)]; // 180 degrees
const bent = [p(0, 0), p(0, 1), p(1, 1)]; // 90 degrees

// The same points for the image and the world landmarks keep the tests readable
const frame = (points: Landmark[]) => analyzeFrame(points, points, exercise);

describe('analyzeFrame', () => {
  it('returns nothing when there is no pose', () => {
    expect(analyzeFrame(undefined, undefined, exercise)).toEqual({ angle: null, joint: null, form: { kind: 'unknown' } });
  });

  it('measures the counting joint and gives its screen position', () => {
    const result = frame([...right, ...right.map((q) => ({ ...q, visibility: 0.1 })), ...straight]);
    expect(result.angle).toBeCloseTo(90);
    expect(result.joint).toEqual({ x: 0, y: 1 });
  });

  it('uses the better seen side', () => {
    const left = right.map((q) => ({ ...q, visibility: 0.7 }));
    const result = frame([...left, ...straight, ...straight]); // right side is straight and fully seen
    expect(result.angle).toBeCloseTo(180);
  });

  it('gives no angle when every side is too poorly seen', () => {
    const hidden = right.map((q) => ({ ...q, visibility: 0.3 }));
    expect(frame([...hidden, ...hidden, ...straight]).angle).toBeNull();
  });

  it('reads the angle from the world landmarks (3D), not the flat image', () => {
    // Image: the three points on a vertical line (looks straight). World: a right angle in depth.
    const image = [p(0, 0), p(0, 0.5), p(0, 0.6), p(0, 0), p(0, 0.5), p(0, 0.6), ...straight];
    const world = [p(0, -0.4), p(0, 0), p(0, 0, 1, -0.4), p(0, -0.4), p(0, 0), p(0, 0, 1, -0.4), ...straight];
    expect(analyzeFrame(image, world, exercise).angle).toBeCloseTo(90);
  });

  it('form is ok when the rule line is straight enough', () => {
    expect(frame([...right, ...right, ...straight]).form).toEqual({ kind: 'ok' });
  });

  it('form is bad, with the message, when the line bends under the limit', () => {
    expect(frame([...right, ...right, ...bent]).form).toEqual({ kind: 'bad', message: 'Giữ thẳng chân' });
  });

  it('form is unknown when the rule line is hidden (never guessed)', () => {
    const hiddenLegs = bent.map((q) => ({ ...q, visibility: 0.2 }));
    expect(frame([...right, ...right, ...hiddenLegs]).form).toEqual({ kind: 'unknown' });
  });
});
