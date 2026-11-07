import { describe, expect, it } from 'vitest';
import { jointAngle } from './angle';

describe('jointAngle', () => {
  const b = { x: 0, y: 0 };

  it('is 180 for a straight line', () => {
    expect(jointAngle({ x: -1, y: 0 }, b, { x: 1, y: 0 })).toBeCloseTo(180);
  });

  it('is 90 for a right angle', () => {
    expect(jointAngle({ x: 1, y: 0 }, b, { x: 0, y: 1 })).toBeCloseTo(90);
  });

  it('is 45 for half a right angle', () => {
    expect(jointAngle({ x: 1, y: 0 }, b, { x: 1, y: 1 })).toBeCloseTo(45);
  });

  it('does not depend on the order of the two outer points', () => {
    const a = { x: 3, y: 1 };
    const c = { x: -2, y: 4 };
    expect(jointAngle(a, b, c)).toBeCloseTo(jointAngle(c, b, a));
  });

  it('never goes over 180 (an angle measured the "long way round" is folded back)', () => {
    // 60 degrees between the segments; subtracting two atan2 results would give 300 here
    const a = { x: Math.cos((170 * Math.PI) / 180), y: Math.sin((170 * Math.PI) / 180) };
    const c = { x: Math.cos((-130 * Math.PI) / 180), y: Math.sin((-130 * Math.PI) / 180) };
    expect(jointAngle(a, b, c)).toBeCloseTo(60);
  });

  it('does not depend on the segment lengths (thigh vs shin)', () => {
    expect(jointAngle({ x: 10, y: 0 }, b, { x: 0, y: 0.5 })).toBeCloseTo(90);
  });

  it('is NaN when two points are on top of each other', () => {
    expect(jointAngle(b, b, { x: 1, y: 0 })).toBeNaN();
  });
});
