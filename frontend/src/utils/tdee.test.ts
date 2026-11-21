import { describe, expect, it } from 'vitest';
import { ageOn, previewTargets, type PreviewInput } from './tdee';

const BASE: PreviewInput = {
  sex: 'MALE', weightKg: 71.4, heightCm: 172, bodyFatPct: 12, age: 24, activity: 'MODERATE',
  goal: 'FAT_LOSS', experience: 'UNDER_1_YEAR', trainingType: 'STRENGTH', customTargetKcal: null,
};

describe('previewTargets (same numbers as TdeeCalculator)', () => {
  it('fat loss with body fat: Katch-McArdle, protein on lean mass', () => {
    const t = previewTargets(BASE);
    expect([t.bmr, t.tdee, t.targetKcal, t.proteinTargetG, t.proteinBasis]).toEqual([1727, 2677, 2177, 145, 'LEAN_MASS']);
  });

  it('no body fat: Mifflin-St Jeor', () => {
    const t = previewTargets({ ...BASE, weightKg: 63, heightCm: 165, bodyFatPct: null, age: 21, activity: 'ACTIVE', goal: 'RECOMP' });
    expect([t.tdee, t.targetKcal, t.proteinTargetG]).toEqual([2693, 2693, 126]);
  });

  it('lean bulk: +15% for beginners, +10% when not answered', () => {
    const beginner = previewTargets({ ...BASE, goal: 'LEAN_BULK', experience: 'BEGINNER' });
    const unknown = previewTargets({ ...BASE, goal: 'LEAN_BULK', experience: null });
    expect(beginner.targetKcal).toBe(2677 + Math.round(2677.1 * 0.15));
    expect(unknown.targetKcal).toBeLessThan(beginner.targetKcal);
  });

  it('light training caps protein at 1.2 g/kg', () => {
    expect(previewTargets({ ...BASE, goal: 'MAINTAIN', trainingType: 'LIGHT' }).proteinTargetG).toBe(Math.round(71.4 * 1.2));
  });

  it('a teenager gets no deficit and the body fat is ignored', () => {
    const t = previewTargets({ ...BASE, age: 16 });
    expect(t.targetKcal).toBe(t.tdee);
    expect(t.proteinBasis).toBe('BODY_WEIGHT');
  });

  it('a custom target wins', () => {
    expect(previewTargets({ ...BASE, customTargetKcal: 2000 }).targetKcal).toBe(2000);
  });
});

describe('ageOn', () => {
  it('counts full years only', () => {
    expect(ageOn('2004-12-12', '2026-11-21')).toBe(21);
    expect(ageOn('2004-11-21', '2026-11-21')).toBe(22);
  });
});
