import type { ActivityLevel, BmrFormula, Goal, MacroSplit, Sex } from '../types/profile';

export const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: 'MALE', label: 'Nam' },
  { value: 'FEMALE', label: 'Nữ' },
];

export const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string }[] = [
  { value: 'SEDENTARY', label: 'Ít vận động (ngồi nhiều, không tập)' },
  { value: 'LIGHT', label: 'Nhẹ (tập 1–3 buổi/tuần)' },
  { value: 'MODERATE', label: 'Vừa (tập 3–5 buổi/tuần)' },
  { value: 'ACTIVE', label: 'Nhiều (tập 6–7 buổi/tuần)' },
  { value: 'VERY_ACTIVE', label: 'Rất nhiều (tập nặng hoặc lao động chân tay)' },
];

export const GOAL_OPTIONS: { value: Goal; label: string }[] = [
  { value: 'LOSE', label: 'Giảm cân (−500 kcal)' },
  { value: 'MAINTAIN', label: 'Giữ cân' },
  { value: 'GAIN', label: 'Tăng cân (+500 kcal)' },
];

export const FORMULA_LABELS: Record<BmrFormula, string> = {
  SCHOFIELD: 'Schofield (dành cho 13–17 tuổi)',
  KATCH_MCARDLE: 'Katch-McArdle (dùng % mỡ của lần đo mới nhất)',
  MIFFLIN_ST_JEOR: 'Mifflin-St Jeor (chưa có % mỡ)',
};

export const MACRO_SPLIT_LABELS: Record<MacroSplit, string> = {
  MODERATE_CARB: 'Carb vừa (30/35/35)',
  LOWER_CARB: 'Ít carb (40/40/20)',
  HIGHER_CARB: 'Nhiều carb (30/20/50)',
};
