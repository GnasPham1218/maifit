import { describe, expect, it } from 'vitest';
import { EXERCISES } from '../../constants/exercises';
import type { FrameAnalysis } from './analyzeFrame';
import { holdProgress, INITIAL_SESSION, stepSession, type SessionState } from './workoutSession';

const SQUAT = EXERCISES.SQUAT; // count: < 100 then > 160; the hips must drop 25% of the thigh
const FRAME_MS = 33;

// A person standing in place, seen well; thigh 0.45 m -> the hips must drop at least 0.11 m
const frame = (o: Partial<FrameAnalysis> = {}): FrameAnalysis => ({
  angle: 175,
  joint: null,
  form: { kind: 'ok' },
  posture: { kind: 'ok' },
  tilt: 5,
  height: 0.9,
  limb: 0.45,
  anchors: [{ x: 400, y: 900 }, { x: 600, y: 900 }],
  scale: 1000,
  ...o,
});

function run(frames: FrameAnalysis[], from: SessionState = INITIAL_SESSION) {
  return frames.reduce((state, f, i) => stepSession(state, f, i * FRAME_MS, SQUAT), from);
}

const times = (n: number, f: FrameAnalysis) => Array.from({ length: n }, () => f);
const ready = times(35, frame()); // ~1.15 s standing still

// One squat: knee angle and hip height go down together, then back up
const squat = [175, 150, 120, 95, 85, 95, 120, 150, 175].map((angle) =>
  frame({ angle, height: 0.9 - (175 - angle) * 0.004 }));

describe('stepSession: getting into position (layer 1)', () => {
  it('starts in SETUP and asks to get into position when not at the top', () => {
    const state = run([frame({ angle: 140 })]);
    expect(state.stage).toBe('SETUP');
    expect(state.message).toBe(SQUAT.setupHint);
  });

  it('asks to step back when the body is not seen', () => {
    expect(run([frame({ angle: null })]).message).toBe('Lùi ra xa để camera thấy cả người');
  });

  it('starts counting after holding still for a second', () => {
    expect(run(times(10, frame())).stage).toBe('SETUP');
    expect(run(ready).stage).toBe('ACTIVE');
  });

  it('moving while getting into position restarts the hold', () => {
    const walking = Array.from({ length: 35 }, (_, i) => frame({ anchors: [{ x: 400 + i * 40, y: 900 }] }));
    expect(run(walking).stage).toBe('SETUP');
  });

  it('the usual landmark shake (a few pixels each frame) still counts as holding still', () => {
    const shaking = Array.from({ length: 35 }, (_, i) =>
      frame({ anchors: [{ x: 400 + (i % 2 ? 15 : -15), y: 900 + (i % 3) * 10 }, { x: 600, y: 900 }] }));
    expect(run(shaking).stage).toBe('ACTIVE');
  });

  it('shows the hold progress', () => {
    const state = run(times(16, frame())); // held for 15 frames = ~0.5 s
    expect(holdProgress(state, 15 * FRAME_MS)).toBeCloseTo(0.495, 1);
  });

  it('wrong posture is explained', () => {
    const state = run([frame({ posture: { kind: 'bad', message: 'Đứng thẳng người lên' } })]);
    expect(state.message).toBe('Đứng thẳng người lên');
  });
});

describe('stepSession: counting while in position', () => {
  it('counts a real squat', () => {
    expect(run([...ready, ...squat]).counter.reps).toBe(1);
  });

  it('refuses a "squat" where the knees bend but the hips do not go down (layer 4)', () => {
    const fake = squat.map((f) => ({ ...f, height: 0.9 }));
    const state = run([...ready, ...fake]);
    expect(state.counter.reps).toBe(0);
    expect(state.counter.event).toEqual({ kind: 'BAD_FORM', seq: 1, message: SQUAT.dropMessage });
  });

  it('nothing counts before getting into position', () => {
    expect(run(squat).counter.reps).toBe(0);
  });
});

describe('stepSession: leaving the position (layers 2-3)', () => {
  it('a foot moving away goes back to SETUP and keeps the reps', () => {
    const moved = times(5, frame({ anchors: [{ x: 600, y: 900 }, { x: 800, y: 900 }] })); // 200 px = 20%
    const state = run([...ready, ...squat, ...moved]);
    expect(state.stage).toBe('SETUP');
    expect(state.message).toBe('Bạn đã rời vị trí ban đầu, vào lại tư thế');
    expect(state.counter.reps).toBe(1);
  });

  it('a small shift of the feet is fine', () => {
    const shifted = times(10, frame({ anchors: [{ x: 450, y: 900 }, { x: 650, y: 900 }] })); // 5%
    expect(run([...ready, ...shifted]).stage).toBe('ACTIVE');
  });

  it('leaving the exercise posture goes back to SETUP', () => {
    const lying = times(5, frame({ posture: { kind: 'bad', message: 'Đứng thẳng người lên' } }));
    expect(run([...ready, ...lying]).stage).toBe('SETUP');
  });

  it('one noisy frame out of posture does not stop the set', () => {
    const blip = [frame({ posture: { kind: 'bad', message: 'x' } })];
    expect(run([...ready, ...blip, frame()]).stage).toBe('ACTIVE');
  });
});
