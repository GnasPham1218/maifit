import type { ExerciseConfig } from '../../constants/exercises';

// WAITING: not sure where the person is yet (start, or came back into the frame).
//          A rep can only start from a clear top position, so stepping in half-bent counts nothing.
// UP / DOWN: top or bottom of the movement. A rep = UP -> DOWN -> UP, counted on the way back up.
export type RepPhase = 'WAITING' | 'UP' | 'DOWN';

export interface RepCounterState {
  phase: RepPhase;
  reps: number;
  angle: number | null; // smoothed angle of the last usable frame (shown on screen)
  missingSince: number | null; // time of the first frame in a row without a usable angle
  lastRepAt: number | null;
}

export interface RepCounterOptions {
  smoothing: number; // weight of the newest frame, 0..1 (1 = no smoothing)
  maxGapMs: number; // body lost longer than this -> back to WAITING
  minRepMs: number; // two reps closer than this = jitter, the second is not counted
}

export const DEFAULT_REP_OPTIONS: RepCounterOptions = {
  smoothing: 0.5,
  maxGapMs: 1000,
  minRepMs: 500,
};

export const INITIAL_REP_STATE: RepCounterState = {
  phase: 'WAITING',
  reps: 0,
  angle: null,
  missingSince: null,
  lastRepAt: null,
};

type Thresholds = Pick<ExerciseConfig, 'downBelow' | 'upAbove'>;

// One camera frame in, the next state out. Pure (no camera, no clock inside):
// the whole counting logic is unit tested by feeding it a list of angles.
// rawAngle: null when the body is not seen well enough in this frame (see exerciseAngle).
// now: frame time in ms.
export function stepRepCounter(
  state: RepCounterState,
  rawAngle: number | null,
  now: number,
  thresholds: Thresholds,
  options: RepCounterOptions = DEFAULT_REP_OPTIONS,
): RepCounterState {
  if (rawAngle == null) {
    const missingSince = state.missingSince ?? now;
    if (now - missingSince > options.maxGapMs) {
      return { ...state, phase: 'WAITING', angle: null, missingSince };
    }
    return { ...state, missingSince }; // a short drop-out (a blurry frame): keep going
  }

  // Exponential moving average: removes the frame-to-frame shake of the landmarks
  // with a lag of only a few frames (about 0.1 s at 30 fps with 0.5)
  const angle = state.angle == null ? rawAngle : state.angle + options.smoothing * (rawAngle - state.angle);
  const next: RepCounterState = { ...state, angle, missingSince: null };

  switch (state.phase) {
    case 'WAITING':
      return angle > thresholds.upAbove ? { ...next, phase: 'UP' } : next;
    case 'UP':
      return angle < thresholds.downBelow ? { ...next, phase: 'DOWN' } : next;
    case 'DOWN': {
      if (angle <= thresholds.upAbove) return next;
      const tooFast = state.lastRepAt != null && now - state.lastRepAt < options.minRepMs;
      if (tooFast) return { ...next, phase: 'UP' };
      return { ...next, phase: 'UP', reps: state.reps + 1, lastRepAt: now };
    }
  }
}
