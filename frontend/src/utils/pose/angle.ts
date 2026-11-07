// Pure geometry for pose landmarks. No MediaPipe import, so it is unit tested on its own.

export interface Point2D {
  x: number;
  y: number;
}

// Inner angle at joint b of the chain a-b-c, in degrees 0..180 (hip-knee-ankle -> knee angle).
// 180 = fully straight. NaN when a segment has zero length (two points on top of each other).
//
// atan2(cross, dot) gives the signed angle between the two segments in (-180, 180];
// taking the absolute value folds it into 0..180, so there is no wrap-around to handle
// (unlike subtracting two atan2 results, which can give e.g. 300 for a 60 degree angle).
export function jointAngle(a: Point2D, b: Point2D, c: Point2D): number {
  const abx = a.x - b.x;
  const aby = a.y - b.y;
  const cbx = c.x - b.x;
  const cby = c.y - b.y;
  if ((abx === 0 && aby === 0) || (cbx === 0 && cby === 0)) return NaN;

  const cross = abx * cby - aby * cbx;
  const dot = abx * cbx + aby * cby;
  return (Math.abs(Math.atan2(cross, dot)) * 180) / Math.PI;
}
