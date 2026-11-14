import { describe, expect, it } from 'vitest';
import { attemptText, clock, depthShare } from './workoutDisplay';

describe('clock', () => {
  it('pads minutes and seconds', () => {
    expect(clock(0)).toBe('00:00');
    expect(clock(83)).toBe('01:23');
    expect(clock(600)).toBe('10:00');
  });
});

describe('depthShare', () => {
  it('is empty when straight, full past the target, and puts the target near the bottom', () => {
    expect(depthShare(180, 100)).toBe(0);
    expect(depthShare(60, 100)).toBe(1);
    expect(depthShare(100, 100)).toBeCloseTo(0.8); // squat target: 80 / 100
  });
});

describe('attemptText', () => {
  it('says why a rep did not count', () => {
    expect(attemptText({ seq: 3, rep: 12, low: 88, ok: true, reason: null }, 'gối')).toBe('Rep 12 hợp lệ, gối 88°');
    expect(attemptText({ seq: 4, rep: null, low: 118, ok: false, reason: 'chưa đủ sâu' }, 'gối'))
      .toBe('Chưa tính, gối 118°: chưa đủ sâu');
  });
});
