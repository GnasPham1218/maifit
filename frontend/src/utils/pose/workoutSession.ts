import type { Exercise } from '../../exercises/types';
import type { Point } from './angle';
import type { FrameAnalysis } from './analyzeFrame';
import { INITIAL_REP_STATE, stepRepCounter, type RepCounterState } from './repCounter';

// Anti-cheat layer around the rep counter. Reps are only counted while the person:
//  1. got into the start position and held it still for a moment (SETUP -> ACTIVE),
//  2. stays in the exercise's body position (plank / standing),
//  3. keeps hands / feet where they were at the start (no walking around, no other exercise).
// Layers 4-5 (real body drop, both sides) live in
//  repCounter and analyzeFrame. Leaving the position goes back to SETUP; reps already done stay.
//
// This only makes cheating harder for honest-ish users: anything running in the browser can be
// changed. The server still checks every saved session (reps vs duration, sessions per day).

export type SessionStage = 'SETUP' | 'ACTIVE';

export interface SessionState {
  stage: SessionStage;
  wasActive: boolean; // counted before in this set: getting back into position is quicker
  holdSince: number | null; // SETUP: when the person became still in position
  slipSince: number | null; // SETUP: when the position was last lost during a hold (grace period)
  holdAnchors: (Point | null)[]; // SETUP: anchors when the hold started; moving away restarts it
  anchors: (Point | null)[]; // ACTIVE: hands / feet positions locked at the start
  scale: number | null; // ACTIVE: body size on screen at the start (pixels)
  offFrames: number; // ACTIVE: frames in a row out of position
  message: string | null; // why counting is paused (shown on screen)
  counter: RepCounterState;
}

export interface SessionOptions {
  holdMs: number; // how long to hold still in position before counting starts
  rejoinHoldMs: number; // the same after leaving the position mid-set (no long pause between reps)
  graceMs: number; // SETUP: losing the position for less than this does not restart the hold
  stillRatio: number; // SETUP: anchors staying within this share of the body size = holding still
  driftRatio: number; // ACTIVE: an anchor further than this share of the body size = left the spot
  offFrames: number; // ACTIVE: out of position this many frames in a row -> back to SETUP
}

export const DEFAULT_SESSION_OPTIONS: SessionOptions = {
  holdMs: 1000,
  rejoinHoldMs: 300,
  // A wobble or a few bad frames must not throw away the hold: only a real change does
  graceMs: 400,
  // Compared with the position at the start of the hold, not frame to frame: the landmarks shake
  // a few pixels every frame on a phone, which a per-frame check mistook for moving
  stillRatio: 0.05,
  driftRatio: 0.15,
  offFrames: 5,
};

export const INITIAL_SESSION: SessionState = {
  stage: 'SETUP',
  wasActive: false,
  holdSince: null,
  slipSince: null,
  holdAnchors: [],
  anchors: [],
  scale: null,
  offFrames: 0,
  message: null,
  counter: INITIAL_REP_STATE,
};

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

// Largest move of an anchor seen in both lists, in pixels (0 when none can be compared)
function maxMove(before: (Point | null)[], now: (Point | null)[]): number {
  return before.reduce((max, p, i) => {
    const q = now[i];
    return p && q ? Math.max(max, distance(p, q)) : max;
  }, 0);
}

// Back to SETUP: keep the reps, forget the rep in progress
function toSetup(state: SessionState, message: string): SessionState {
  return {
    ...INITIAL_SESSION,
    wasActive: true,
    message,
    counter: { ...INITIAL_REP_STATE, reps: state.counter.reps, lastRepAt: state.counter.lastRepAt, event: state.counter.event },
  };
}

export function stepSession(
  state: SessionState,
  frame: FrameAnalysis,
  now: number,
  exercise: Exercise,
  options: SessionOptions = DEFAULT_SESSION_OPTIONS,
): SessionState {
  if (state.stage === 'SETUP') {
    const seenAnchors = frame.anchors.some((p) => p != null);
    const why =
      frame.angle == null || !seenAnchors || frame.scale == null ? 'Lùi ra xa để camera thấy cả người'
        : frame.posture.kind === 'bad' ? frame.posture.message
          : frame.form.kind === 'bad' ? frame.form.message
            : frame.angle <= exercise.upAbove ? `${exercise.setupHint} (góc đang ${Math.round(frame.angle)}°)`
              : null;
    const still = state.holdSince != null && frame.scale != null &&
      maxMove(state.holdAnchors, frame.anchors) < options.stillRatio * frame.scale;

    if (why || !still) {
      // Holding, and only just slipped: keep the hold for a moment instead of starting over
      const slipSince = state.slipSince ?? now;
      if (state.holdSince != null && now - slipSince < options.graceMs) {
        return { ...state, slipSince, message: why ?? 'Giữ yên…' };
      }
      return why
        ? { ...state, holdSince: null, slipSince: null, holdAnchors: [], message: why }
        : { ...state, holdSince: now, slipSince: null, holdAnchors: frame.anchors, message: 'Giữ yên…' };
    }
    if (now - state.holdSince! < holdTime(state, options)) return { ...state, slipSince: null, message: 'Giữ yên…' };
    return {
      ...state,
      stage: 'ACTIVE',
      wasActive: true,
      holdSince: null,
      slipSince: null,
      holdAnchors: [],
      anchors: frame.anchors,
      scale: frame.scale,
      offFrames: 0,
      message: null,
      counter: stepRepCounter(state.counter, frame, now, exercise),
    };
  }

  // ACTIVE: out of position (wrong posture or a hand / foot moved away) for a few frames -> SETUP
  const drifted = state.scale != null && maxMove(state.anchors, frame.anchors) > options.driftRatio * state.scale;
  const off = frame.posture.kind === 'bad' || drifted;
  const offFrames = off ? state.offFrames + 1 : 0;
  if (offFrames >= options.offFrames) {
    return toSetup(state, frame.posture.kind === 'bad' ? frame.posture.message : 'Bạn đã rời vị trí ban đầu, vào lại tư thế');
  }
  return { ...state, offFrames, counter: stepRepCounter(state.counter, frame, now, exercise) };
}

const holdTime = (state: SessionState, options: SessionOptions) => (state.wasActive ? options.rejoinHoldMs : options.holdMs);

// 0..1 for the "hold still" progress bar
export function holdProgress(state: SessionState, now: number, options: SessionOptions = DEFAULT_SESSION_OPTIONS): number {
  if (state.stage !== 'SETUP' || state.holdSince == null) return 0;
  return Math.min(1, (now - state.holdSince) / holdTime(state, options));
}
