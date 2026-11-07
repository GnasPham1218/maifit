import { describe, expect, it } from 'vitest';
import { EXERCISES } from '../../exercises';
import { analyzeFrame } from './analyzeFrame';
import { body, PLANK, STANDING, twoSides } from './testPoses';

const FRAME = { width: 1000, height: 1000 };
const PUSH_UP = EXERCISES.PUSH_UP;

// Same points as image and world landmarks keeps the tests readable
const analyze = (points: ReturnType<typeof body>, exercise = PUSH_UP) => analyzeFrame(points, points, exercise, FRAME);

describe('analyzeFrame: counting angle', () => {
  it('returns nothing when there is no pose', () => {
    expect(analyzeFrame(undefined, undefined, PUSH_UP, FRAME).angle).toBeNull();
  });

  it('measures the counting joint and gives its screen position', () => {
    const result = analyze(body(twoSides(PLANK)));
    expect(result.angle).toBeCloseTo(180);
    expect(result.joint).toEqual({ x: 0, y: 0.28 });
  });

  it('gives no angle when the joint is too poorly seen', () => {
    const hidden = { 11: 0.3, 12: 0.3, 13: 0.3, 14: 0.3 };
    expect(analyze(body(twoSides(PLANK), hidden)).angle).toBeNull();
  });

  it('reads the angle from the world landmarks (3D), not the flat image', () => {
    // Image: shoulder, elbow, wrist on one vertical line (looks straight).
    // World: the forearm points at the camera (z), a right angle.
    const image = body(twoSides(PLANK));
    const world = body(twoSides({ ...PLANK, wrist: [0, 0.28, -0.27] }));
    expect(analyzeFrame(image, world, PUSH_UP, FRAME).angle).toBeCloseTo(90);
  });
});

describe('analyzeFrame: form (straight lines + both sides)', () => {
  it('a straight plank is good form', () => {
    expect(analyze(body(twoSides(PLANK))).form).toEqual({ kind: 'ok' });
  });

  it('one arm bent and the other straight is one-sided (layer 5)', () => {
    const points = body(twoSides(PLANK, { elbow: [0, 0.28], wrist: [0.27, 0.28] }));
    expect(analyze(points).form).toEqual({ kind: 'bad', message: 'Làm đều hai bên' });
  });
});

describe('analyzeFrame: anchors and body size', () => {
  it('anchors are in pixels, null when hidden', () => {
    const result = analyze(body(twoSides(PLANK), { 16: 0.1 }));
    expect(result.anchors[0]).toEqual({ x: 0, y: 550 }); // left wrist
    expect(result.anchors[1]).toBeNull(); // right wrist hidden
  });

  it('body size on screen is the diagonal of the seen points', () => {
    expect(analyze(body(twoSides(STANDING))).scale).toBeCloseTo(1400);
  });
});
