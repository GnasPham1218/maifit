// Small formatting helpers for the camera overlay and the set log (kept out of component files)

// One finished attempt of the set: counted, or why not
export interface Attempt {
  seq: number;
  rep: number | null; // rep number when it counted
  low: number | null; // lowest angle of the attempt
  ok: boolean;
  reason: string | null; // full sentence for the camera toast
  tag?: string | null; // short label for the set log ("Chưa đủ sâu")
  high?: number | null; // highest angle on the way up, when it did not come up
}

// "Rep 12 hợp lệ, gối 88°" / "Chưa tính, gối 118°: chưa đủ sâu"
export function attemptText(a: Attempt, joint: string): string {
  const low = a.low != null ? `, ${joint} ${a.low}°` : '';
  return a.ok ? `Rep ${a.rep} hợp lệ${low}` : `Chưa tính${low}: ${a.reason}`;
}

// 83 -> "01:23"
export function clock(seconds: number): string {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

const STRAIGHT = 180;
const MARGIN = 20; // degrees past the target still shown, so the target mark is not at the very bottom

// How far the depth bar is filled (0..1) for a joint angle: 0 = straight, the target sits a bit above 1
export function depthShare(angle: number, downBelow: number): number {
  return Math.min(1, Math.max(0, (STRAIGHT - angle) / (STRAIGHT - downBelow + MARGIN)));
}
