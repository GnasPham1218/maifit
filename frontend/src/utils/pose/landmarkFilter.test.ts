import { describe, expect, it } from 'vitest';
import { createLandmarkFilter } from './landmarkFilter';

const FRAME_MS = 33;
const point = (x: number) => [{ x, y: 0, z: 0, visibility: 0.9 }];

describe('createLandmarkFilter', () => {
  it('passes the first frame through', () => {
    expect(createLandmarkFilter()(point(0.5), 0)?.[0].x).toBe(0.5);
  });

  it('strongly damps shake around a still point', () => {
    const filter = createLandmarkFilter();
    let out = 0;
    for (let i = 0; i < 60; i++) out = filter(point(0.5 + (i % 2 ? 0.01 : -0.01)), i * FRAME_MS)![0].x;
    expect(Math.abs(out - 0.5)).toBeLessThan(0.004); // raw shake is +-0.01
  });

  it('follows a fast movement with little lag', () => {
    const filter = createLandmarkFilter();
    filter(point(0), 0);
    let out = 0;
    for (let i = 1; i <= 5; i++) out = filter(point(i * 0.05), i * FRAME_MS)![0].x; // 1.5 units/s
    expect(out).toBeGreaterThan(0.17); // raw is 0.25 after ~0.17 s
  });

  it('keeps visibility as reported', () => {
    expect(createLandmarkFilter()(point(0.5), 0)?.[0].visibility).toBe(0.9);
  });

  it('resets when the person is lost', () => {
    const filter = createLandmarkFilter();
    filter(point(0), 0);
    filter(undefined, FRAME_MS);
    expect(filter(point(0.9), 2 * FRAME_MS)?.[0].x).toBe(0.9);
  });
});
