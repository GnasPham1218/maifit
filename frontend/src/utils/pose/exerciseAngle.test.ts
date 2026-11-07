import { describe, expect, it } from 'vitest';
import { exerciseAngle, type Landmark } from './exerciseAngle';

// Two chains: points 0-1-2 (left) and 3-4-5 (right)
const exercise = { sides: [[0, 1, 2], [3, 4, 5]] as const };

const lm = (x: number, y: number, visibility = 1): Landmark => ({ x, y, visibility });

describe('exerciseAngle', () => {
  it('returns null when there is no pose in the frame', () => {
    expect(exerciseAngle(undefined, exercise, 100, 100)).toBeNull();
  });

  it('returns null when every side is too poorly seen', () => {
    const points = [lm(0, 0, 0.3), lm(0, 1, 0.9), lm(1, 1, 0.9), lm(0, 0, 0.9), lm(0, 1, 0.2), lm(1, 1, 0.9)];
    expect(exerciseAngle(points, exercise, 100, 100)).toBeNull();
  });

  it('uses the better seen side', () => {
    // left: 90 degrees, visibility 0.7 / right: straight (180), visibility 0.95
    const points = [lm(0, 0, 0.7), lm(0, 0.5, 0.7), lm(0.5, 0.5, 0.7), lm(0, 0, 0.95), lm(0, 0.5, 0.95), lm(0, 1, 0.95)];
    expect(exerciseAngle(points, exercise, 100, 100)).toBeCloseTo(180);
  });

  it('measures in pixels, not in normalized units', () => {
    // 16:9 frame (1600x900). In pixels: b->a = (0, -450), b->c = (450, -450) -> 45 degrees.
    // On raw normalized x/y the same points give about 29 degrees.
    const points = [lm(0, 0), lm(0, 0.5), lm(0.28125, 0)];
    expect(exerciseAngle(points, { sides: [[0, 1, 2]] }, 1600, 900)).toBeCloseTo(45);
  });

  it('skips a side whose points are missing from the list', () => {
    const points = [lm(0, 0), lm(0, 0.5), lm(0.5, 0.5)]; // only the left chain exists
    expect(exerciseAngle(points, exercise, 100, 100)).toBeCloseTo(90);
  });
});
