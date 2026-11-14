import type { MacroKey } from '../constants/macros';

export type EnergySplit = Record<Exclude<MacroKey, 'fiber'>, number>; // whole percent, adds up to 100

// Share of energy from protein, carb and fat (4 / 4 / 9 kcal per gram), for the split bar.
// Only the proportions are drawn: the kcal shown stays the table's own value (USDA uses per-food factors).
// null when there is nothing to split (no macro data, or all zero).
export function energySplit(proteinG: number | null, carbG: number | null, fatG: number | null): EnergySplit | null {
  const p = (proteinG ?? 0) * 4;
  const c = (carbG ?? 0) * 4;
  const f = (fatG ?? 0) * 9;
  const total = p + c + f;
  if (total <= 0) return null;
  const protein = Math.round((p / total) * 100);
  const carb = Math.round((c / total) * 100);
  return { protein, carb, fat: 100 - protein - carb }; // the rest, so rounding never shows 99 % or 101 %
}
