// Splits the ring of the calorie donut. The ring is the daily target; the colored part is what was eaten,
// shared between protein, carb and fat by their share of energy (4/4/9 kcal per gram).
// Only the proportions come from 4/4/9: the eaten total itself is the real number from the foods table.

export interface RingSegment {
  start: number; // 0..100, where the segment begins on the ring
  length: number; // 0..100
}

export function ringSegments(eatenKcal: number, targetKcal: number, grams: { protein: number; carb: number; fat: number }): RingSegment[] {
  const energy = [grams.protein * 4, grams.carb * 4, grams.fat * 9];
  const totalEnergy = energy.reduce((a, b) => a + b, 0);
  if (targetKcal <= 0 || eatenKcal <= 0 || totalEnergy <= 0) return energy.map(() => ({ start: 0, length: 0 }));
  const filled = Math.min(eatenKcal / targetKcal, 1) * 100; // over the target: a full ring, never more
  let start = 0;
  return energy.map((e) => {
    const length = (e / totalEnergy) * filled;
    const segment = { start, length };
    start += length;
    return segment;
  });
}
