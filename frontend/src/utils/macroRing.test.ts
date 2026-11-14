import { describe, expect, it } from 'vitest';
import { ringSegments } from './macroRing';

describe('ringSegments', () => {
  it('fills the share of the target that was eaten, split by energy', () => {
    // 100 g protein (400 kcal) + 100 g carb (400) + 0 fat; eaten 800 of 1600 -> half the ring, two quarters
    const [p, c, f] = ringSegments(800, 1600, { protein: 100, carb: 100, fat: 0 });
    expect(p).toEqual({ start: 0, length: 25 });
    expect(c).toEqual({ start: 25, length: 25 });
    expect(f.length).toBe(0);
  });

  it('never goes past a full ring', () => {
    const total = ringSegments(3000, 2000, { protein: 50, carb: 50, fat: 50 }).reduce((a, s) => a + s.length, 0);
    expect(total).toBeCloseTo(100);
  });

  it('draws nothing without a target or without food', () => {
    expect(ringSegments(500, 0, { protein: 10, carb: 10, fat: 10 }).every((s) => s.length === 0)).toBe(true);
    expect(ringSegments(0, 2000, { protein: 0, carb: 0, fat: 0 }).every((s) => s.length === 0)).toBe(true);
  });
});
