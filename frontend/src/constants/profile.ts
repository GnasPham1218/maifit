import type {
  ActivityLevel, BmrFormula, DietType, Goal, MacroSplit, Sex, SuggestionStyle, TrainingExperience, TrainingType,
} from '../types/profile';

// A choice with a short line under it (option cards in the coach profile and onboarding)
export interface Choice<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

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
  { value: 'FAT_LOSS', label: 'Giảm mỡ, giữ cơ (−500 kcal)' },
  { value: 'RECOMP', label: 'Giảm mỡ và tăng cơ cùng lúc' },
  { value: 'MAINTAIN', label: 'Giữ cân, ăn uống lành mạnh' },
  { value: 'LEAN_BULK', label: 'Tăng cơ, hạn chế tăng mỡ (+10–15%)' },
  { value: 'WEIGHT_GAIN', label: 'Tăng cân (+500 kcal)' },
  { value: 'ENDURANCE', label: 'Sức bền (chạy bộ, đạp xe, bơi)' },
];

// Short labels for chips (the long ones above stay for the select in older screens)
export const ACTIVITY_CHOICES: Choice<ActivityLevel>[] = [
  { value: 'SEDENTARY', label: 'Ít vận động' },
  { value: 'LIGHT', label: 'Nhẹ 1–3 buổi/tuần' },
  { value: 'MODERATE', label: 'Vừa 3–5 buổi' },
  { value: 'ACTIVE', label: 'Nhiều 6–7 buổi' },
  { value: 'VERY_ACTIVE', label: 'Rất nhiều' },
];

export const GOAL_CHOICES: Choice<Goal>[] = [
  { value: 'FAT_LOSS', label: 'Giảm mỡ, giữ cơ', hint: 'Ăn thiếu khoảng 500 kcal mỗi ngày' },
  { value: 'RECOMP', label: 'Giảm mỡ và tăng cơ', hint: 'Hợp người mới tập hoặc quay lại tập' },
  { value: 'MAINTAIN', label: 'Giữ cân', hint: 'Ăn bằng mức tiêu hao' },
  { value: 'LEAN_BULK', label: 'Tăng cơ, hạn chế mỡ', hint: 'Ăn dư 10–15%' },
  { value: 'WEIGHT_GAIN', label: 'Tăng cân', hint: 'Ăn dư khoảng 500 kcal' },
  { value: 'ENDURANCE', label: 'Sức bền', hint: 'Chạy bộ, đạp xe, bơi' },
];

export const GOAL_SHORT: Record<Goal, string> = {
  FAT_LOSS: 'giảm mỡ, giữ cơ', RECOMP: 'giảm mỡ, tăng cơ', MAINTAIN: 'giữ cân',
  LEAN_BULK: 'tăng cơ', WEIGHT_GAIN: 'tăng cân', ENDURANCE: 'sức bền',
};

export const EXPERIENCE_CHOICES: Choice<TrainingExperience>[] = [
  { value: 'BEGINNER', label: 'Mới bắt đầu', hint: 'Chưa tập đều hoặc dưới 3 tháng' },
  { value: 'UNDER_1_YEAR', label: 'Dưới 1 năm', hint: 'Đã tập đều vài tháng' },
  { value: 'OVER_1_YEAR', label: 'Trên 1 năm', hint: 'Tập đều, đã quen bài' },
];

export const TRAINING_TYPE_CHOICES: Choice<TrainingType>[] = [
  { value: 'STRENGTH', label: 'Tạ, sức mạnh' },
  { value: 'CARDIO', label: 'Cardio' },
  { value: 'SPORTS', label: 'Thể thao' },
  { value: 'LIGHT', label: 'Nhẹ: đi bộ, yoga' },
];

export const DIET_CHOICES: Choice<DietType>[] = [
  { value: 'OMNIVORE', label: 'Ăn tất cả' },
  { value: 'VEGETARIAN', label: 'Ăn chay (có trứng, sữa)' },
  { value: 'VEGAN', label: 'Thuần chay' },
];

export const SUGGESTION_CHOICES: Choice<SuggestionStyle>[] = [
  { value: 'VARIETY', label: 'Đa dạng', hint: 'Đổi món mỗi ngày' },
  { value: 'FAMILIAR', label: 'Món quen', hint: 'Lặp lại món hay ăn' },
];

// Links can jump to the excluded-foods block: /profile?tab=coach#mon-khong-an scrolls there and focuses the search
export const EXCLUDED_ANCHOR = 'mon-khong-an';
export const EXCLUDED_SEARCH_ID = 'excluded-food-search';

export const MAX_EXCLUDED_FOODS = 50; // same limit as ProfileRequest on the backend

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

// What each block is used for ("Vì sao MAIFit hỏi?")
export const COACH_WHY = {
  body: 'Lượng calo cơ thể đốt mỗi ngày (TDEE) phụ thuộc vào giới tính, tuổi, chiều cao, cân nặng và mức vận động. Thiếu một câu là mục tiêu calo bị lệch.',
  goal: 'Mục tiêu quyết định bạn nên ăn thiếu hay dư bao nhiêu calo, và cần bao nhiêu gam đạm để giữ hoặc tăng cơ.',
  training: 'Người mới tập tăng cơ nhanh hơn nên được ăn dư nhiều hơn khi tăng cơ. Tập tạ cần nhiều đạm hơn tập nhẹ như đi bộ hay yoga.',
  diet: 'MBotFit sẽ không gợi ý món chứa thứ bạn dị ứng, và chỉ gợi ý món hợp chế độ ăn của bạn. Danh sách dị ứng trong hồ sơ không gửi cho AI: máy chủ MAIFit tự lọc món.',
  excluded: 'Gợi ý chỉ có ích khi bạn chịu ăn. Món bạn chọn ở đây sẽ không xuất hiện trong thực đơn gợi ý.',
};
