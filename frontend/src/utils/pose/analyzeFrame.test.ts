import { describe, expect, it } from 'vitest';
import { EXERCISES } from '../../constants/exercises';
import { analyzeFrame } from './analyzeFrame';
import { body, PLANK, STANDING, twoSides } from './testPoses';

const FRAME = { width: 1000, height: 1000 };
const PUSH_UP = EXERCISES.PUSH_UP;
const SQUAT = EXERCISES.SQUAT;

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

describe('analyzeFrame: posture (layer 2)', () => {
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

  it('standing is a squat posture; lying down is not', () => {
    expect(analyze(body(twoSides(STANDING)), SQUAT).posture).toEqual({ kind: 'ok' });
    expect(analyze(body(twoSides(PLANK)), SQUAT).posture.kind).toBe('bad');
  });

  it('posture is unknown when the hips are not seen at all', () => {
    expect(analyze(body(twoSides(PLANK), { 23: 0.1, 24: 0.1 })).posture).toEqual({ kind: 'unknown' });
  });

  it('the bottom of a rep (shoulders level with the hands) is still a push-up posture', () => {
    const bottom = { ...PLANK, shoulder: [0, 0.5] as const, elbow: [-0.25, 0.35] as const, hip: [0.5, 0.52] as const };
    expect(analyze(body(twoSides(bottom))).posture).toEqual({ kind: 'ok' });
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

describe('analyzeFrame: height, anchors and body size', () => {
  it('push-up height = shoulders above the hands, compared to the arm length', () => {
    const result = analyze(body(twoSides(PLANK)));
    expect(result.height).toBeCloseTo(0.55);
    expect(result.limb).toBeCloseTo(0.55);
  });

  it('squat height = hips above the lower foot, so lifting one foot changes nothing', () => {
    const both = analyze(body(twoSides(STANDING)), SQUAT).height;
    const oneLifted = analyze(body(twoSides(STANDING, { ankle: [0, 1.0] })), SQUAT).height;
    expect(both).toBeCloseTo(0.9);
    expect(oneLifted).toBeCloseTo(0.9);
  });

  it('anchors are in pixels, null when hidden', () => {
    const result = analyze(body(twoSides(PLANK), { 16: 0.1 }));
    expect(result.anchors[0]).toEqual({ x: 0, y: 550 }); // left wrist
    expect(result.anchors[1]).toBeNull(); // right wrist hidden
  });

  it('body size on screen is the diagonal of the seen points', () => {
    expect(analyze(body(twoSides(STANDING))).scale).toBeCloseTo(1400);
  });
});
