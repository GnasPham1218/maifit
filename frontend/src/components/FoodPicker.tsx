import { ArrowLeft, Check, Info } from 'lucide-react';
import { useMemo, useState } from 'react';
import { getErrorMessage } from '../constants/errorMessages';
import { MEAL_TYPE_LABELS, MEAL_TYPES, PREPARATION_LABELS } from '../constants/meal';
import type { Food, MealType } from '../types/meal';
import { edibleHint, leanHint } from '../utils/edible';
import { formatNumber } from '../utils/number';
import { kcalFor, nutritionFor, parseGrams } from '../utils/nutrition';
import { Button } from './Button';
import { Chip } from './Chip';
import { FatTrimSlider } from './FatTrimSlider';
import { FoodChooser } from './FoodChooser';
import { FormField } from './FormField';
import { MacroLine } from './MacroLine';
import { FoodDetailsView } from './food/FoodDetailsView';

interface Props {
  mealType: MealType;
  foods: Food[] | null; // null while loading
  onAdd: (foodId: number, grams: number, fatPercent: number | null) => Promise<void>;
  initialFood?: Food | null; // opened from a food's detail page: that preparation is already chosen
  onMealTypeChange?: (mealType: MealType) => void; // given -> the user can switch the meal here
}

// Add one food to a meal: search by name -> "weighed raw or cooked?" -> grams (calories shown live).
// Shown inside a Modal (MealsPage), which gives the title and the close button.
export function FoodPicker({ mealType, foods, onAdd, initialFood = null, onMealTypeChange }: Props) {
  const [food, setFood] = useState<Food | null>(initialFood);
  // The food detail view open over the form. The form stays mounted (only hidden), so the chosen food,
  // the grams and the fat slider are all still there when the user comes back.
  const [viewing, setViewing] = useState<number | null>(null);
  const [chooserKey, setChooserKey] = useState(0); // bumped to restart the chooser on a food picked in the details
  const [grams, setGrams] = useState('');
  const [fatPercent, setFatPercent] = useState(100); // 100 = as listed (mua về, chưa lọc mỡ)
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const parsed = parseGrams(grams);
  const foodsById = useMemo(() => new Map((foods ?? []).map((f) => [f.id, f])), [foods]);
  const leanFood = food?.leanVersionId != null ? foodsById.get(food.leanVersionId) : undefined;
  const trim = food?.leanVersionId && leanFood ? { leanFood, fatPercent } : undefined;

  async function handleSubmit() {
    if (!food || parsed == null) return;
    setError(null);
    setBusy(true);
    try {
      await onAdd(food.id, parsed, trim ? fatPercent : null); // the parent closes the picker on success
    } catch (err) {
      setError(getErrorMessage(err));
      setBusy(false);
    }
  }

  // "Chọn cách chế biến này" in the details: that preparation becomes the chosen food
  function pickFromDetails(id: number) {
    const picked = foodsById.get(id);
    if (picked) {
      setFood(picked);
      setFatPercent(100);
      setChooserKey((k) => k + 1);
    }
    setViewing(null);
  }

  return (
    <>
      {viewing != null && (
        <div className="grid gap-4">
          <button type="button" onClick={() => setViewing(null)}
            className="inline-flex cursor-pointer items-center gap-1.5 justify-self-start rounded-full py-1 text-sm font-medium text-link transition-colors hover:text-ink">
            <ArrowLeft aria-hidden="true" className="size-4" /> Quay lại chọn món
          </button>
          <FoodDetailsView id={viewing} onSelect={setViewing}
            actions={(v) => (
              <Button onClick={() => pickFromDetails(v.id)}>
                <Check aria-hidden="true" className="size-4" /> Chọn {PREPARATION_LABELS[v.preparation].toLowerCase()}
              </Button>
            )} />
        </div>
      )}

    <div className={viewing != null ? 'hidden' : 'grid gap-4'}>
      {onMealTypeChange && (
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-medium">Thêm vào bữa</legend>
          <div className="flex flex-wrap gap-2">
            {MEAL_TYPES.map((t) => (
              <Chip key={t} size="sm" selected={t === mealType} onClick={() => onMealTypeChange(t)}>
                {MEAL_TYPE_LABELS[t]}
              </Chip>
            ))}
          </div>
        </fieldset>
      )}

      {foods == null ? (
        <p className="text-sm text-muted">Đang tải danh sách món…</p>
      ) : (
        <>
          <FoodChooser key={chooserKey} foods={foods} idPrefix="food-new" autoFocus={food == null} initialFood={food}
            onChange={(f) => { setFood(f); setFatPercent(100); setError(null); }} />
          {food && (
            <button type="button" onClick={() => setViewing(food.id)}
              className="inline-flex cursor-pointer items-center gap-1.5 justify-self-start text-sm font-semibold text-link transition-colors hover:text-ink">
              <Info aria-hidden="true" className="size-4" /> Xem chi tiết {food.name.toLowerCase()}
            </button>
          )}

          {food && (
            <form className="flex flex-wrap items-end gap-3"
              onSubmit={(e) => { e.preventDefault(); void handleSubmit(); }}>
              <div className="w-36">
                <FormField label="Số gram" name="grams-new" inputMode="decimal" placeholder="vd. 150"
                  value={grams} onChange={(e) => setGrams(e.target.value)}
                  error={grams !== '' && parsed == null ? 'Từ 0,1 đến 5000 g' : undefined} />
              </div>
              <p className="pb-1 font-display text-4xl font-bold tabular-nums">
                {parsed != null ? formatNumber(kcalFor(food, parsed, trim)) : '—'}{' '}
                <span className="font-sans text-sm font-normal text-muted">kcal</span>
              </p>
              <Button type="submit" disabled={busy || parsed == null} className="mb-0.5">
                {busy ? 'Đang thêm…' : 'Thêm'}
              </Button>
            </form>
          )}
          {food && parsed != null && <MacroLine nutrition={nutritionFor(food, parsed, trim)} />}
          {trim && (
            <FatTrimSlider id="fat-trim-new" food={food!} leanFood={leanFood!}
              value={fatPercent} onChange={setFatPercent} />
          )}
          {food && edibleHint(food) && <p className="text-xs text-ink-soft">{edibleHint(food)}</p>}
          {food && leanHint(food) && <p className="text-xs text-ink-soft">{leanHint(food)}</p>}
          {/* USDA measures fried foods AFTER frying, so the absorbed oil is already counted */}
          {food?.preparation === 'FRIED' && (
            <p className="text-sm text-ink-soft">Số liệu món chiên đã gồm dầu ngấm vào món, không cần thêm Dầu ăn.</p>
          )}
          {food?.name === 'Dầu ăn' && (
            <p className="text-sm text-ink-soft">
              Chỉ thêm dầu khi món xào/chiên được ghi bằng nguyên liệu sống (vd. rau muống xào = rau muống sống + dầu).
            </p>
          )}
          {food && <p className="text-xs text-muted">Nguồn số liệu: {food.sourceName}</p>}
          {error && <p className="text-sm text-danger" role="alert">{error}</p>}
        </>
      )}
    </div>
    </>
  );
}
