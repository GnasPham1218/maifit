import type { Exercise } from '../../exercises/types';
import type { Check } from './analyzeFrame';

// WAITING: not sure where the person is yet (start, or came back into the frame).
//          A rep can only start from a clear top position, so stepping in half-bent counts nothing.
// UP / DOWN: top or bottom of the movement. A rep = UP -> DOWN -> UP, counted on the way back up.
export type RepPhase = 'WAITING' | 'UP' | 'DOWN';

// What just happened, for the on-screen feedback. seq grows on every event so the UI can replay
// an animation even when the same kind happens twice in a row.
export type RepEventKind = 'COUNTED' | 'TOO_SHALLOW' | 'BAD_FORM' | 'TOO_FAST';
export interface RepEvent {
  kind: RepEventKind;
  seq: number; // attempt number in the set (every attempt, counted or not)
  low: number | null; // lowest angle reached in this attempt (for the set log)
  message?: string; // BAD_FORM: which rule was broken
}

export interface RepCounterState {
  phase: RepPhase;
  reps: number;
  angle: number | null; // smoothed angle of the last usable frame (shown on screen)
  missingSince: number | null; // time of the first frame in a row without a usable angle
  lastRepAt: number | null;
  repMin: number | null; // lowest angle since the last top (half-rep check and the set log)
  topHeight: number | null; // body height (m) at the top of the current rep
  lowHeight: number | null; // lowest body height (m) during the current rep
  limb: number | null; // latest limb length (m) the drop is compared to
  badFrames: number; // bad-form frames in a row
  repBadForm: string | null; // message of a form rule broken during the current rep
  formMessage: string | null; // form rule broken right now (for the live warning)
  event: RepEvent | null;
}

export interface RepCounterOptions {
  smoothing: number; // weight of the newest frame, 0..1 (1 = no smoothing)
  maxGapMs: number; // body lost longer than this -> back to WAITING
  minRepMs: number; // two reps closer than this = jitter, the second is not counted
  badFormFrames: number; // bad form must last this many frames in a row (one noisy frame is ignored)
  shallowMargin: number; // went this many degrees below the top but not to the bottom = half rep
}

// smoothing 0.8: removes landmark shake but keeps the bottom of a fast rep. On a phone the model
// runs at ~15 fps, so a fast push-up has only 2-3 frames near the bottom: 0.5 averaged them away.
export const DEFAULT_REP_OPTIONS: RepCounterOptions = {
  smoothing: 0.8,
  maxGapMs: 1000,
  minRepMs: 300,
  badFormFrames: 3,
  shallowMargin: 20,
};

export const INITIAL_REP_STATE: RepCounterState = {
  phase: 'WAITING',
  reps: 0,
  angle: null,
  missingSince: null,
  lastRepAt: null,
  repMin: null,
  topHeight: null,
  lowHeight: null,
  limb: null,
  badFrames: 0,
  repBadForm: null,
  formMessage: null,
  event: null,
};

export interface FrameInput {
  angle: number | null; // null when the body is not seen well enough in this frame
  form: Check;
  height?: number | null; // see FrameAnalysis.height
  limb?: number | null;
}

type Thresholds = Pick<Exercise, 'downBelow' | 'upAbove'> &
  Partial<Pick<Exercise, 'minDropRatio' | 'dropMessage'>>;

const nextEvent = (state: RepCounterState, kind: RepEventKind, low: number | null, message?: string): RepEvent => ({
  kind,
  seq: (state.event?.seq ?? 0) + 1,
  low: low == null ? null : Math.round(low),
  ...(message ? { message } : {}),
});

// A new rep starts from a clean slate
const atTop = { repMin: null, repBadForm: null, lowHeight: null } as const;

// One camera frame in, the next state out. Pure (no camera, no clock inside):
// the whole counting logic is unit tested by feeding it a list of frames. now: frame time in ms.
export function stepRepCounter(
  state: RepCounterState,
  frame: FrameInput,
  now: number,
  thresholds: Thresholds,
  options: RepCounterOptions = DEFAULT_REP_OPTIONS,
): RepCounterState {
  if (frame.angle == null) {
    const missingSince = state.missingSince ?? now;
    if (now - missingSince > options.maxGapMs) {
      return { ...state, ...atTop, phase: 'WAITING', angle: null, missingSince, badFrames: 0, formMessage: null };
    }
    return { ...state, missingSince }; // a short drop-out (a blurry frame): keep going
  }

  // Exponential moving average: removes the frame-to-frame shake of the landmarks
  const angle = state.angle == null ? frame.angle : state.angle + options.smoothing * (frame.angle - state.angle);
  const atTopNow = angle > thresholds.upAbove;

  // Form: only a problem when it lasts a few frames, and only during the movement
  // (resting on the knees at the top between reps is fine)
  const badFrames = frame.form.kind === 'bad' ? state.badFrames + 1 : 0;
  const formMessage = frame.form.kind === 'bad' && badFrames >= options.badFormFrames ? frame.form.message : null;
  const repBadForm = !atTopNow && state.phase !== 'WAITING' ? (state.repBadForm ?? formMessage) : state.repBadForm;

  // Body height: remember it at the top, and its lowest value during the rep
  const height = frame.height ?? null;
  const topHeight = atTopNow && height != null ? height : state.topHeight;
  const lowHeight = !atTopNow && height != null ? Math.min(state.lowHeight ?? height, height) : state.lowHeight;
  const limb = frame.limb ?? state.limb;

  const next: RepCounterState = {
    ...state, angle, missingSince: null, badFrames, formMessage, repBadForm, topHeight, lowHeight, limb,
  };

  switch (state.phase) {
    case 'WAITING':
      return atTopNow ? { ...next, ...atTop, phase: 'UP' } : next;

    case 'UP': {
      if (angle < thresholds.downBelow) return { ...next, phase: 'DOWN', repMin: Math.min(state.repMin ?? angle, angle) };
      if (!atTopNow) return { ...next, repMin: Math.min(state.repMin ?? angle, angle) };
      // Back at the top without reaching the bottom: a half rep if it went down noticeably
      const halfRep = state.repMin != null && state.repMin < thresholds.upAbove - options.shallowMargin;
      return { ...next, ...atTop, event: halfRep ? nextEvent(state, 'TOO_SHALLOW', state.repMin) : state.event };
    }

    case 'DOWN': {
      if (!atTopNow) return { ...next, repMin: Math.min(state.repMin ?? angle, angle) };
      const low = state.repMin;
      const up = { ...next, ...atTop, phase: 'UP' as const };
      if (repBadForm) return { ...up, event: nextEvent(state, 'BAD_FORM', low, repBadForm) };
      // The joint bent, but did the body really go down? (only judged when the heights were seen)
      if (thresholds.minDropRatio && state.topHeight != null && lowHeight != null && limb) {
        const drop = state.topHeight - lowHeight;
        if (drop < thresholds.minDropRatio * limb) {
          return { ...up, event: nextEvent(state, 'BAD_FORM', low, thresholds.dropMessage ?? 'Hạ người xuống thấp hơn') };
        }
      }
      const tooFast = state.lastRepAt != null && now - state.lastRepAt < options.minRepMs;
      if (tooFast) return { ...up, event: nextEvent(state, 'TOO_FAST', low) };
      return { ...up, reps: state.reps + 1, lastRepAt: now, event: nextEvent(state, 'COUNTED', low) };
    }
  }
}
