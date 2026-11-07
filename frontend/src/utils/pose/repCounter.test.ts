import { describe, expect, it } from 'vitest';
import {
  INITIAL_REP_STATE,
  stepRepCounter,
  type RepCounterOptions,
  type RepCounterState,
} from './repCounter';

const thresholds = { downBelow: 100, upAbove: 160 };
// No smoothing in most tests: they check the state machine, not the filter
const raw: RepCounterOptions = { smoothing: 1, maxGapMs: 1000, minRepMs: 500 };
const FRAME_MS = 33; // ~30 fps

// Feeds angles one frame apart, starting at time `start`
function run(angles: (number | null)[], options = raw, from: RepCounterState = INITIAL_REP_STATE, start = 0) {
  return angles.reduce<RepCounterState>(
    (state, angle, i) => stepRepCounter(state, angle, start + i * FRAME_MS, thresholds, options),
    from,
  );
}

// A full, slow rep: top -> bottom -> top, 30 frames (~1 s)
const fullRep = [170, 160, 140, 120, 100, 90, 85, 85, 90, 110, 130, 150, 165, 170, 172].flatMap((a) => [a, a]);

describe('stepRepCounter', () => {
  it('counts one rep for top -> bottom -> top', () => {
    expect(run(fullRep).reps).toBe(1);
  });

  it('counts each rep of a set', () => {
    expect(run([...fullRep, ...fullRep, ...fullRep]).reps).toBe(3);
  });

  it('does not count a half rep that never goes below the bottom threshold', () => {
    expect(run([170, 150, 120, 105, 120, 150, 170]).reps).toBe(0);
  });

  it('does not count when the angle shakes around one threshold', () => {
    const shaking = [170, ...Array.from({ length: 40 }, (_, i) => (i % 2 ? 98 : 103)), 99];
    const state = run(shaking);
    expect(state.reps).toBe(0);
    expect(state.phase).toBe('DOWN');
  });

  it('waits for a clear top position before the first rep', () => {
    // starts already bent (walked in mid-squat): going up must not count
    const state = run([90, 85, 120, 170]);
    expect(state.reps).toBe(0);
    expect(state.phase).toBe('UP');
  });

  it('keeps the phase through a short drop-out', () => {
    // bottom reached, then 5 blurry frames (~0.17 s), then back up -> still one rep
    expect(run([170, 90, null, null, null, null, null, 170]).reps).toBe(1);
  });

  it('goes back to WAITING when the body is lost for too long', () => {
    const lost = Array.from({ length: 40 }, () => null); // ~1.3 s
    const state = run([170, 90, ...lost, 170]);
    expect(state.reps).toBe(0); // the bottom was before the gap: not trusted
  });

  it('does not count a second rep faster than minRepMs', () => {
    // two "reps" 4 frames apart (~130 ms): only the first counts
    expect(run([170, 90, 170, 90, 170]).reps).toBe(1);
  });

  it('smoothing stops a single wild frame from starting a rep', () => {
    const smoothed = { ...raw, smoothing: 0.5 };
    // one frame at 60 (bad detection) between steady 170s: the average only drops to 115
    const state = run([170, 170, 60, 170, 170], smoothed);
    expect(state.phase).toBe('UP');
    expect(state.reps).toBe(0);
  });
});
