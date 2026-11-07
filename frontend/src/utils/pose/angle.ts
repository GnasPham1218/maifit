// Pure geometry for pose landmarks. No MediaPipe import, so it is unit tested on its own.

export interface Point {
  x: number;
  y: number;
  z?: number; // 3D world landmarks (meters); 0 for flat 2D points
}

// Inner angle at joint b of the chain a-b-c, in degrees 0..180 (hip-knee-ankle -> knee angle).
// 180 = fully straight. Works in 2D and 3D. NaN when a segment has zero length.
//
// atan2(|cross|, dot) is the angle between the two segments, always in 0..180 and numerically
// stable near 0 and 180 (acos of a normalized dot product loses precision there), with no
// wrap-around to handle (unlike subtracting two 2D atan2 results, which can give e.g. 300).
export function jointAngle(a: Point, b: Point, c: Point): number {
  const u = [a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0)];
  const v = [c.x - b.x, c.y - b.y, (c.z ?? 0) - (b.z ?? 0)];
  const lenU = Math.hypot(u[0], u[1], u[2]);
  const lenV = Math.hypot(v[0], v[1], v[2]);
  if (lenU === 0 || lenV === 0) return NaN;

  const cross = Math.hypot(u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]);
  const dot = u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  return (Math.atan2(cross, dot) * 180) / Math.PI;
}
