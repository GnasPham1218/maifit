import { describe, expect, it } from 'vitest';
import { jointAngle } from './angle';

const deg = (d: number) => (d * Math.PI) / 180;

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

  it('never goes over 180', () => {
    // 60 degrees between the segments; subtracting two atan2 results would give 300 here
    const a = { x: Math.cos(deg(170)), y: Math.sin(deg(170)) };
    const c = { x: Math.cos(deg(-130)), y: Math.sin(deg(-130)) };
    expect(jointAngle(a, b, c)).toBeCloseTo(60);
  });

  it('does not depend on the segment lengths (thigh vs shin)', () => {
    expect(jointAngle({ x: 10, y: 0 }, b, { x: 0, y: 0.5 })).toBeCloseTo(90);
  });

  it('measures in 3D: a knee bending towards the camera', () => {
    // Facing the camera (z = depth): hip above the knee, ankle straight towards the camera.
    // In 2D (x, y only) the shin collapses to a point; in 3D it is a right angle.
    const hip = { x: 0, y: -0.4, z: 0 };
    const knee = { x: 0, y: 0, z: 0 };
    const ankle = { x: 0, y: 0, z: -0.4 };
    expect(jointAngle(hip, knee, ankle)).toBeCloseTo(90);
  });

  it('is NaN when two points are on top of each other', () => {
    expect(jointAngle(b, b, { x: 1, y: 0 })).toBeNaN();
  });
});
