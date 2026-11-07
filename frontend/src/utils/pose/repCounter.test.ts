import { describe, expect, it } from 'vitest';
import type { Check as FormResult } from './poseMath';
import {
  DEFAULT_REP_OPTIONS,
  INITIAL_REP_STATE,
  stepRepCounter,
  type RepCounterOptions,
  type RepCounterState,
} from './repCounter';

const thresholds = { downBelow: 100, upAbove: 160 };
// No smoothing in most tests: they check the state machine, not the filter
const raw: RepCounterOptions = { ...DEFAULT_REP_OPTIONS, smoothing: 1 };
const OK: FormResult = { kind: 'ok' };
const BAD: FormResult = { kind: 'bad', message: 'Giữ thẳng chân' };

interface Run {
  frameMs?: number;
  options?: RepCounterOptions;
  forms?: FormResult[];
  limits?: typeof thresholds;
}

// Feeds one angle per frame
function run(angles: (number | null)[], { frameMs = 33, options = raw, forms = [], limits = thresholds }: Run = {}) {
  return angles.reduce<RepCounterState>(
    (state, angle, i) => stepRepCounter(state, { angle, form: forms[i] ?? OK }, i * frameMs, limits, options),
    INITIAL_REP_STATE,
  );
}

// A full, slow rep: top -> bottom -> top, 30 frames (~1 s at 30 fps)
const fullRep = [170, 160, 140, 120, 100, 90, 85, 85, 90, 110, 130, 150, 165, 170, 172].flatMap((a) => [a, a]);

describe('stepRepCounter: counting', () => {
  it('counts one rep for top -> bottom -> top', () => {
    const state = run(fullRep);
    expect(state.reps).toBe(1);
    expect(state.event?.kind).toBe('COUNTED');
  });

  it('counts each rep of a set', () => {
    expect(run([...fullRep, ...fullRep, ...fullRep]).reps).toBe(3);
  });

  it('does not count when the angle shakes around one threshold', () => {
    const shaking = [170, ...Array.from({ length: 40 }, (_, i) => (i % 2 ? 98 : 103)), 99];
    const state = run(shaking);
    expect(state.reps).toBe(0);
    expect(state.phase).toBe('DOWN');
  });

  it('waits for a clear top position before the first rep', () => {
    const state = run([90, 85, 120, 170]); // walked in mid-squat
    expect(state.reps).toBe(0);
    expect(state.phase).toBe('UP');
  });

  it('keeps the phase through a short drop-out', () => {
    expect(run([170, 90, null, null, null, null, null, 170]).reps).toBe(1);
  });

  it('goes back to WAITING when the body is lost for too long', () => {
    const lost = Array.from({ length: 40 }, () => null); // ~1.3 s
    expect(run([170, 90, ...lost, 170]).reps).toBe(0);
  });

  it('does not count a second rep faster than minRepMs', () => {
    expect(run([170, 90, 170, 90, 170]).reps).toBe(1); // 2 frames apart (~70 ms)
  });

  it('counts a fast push-up seen at 15 fps with the default smoothing', () => {
    // ~0.6 s per rep, only 2 frames under 90 degrees; push-up thresholds 90 / 150
    const fast = [160, 130, 100, 85, 80, 95, 125, 155, 165];
    const state = run([...fast, ...fast, ...fast], {
      frameMs: 67,
      options: DEFAULT_REP_OPTIONS,
      limits: { downBelow: 90, upAbove: 150 },
    });
    expect(state.reps).toBe(3);
  });

  it('smoothing stops a single wild frame from starting a rep', () => {
    const state = run([170, 170, 60, 170, 170], { options: { ...raw, smoothing: 0.5 } });
    expect(state.phase).toBe('UP');
    expect(state.reps).toBe(0);
  });
});

describe('stepRepCounter: feedback', () => {
  it('reports a half rep that never reaches the bottom', () => {
    const state = run([170, 150, 120, 110, 120, 150, 170]);
    expect(state.reps).toBe(0);
    expect(state.event?.kind).toBe('TOO_SHALLOW');
  });

  it('does not call a small wobble at the top a half rep', () => {
    expect(run([170, 155, 150, 158, 170]).event).toBeNull(); // only 10 degrees under the top
  });

  it('does not count a rep done with bad form, and says why', () => {
    const angles = [170, 140, 120, 90, 85, 90, 120, 140, 170];
    const forms = angles.map((a) => (a < 150 ? BAD : OK)); // knees down during the movement
    const state = run(angles, { forms });
    expect(state.reps).toBe(0);
    expect(state.event).toEqual({ kind: 'BAD_FORM', seq: 1, low: 85, message: 'Giữ thẳng chân' });
  });

  it('ignores a single bad-form frame (landmark noise)', () => {
    const angles = [170, 140, 120, 90, 85, 90, 120, 140, 170];
    const forms = angles.map((_, i) => (i === 3 ? BAD : OK));
    expect(run(angles, { forms }).reps).toBe(1);
  });

  it('does not blame bad form while resting at the top between reps', () => {
    // on the knees at the top for a while, then a clean rep
    const angles = [170, 170, 170, 170, 140, 120, 90, 85, 120, 170];
    const forms = angles.map((_, i) => (i < 4 ? BAD : OK));
    expect(run(angles, { forms }).reps).toBe(1);
  });

  it('counts when the form cannot be seen (unknown is not bad)', () => {
    const forms = fullRep.map((): FormResult => ({ kind: 'unknown' }));
    expect(run(fullRep, { forms }).reps).toBe(1);
  });

  it('shows the live warning only after a few bad frames', () => {
    const angles = [170, 140, 130, 120];
    expect(run(angles.slice(0, 3), { forms: [OK, BAD, BAD] }).formMessage).toBeNull();
    expect(run(angles, { forms: [OK, BAD, BAD, BAD] }).formMessage).toBe('Giữ thẳng chân');
  });

  it('reports the lowest angle of each attempt, for the set log', () => {
    expect(run(fullRep).event).toEqual({ kind: 'COUNTED', seq: 1, low: 85 });
    expect(run([170, 150, 120, 110, 120, 150, 170]).event).toEqual({ kind: 'TOO_SHALLOW', seq: 1, low: 110 });
  });

  it('logs a rep that came too fast instead of dropping it silently', () => {
    const state = run([170, 90, 170, 90, 170]);
    expect(state.reps).toBe(1);
    expect(state.event?.kind).toBe('TOO_FAST');
  });

  it('numbers events so the screen can replay the same feedback twice', () => {
    const state = run([...fullRep, ...fullRep]);
    expect(state.event?.seq).toBe(2);
  });
});
