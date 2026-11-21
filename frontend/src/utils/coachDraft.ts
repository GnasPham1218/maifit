import type {
  ActivityLevel, DietType, ExcludedFood, Goal, Profile, ProfileRequest, Sex, SuggestionStyle,
  TrainingExperience, TrainingType,
} from '../types/profile';
import { optionalNumber } from './number';

// What the coach forms edit (onboarding and the "Hồ sơ huấn luyện" tab). Numbers stay strings while typing.
export interface CoachDraft {
  sex: Sex;
  birthDate: string;
  heightCm: string;
  activityLevel: ActivityLevel;
  goal: Goal;
  targetWeightKg: string;
  customTargetKcal: string; // empty = use the suggested target
  trainingExperience: TrainingExperience | null;
  trainingType: TrainingType | null;
  dietType: DietType | null;
  suggestionStyle: SuggestionStyle;
  allergens: string[];
  excludedFoods: ExcludedFood[];
  // Not part of the profile: a body check-in (onboarding only)
  weightKg: string;
  bodyFatPct: string;
}

export type CoachSection = 'body' | 'goal' | 'training' | 'diet' | 'excluded';

export function draftFrom(profile: Profile | null): CoachDraft {
  return {
    sex: profile?.sex ?? 'MALE',
    birthDate: profile?.birthDate ?? '',
    heightCm: profile ? String(profile.heightCm) : '',
    activityLevel: profile?.activityLevel ?? 'MODERATE',
    goal: profile?.goal ?? 'MAINTAIN',
    targetWeightKg: profile?.targetWeightKg != null ? String(profile.targetWeightKg) : '',
    customTargetKcal: profile?.customTargetKcal != null ? String(profile.customTargetKcal) : '',
    trainingExperience: profile?.trainingExperience ?? null,
    trainingType: profile?.trainingType ?? null,
    dietType: profile?.dietType ?? null,
    suggestionStyle: profile?.suggestionStyle ?? 'VARIETY',
    allergens: profile?.allergens ?? [],
    excludedFoods: profile?.excludedFoods ?? [],
    weightKg: profile?.latestWeightKg != null ? String(profile.latestWeightKg) : '',
    bodyFatPct: '',
  };
}

// The profile fields one section owns. Saving a section sends the saved profile + these fields.
export function sectionChanges(section: CoachSection, d: CoachDraft): Partial<ProfileRequest> {
  switch (section) {
    case 'body':
      return { sex: d.sex, birthDate: d.birthDate, heightCm: Number(d.heightCm), activityLevel: d.activityLevel };
    case 'goal':
      return { goal: d.goal, targetWeightKg: optionalNumber(d.targetWeightKg), customTargetKcal: optionalNumber(d.customTargetKcal) };
    case 'training':
      return { trainingExperience: d.trainingExperience, trainingType: d.trainingType };
    case 'diet':
      return { dietType: d.dietType, suggestionStyle: d.suggestionStyle, allergens: d.allergens };
    case 'excluded':
      return { excludedFoodIds: d.excludedFoods.map((f) => f.id) };
  }
}

// Several sections at once: the onboarding's "Cơ thể và vận động" step creates the profile with them
export function changesOf(sections: CoachSection[], d: CoachDraft): Partial<ProfileRequest> {
  return Object.assign({}, ...sections.map((s) => sectionChanges(s, d))) as Partial<ProfileRequest>;
}

// A section has unsaved edits. Sets (allergens, foods) compare without their order.
export function sectionDirty(section: CoachSection, draft: CoachDraft, saved: Profile | null): boolean {
  return canonical(sectionChanges(section, draft)) !== canonical(sectionChanges(section, draftFrom(saved)));
}

function canonical(changes: Partial<ProfileRequest>): string {
  const copy: Record<string, unknown> = { ...changes };
  if (Array.isArray(copy.allergens)) copy.allergens = [...(copy.allergens as string[])].sort();
  if (Array.isArray(copy.excludedFoodIds)) copy.excludedFoodIds = [...(copy.excludedFoodIds as number[])].sort((a, b) => a - b);
  return JSON.stringify(copy);
}
