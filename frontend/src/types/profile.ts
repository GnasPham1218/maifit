// Mirrors the backend DTOs in profile/dto and body/dto
export type Sex = 'MALE' | 'FEMALE';
export type ActivityLevel = 'SEDENTARY' | 'LIGHT' | 'MODERATE' | 'ACTIVE' | 'VERY_ACTIVE';
export type Goal = 'LOSE' | 'MAINTAIN' | 'GAIN';

export type BmrFormula = 'SCHOFIELD' | 'KATCH_MCARDLE' | 'MIFFLIN_ST_JEOR';
export type MacroSplit = 'MODERATE_CARB' | 'LOWER_CARB' | 'HIGHER_CARB';

export interface Macros {
  split: MacroSplit;
  proteinG: number;
  fatG: number;
  carbG: number;
}

export interface EnergyTargets {
  formula: BmrFormula;
  bmr: number;
  tdee: number;
  suggestedKcal: number;
  targetKcal: number; // custom target if set, otherwise suggestedKcal
  deficitSkippedForMinor: boolean; // under 18 + goal LOSE: no deficit applied
  macros: Macros[]; // one per split
}

export interface Profile {
  sex: Sex;
  birthDate: string; // yyyy-MM-dd
  heightCm: number;
  activityLevel: ActivityLevel;
  goal: Goal;
  customTargetKcal: number | null;
  age: number;
  latestWeightKg: number | null; // null until the first check-in
  energy: EnergyTargets | null; // null until the first check-in
}

export interface ProfileRequest {
  sex: Sex;
  birthDate: string;
  heightCm: number;
  activityLevel: ActivityLevel;
  goal: Goal;
  customTargetKcal: number | null;
}

export interface BodyCheckin {
  id: number;
  checkedAt: string; // ISO-8601, UTC
  weightKg: number;
  bodyFatPct: number | null;
  waistCm: number | null;
  note: string | null;
}

export interface CreateBodyCheckinRequest {
  checkedAt?: string;
  weightKg: number;
  bodyFatPct?: number | null;
  waistCm?: number | null;
  note?: string | null;
}
