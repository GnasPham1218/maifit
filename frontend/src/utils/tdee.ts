import type {
  ActivityLevel, Goal, ProteinBasis, Sex, TrainingExperience, TrainingType,
} from '../types/profile';

// A copy of backend TdeeCalculator (profile/service/TdeeCalculator.java), used ONLY to preview the
// numbers while the user edits the profile. The saved numbers always come from the server; tdee.test.ts
// pins the same cases as TdeeCalculatorTest so the two stay in step.

const ACTIVITY: Record<ActivityLevel, number> = {
  SEDENTARY: 1.2, LIGHT: 1.375, MODERATE: 1.55, ACTIVE: 1.725, VERY_ACTIVE: 1.9,
};
const PROTEIN_PER_KG: Record<Goal, number> = {
  FAT_LOSS: 2.2, RECOMP: 2.0, MAINTAIN: 1.6, LEAN_BULK: 2.0, WEIGHT_GAIN: 1.6, ENDURANCE: 1.6,
};
const ADULT_AGE = 18;
const MIN_KCAL = { MALE: 1500, FEMALE: 1200 } as const;

export interface PreviewInput {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  bodyFatPct: number | null;
  age: number;
  activity: ActivityLevel;
  goal: Goal;
  experience: TrainingExperience | null;
  trainingType: TrainingType | null;
  customTargetKcal: number | null;
}

export interface PreviewTargets {
  bmr: number;
  tdee: number;
  targetKcal: number;
  proteinTargetG: number;
  proteinPerKg: number;
  proteinBasis: ProteinBasis;
}

// Java's Math.round: half up (Math.round in JS is the same for positive numbers)
export function previewTargets(i: PreviewInput): PreviewTargets {
  const minor = i.age < ADULT_AGE;
  let bmr: number;
  if (minor) bmr = i.sex === 'MALE' ? 17.686 * i.weightKg + 658.2 : 13.384 * i.weightKg + 692.6;
  else if (i.bodyFatPct != null) bmr = 370 + 21.6 * i.weightKg * (1 - i.bodyFatPct / 100);
  else bmr = 10 * i.weightKg + 6.25 * i.heightCm - 5 * i.age + (i.sex === 'MALE' ? 5 : -161);

  const tdee = bmr * ACTIVITY[i.activity];
  let adjustment = 0;
  if (i.goal === 'FAT_LOSS') adjustment = -500;
  else if (i.goal === 'WEIGHT_GAIN') adjustment = 500;
  else if (i.goal === 'LEAN_BULK') {
    const beginner = i.experience === 'BEGINNER' || i.experience === 'UNDER_1_YEAR';
    adjustment = Math.round(tdee * (beginner ? 0.15 : 0.1));
  }
  if (minor && adjustment < 0) adjustment = 0;
  const suggested = Math.max(Math.round(tdee + adjustment), MIN_KCAL[i.sex]);

  const fat = minor ? null : i.bodyFatPct;
  let perKg = PROTEIN_PER_KG[i.goal];
  let basis: ProteinBasis = 'BODY_WEIGHT';
  let grams: number;
  if (i.trainingType === 'LIGHT') {
    perKg = Math.min(perKg, 1.2);
    grams = Math.round(i.weightKg * perKg);
  } else if (i.goal === 'FAT_LOSS' && fat != null) {
    perKg = 2.3;
    basis = 'LEAN_MASS';
    grams = Math.round(i.weightKg * (1 - fat / 100) * perKg);
  } else {
    grams = Math.round(i.weightKg * perKg);
  }

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    targetKcal: i.customTargetKcal ?? suggested,
    proteinTargetG: grams,
    proteinPerKg: perKg,
    proteinBasis: basis,
  };
}

// Same rule as TdeeCalculator.ageOn: full years on `today` (yyyy-MM-dd strings, Vietnam date)
export function ageOn(birthDate: string, today: string): number {
  const [by, bm, bd] = birthDate.split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
}
