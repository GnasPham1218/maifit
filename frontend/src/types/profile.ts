// Mirrors the backend DTOs in profile/dto and body/dto
export type Sex = 'MALE' | 'FEMALE';
export type ActivityLevel = 'SEDENTARY' | 'LIGHT' | 'MODERATE' | 'ACTIVE' | 'VERY_ACTIVE';
export type Goal = 'FAT_LOSS' | 'RECOMP' | 'MAINTAIN' | 'LEAN_BULK' | 'WEIGHT_GAIN' | 'ENDURANCE';
export type TrainingExperience = 'BEGINNER' | 'UNDER_1_YEAR' | 'OVER_1_YEAR';
export type TrainingType = 'STRENGTH' | 'CARDIO' | 'SPORTS' | 'LIGHT';
export type DietType = 'OMNIVORE' | 'VEGETARIAN' | 'VEGAN';
export type SuggestionStyle = 'VARIETY' | 'FAMILIAR';
export type ProteinBasis = 'BODY_WEIGHT' | 'LEAN_MASS';

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
  deficitSkippedForMinor: boolean; // under 18 + a goal with a deficit: no deficit applied
  macros: Macros[]; // one per split
  recommendedSplit: MacroSplit; // the split that fits the goal
  proteinTargetG: number; // daily protein target
  proteinPerKg: number; // the rate behind proteinTargetG
  proteinBasis: ProteinBasis; // LEAN_MASS: fat loss with a measured body fat %
}

// GET /allergens
export interface Allergen {
  code: string;
  name: string;
  examples: string;
}

export interface ExcludedFood {
  id: number; // the RAW row of that food
  name: string;
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
  latestBodyFatPct: number | null; // body fat % of that same check-in
  energy: EnergyTargets | null; // null until the first check-in
  // Personal coach: null = not answered yet
  trainingExperience: TrainingExperience | null;
  trainingType: TrainingType | null;
  dietType: DietType | null;
  suggestionStyle: SuggestionStyle;
  targetWeightKg: number | null;
  allergens: string[]; // allergen codes, display order
  excludedFoods: ExcludedFood[];
  coachComplete: boolean; // experience, training type and diet are all answered
}

// PUT /profile replaces the whole profile: always send every field (a missing list means "none")
export interface ProfileRequest {
  sex: Sex;
  birthDate: string;
  heightCm: number;
  activityLevel: ActivityLevel;
  goal: Goal;
  customTargetKcal: number | null;
  trainingExperience: TrainingExperience | null;
  trainingType: TrainingType | null;
  dietType: DietType | null;
  suggestionStyle: SuggestionStyle;
  targetWeightKg: number | null;
  allergens: string[];
  excludedFoodIds: number[];
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
