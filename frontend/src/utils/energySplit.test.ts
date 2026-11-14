import { describe, expect, it } from 'vitest';
import { energySplit } from './energySplit';

describe('energySplit', () => {
  it('splits by 4 / 4 / 9 kcal per gram', () => {
    // Boiled rice: 2.69 g protein, 28.2 g carb, 0.28 g fat -> 10.76 + 112.8 + 2.52 = 126.08 kcal
    // protein 8.53 % -> 9, carb 89.47 % -> 89, fat the rest = 2
    expect(energySplit(2.69, 28.2, 0.28)).toEqual({ protein: 9, carb: 89, fat: 2 });
  });

  it('always adds up to 100', () => {
    const split = energySplit(1, 1, 1)!;
    expect(split.protein + split.carb + split.fat).toBe(100);
  });

  it('counts missing values as zero and gives null when nothing is left', () => {
    expect(energySplit(null, 10, null)).toEqual({ protein: 0, carb: 100, fat: 0 });
    expect(energySplit(null, null, null)).toBeNull();
    expect(energySplit(0, 0, 0)).toBeNull();
  });
});
