import type { Profile, ProfileRequest } from '../types/profile';

// PUT /profile replaces everything, so every save starts from the saved profile and changes only
// the fields of the section being saved. Otherwise saving "Mục tiêu" would wipe the allergies.
export function toRequest(profile: Profile, changes: Partial<ProfileRequest> = {}): ProfileRequest {
  return {
    sex: profile.sex,
    birthDate: profile.birthDate,
    heightCm: profile.heightCm,
    activityLevel: profile.activityLevel,
    goal: profile.goal,
    customTargetKcal: profile.customTargetKcal,
    trainingExperience: profile.trainingExperience,
    trainingType: profile.trainingType,
    dietType: profile.dietType,
    suggestionStyle: profile.suggestionStyle,
    targetWeightKg: profile.targetWeightKg,
    allergens: profile.allergens,
    excludedFoodIds: profile.excludedFoods.map((f) => f.id),
    ...changes,
  };
}

// The coach answers still missing, in onboarding order. Allergies and excluded foods are optional
// ("none" is a valid answer), so they never count as missing.
export type CoachGap = 'body' | 'training' | 'diet';

export function coachGaps(profile: Profile | null): CoachGap[] {
  if (!profile) return ['body', 'training', 'diet'];
  const gaps: CoachGap[] = [];
  if (profile.latestWeightKg == null) gaps.push('body');
  if (profile.trainingExperience == null || profile.trainingType == null) gaps.push('training');
  if (profile.dietType == null) gaps.push('diet');
  return gaps;
}

// 0-100 for the "Hồ sơ còn N mục" ring: body counts double (the calorie target needs it)
export function coachProgress(profile: Profile | null): number {
  const gaps = coachGaps(profile);
  const weights: Record<CoachGap, number> = { body: 2, training: 1, diet: 1 };
  const missing = gaps.reduce((sum, g) => sum + weights[g], 0);
  return Math.round(((4 - missing) / 4) * 100);
}
