import { describe, expect, it } from 'vitest';
import type { Profile } from '../types/profile';
import { draftFrom, sectionDirty } from './coachDraft';
import { coachGaps, coachProgress, toRequest } from './profileRequest';

const PROFILE: Profile = {
  sex: 'MALE', birthDate: '2002-08-12', heightCm: 172, activityLevel: 'MODERATE', goal: 'FAT_LOSS',
  customTargetKcal: null, age: 24, latestWeightKg: 71.4, latestBodyFatPct: 12, energy: null,
  trainingExperience: 'UNDER_1_YEAR', trainingType: 'STRENGTH', dietType: 'OMNIVORE', suggestionStyle: 'VARIETY',
  targetWeightKg: 66, allergens: ['PEANUTS'], excludedFoods: [{ id: 7, name: 'Gan heo' }], coachComplete: true,
};

describe('toRequest', () => {
  it('keeps every saved field and changes only the given ones', () => {
    const req = toRequest(PROFILE, { goal: 'MAINTAIN' });
    expect(req.goal).toBe('MAINTAIN');
    expect(req.allergens).toEqual(['PEANUTS']);
    expect(req.excludedFoodIds).toEqual([7]);
    expect(req.trainingType).toBe('STRENGTH');
  });
});

describe('coachGaps', () => {
  it('lists every step when there is no profile', () => {
    expect(coachGaps(null)).toEqual(['body', 'training', 'diet']);
    expect(coachProgress(null)).toBe(0);
  });

  it('is empty for a complete profile', () => {
    expect(coachGaps(PROFILE)).toEqual([]);
    expect(coachProgress(PROFILE)).toBe(100);
  });

  it('counts a missing weight and diet', () => {
    const p = { ...PROFILE, latestWeightKg: null, dietType: null };
    expect(coachGaps(p)).toEqual(['body', 'diet']);
    expect(coachProgress(p)).toBe(25);
  });
});

describe('coach draft', () => {
  it('is clean right after loading', () => {
    const d = draftFrom(PROFILE);
    expect(sectionDirty('diet', d, PROFILE)).toBe(false);
    expect(sectionDirty('body', d, PROFILE)).toBe(false);
  });

  it('ignores the order of allergens', () => {
    const p = { ...PROFILE, allergens: ['PEANUTS', 'MILK'] };
    const d = { ...draftFrom(p), allergens: ['MILK', 'PEANUTS'] };
    expect(sectionDirty('diet', d, p)).toBe(false);
  });

  it('sees a changed goal only in its own section', () => {
    const d = { ...draftFrom(PROFILE), goal: 'MAINTAIN' as const };
    expect(sectionDirty('goal', d, PROFILE)).toBe(true);
    expect(sectionDirty('training', d, PROFILE)).toBe(false);
  });
});
