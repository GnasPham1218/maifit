import {
  ACTIVITY_CHOICES, EXCLUDED_ANCHOR, DIET_CHOICES, EXPERIENCE_CHOICES, GOAL_CHOICES, SEX_OPTIONS, SUGGESTION_CHOICES,
  TRAINING_TYPE_CHOICES,
} from '../../../constants/profile';
import type { CoachDraft } from '../../../utils/coachDraft';
import { FormField } from '../../FormField';
import { Ban, Drumstick, Egg, Repeat, Salad, ShieldAlert, Shuffle, Vegan } from 'lucide-react';
import type { DietType, SuggestionStyle } from '../../../types/profile';
import {
  AllergenChecklist, AllergenDisclaimer, ChipChoices, ChoiceCards, ExcludedFoodsPicker, FieldGroup, IconChoiceCards, NumberInput,
  TonePanel,
} from './fields';

const DIET_ICONS: Record<DietType, typeof Egg> = { OMNIVORE: Drumstick, VEGETARIAN: Egg, VEGAN: Vegan };
const STYLE_ICONS: Record<SuggestionStyle, typeof Egg> = { VARIETY: Shuffle, FAMILIAR: Repeat };

// The coach questions, shared by the onboarding steps and the "Hồ sơ huấn luyện" tab.
// Each block edits a part of one CoachDraft; the parent decides when to save.

export interface FieldsProps {
  draft: CoachDraft;
  set: (changes: Partial<CoachDraft>) => void;
  fieldErrors?: Record<string, string>;
  compact?: boolean; // narrow layout (phone onboarding): one column of cards
}


// withCheckin: onboarding also asks the weight (and body fat), saved as a body check-in
export function BodyFields({ draft, set, fieldErrors = {}, withCheckin = false }: FieldsProps & { withCheckin?: boolean }) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-3.5 sm:grid-cols-2">
        <FieldGroup id="coach-sex" label="Giới tính sinh học">
          <ChipChoices choices={SEX_OPTIONS} value={draft.sex} onChange={(sex) => set({ sex })} />
        </FieldGroup>
        <FormField label="Ngày sinh" name="birthDate" type="date" required value={draft.birthDate}
          error={fieldErrors.birthDate} onChange={(e) => set({ birthDate: e.target.value })} />
        <NumberInput id="coach-height" label="Chiều cao" unit="cm" min={100} max={250} required
          value={draft.heightCm} onChange={(heightCm) => set({ heightCm })} />
        {withCheckin && (
          <NumberInput id="coach-weight" label="Cân nặng" unit="kg" min={20} max={400} required
            value={draft.weightKg} onChange={(weightKg) => set({ weightKg })} />
        )}
        {withCheckin && (
          <NumberInput id="coach-fat" label="Tỉ lệ mỡ" unit="%" min={2} max={75} optional
            value={draft.bodyFatPct} onChange={(bodyFatPct) => set({ bodyFatPct })}
            hint="Có số đo từ máy InBody thì nhập, giúp tính đạm theo khối nạc. Không biết thì bỏ trống." />
        )}
      </div>
      <FieldGroup id="coach-activity" label="Mức vận động hằng ngày">
        <ChipChoices choices={ACTIVITY_CHOICES} value={draft.activityLevel} onChange={(activityLevel) => set({ activityLevel })} />
      </FieldGroup>
    </div>
  );
}

// withCustomKcal: the profile tab also lets the user type their own calorie target
export function GoalFields({ draft, set, compact, withCustomKcal = false }: FieldsProps & { withCustomKcal?: boolean }) {
  return (
    <div className="grid gap-4">
      <ChoiceCards choices={GOAL_CHOICES} value={draft.goal} onChange={(goal) => set({ goal })}
        columns={compact ? '' : 'sm:grid-cols-2 lg:grid-cols-3'} />
      <div className={`grid gap-3.5 ${withCustomKcal ? 'sm:grid-cols-2 lg:max-w-xl' : 'max-w-72'}`}>
        <NumberInput id="coach-target-weight" label="Cân nặng mong muốn" unit="kg" min={20} max={400} optional
          value={draft.targetWeightKg} onChange={(targetWeightKg) => set({ targetWeightKg })} />
        {withCustomKcal && (
          <NumberInput id="coach-custom-kcal" label="Calo tự đặt" unit="kcal" min={1000} max={6000} step="1" optional
            value={draft.customTargetKcal} onChange={(customTargetKcal) => set({ customTargetKcal })}
            hint="Để trống để dùng mức MAIFit tính." />
        )}
      </div>
    </div>
  );
}

export function TrainingFields({ draft, set, compact }: FieldsProps) {
  return (
    <div className="grid gap-4">
      <FieldGroup id="coach-experience" label="Bạn tập được bao lâu rồi?">
        <ChoiceCards choices={EXPERIENCE_CHOICES} value={draft.trainingExperience}
          onChange={(trainingExperience) => set({ trainingExperience })} columns={compact ? '' : 'sm:grid-cols-3'} />
      </FieldGroup>
      <FieldGroup id="coach-type" label="Bạn tập kiểu gì nhiều nhất?">
        <ChipChoices choices={TRAINING_TYPE_CHOICES} value={draft.trainingType} onChange={(trainingType) => set({ trainingType })} />
      </FieldGroup>
    </div>
  );
}

// Three tinted parts: what you eat (green), what is dangerous (red), what you just do not eat (amber)
export function DietFields({ draft, set, compact }: FieldsProps) {
  const count = draft.allergens.length;
  return (
    <div className="grid gap-3.5">
      <TonePanel icon={Salad} tone="good" title="Chế độ ăn" hint="MBotFit chỉ gợi ý món hợp chế độ này.">
        <IconChoiceCards choices={DIET_CHOICES} icons={DIET_ICONS} value={draft.dietType} tone="good"
          onChange={(dietType) => set({ dietType })} columns={compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-3'} />
        <FieldGroup id="coach-style" label="Kiểu gợi ý món">
          <IconChoiceCards choices={SUGGESTION_CHOICES} icons={STYLE_ICONS} value={draft.suggestionStyle}
            onChange={(suggestionStyle) => set({ suggestionStyle })} columns="grid-cols-2" />
        </FieldGroup>
      </TonePanel>
      <TonePanel icon={ShieldAlert} tone="danger" title="Dị ứng" hint="Không dị ứng gì thì để trống."
        right={count > 0 ? <span className="shrink-0 rounded-full bg-danger px-2.5 py-0.5 text-xs font-bold text-white">Tránh {count} nhóm</span> : undefined}>
        <AllergenChecklist value={draft.allergens} onChange={(allergens) => set({ allergens })}
          columns={compact ? 'grid-cols-1 sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'} />
        <AllergenDisclaimer />
      </TonePanel>
    </div>
  );
}

export function ExcludedFields({ draft, set }: FieldsProps) {
  return (
    <TonePanel id={EXCLUDED_ANCHOR} icon={Ban} tone="warn" title="Món không ăn được / không thích"
      hint="Chọn theo tên: mọi cách chế biến của món đó đều bị loại (sống, luộc, nướng…).">
      <ExcludedFoodsPicker value={draft.excludedFoods} onChange={(excludedFoods) => set({ excludedFoods })} />
    </TonePanel>
  );
}
