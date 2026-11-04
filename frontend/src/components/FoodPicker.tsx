import { X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { getErrorMessage } from '../constants/errorMessages';
import { MEAL_TYPE_LABELS } from '../constants/meal';
import type { Food, MealType } from '../types/meal';
import { edibleHint, leanHint } from '../utils/edible';
import { formatNumber } from '../utils/number';
import { kcalFor, nutritionFor, parseGrams } from '../utils/nutrition';
import { Button } from './Button';
import { FatTrimSlider } from './FatTrimSlider';
import { FoodChooser } from './FoodChooser';
import { FormField } from './FormField';
import { MacroLine } from './MacroLine';

interface Props {
  mealType: MealType;
  foods: Food[] | null; // null while loading
  onAdd: (foodId: number, grams: number, fatPercent: number | null) => Promise<void>;
  onClose: () => void;
}

// Add one food to a meal: search by name -> "weighed raw or cooked?" -> grams (calories shown live)
export function FoodPicker({ mealType, foods, onAdd, onClose }: Props) {
  const [food, setFood] = useState<Food | null>(null);
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

  return (
    <div className="grid gap-4 rounded-2xl bg-bg p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium">Thêm vào {MEAL_TYPE_LABELS[mealType].toLowerCase()}</p>
        <button type="button" onClick={onClose} aria-label="Đóng"
          className="flex size-9 cursor-pointer items-center justify-center rounded-full hover:bg-surface">
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>

      {foods == null ? (
        <p className="text-sm text-muted">Đang tải danh sách món…</p>
      ) : (
        <>
          <FoodChooser foods={foods} idPrefix={`food-${mealType}`} autoFocus
            onChange={(f) => { setFood(f); setFatPercent(100); setError(null); }} />

          {food && (
            <form className="flex flex-wrap items-end gap-3"
              onSubmit={(e) => { e.preventDefault(); void handleSubmit(); }}>
              <div className="w-36">
                <FormField label="Số gram" name={`grams-new-${mealType}`} inputMode="decimal" placeholder="vd. 150"
                  value={grams} onChange={(e) => setGrams(e.target.value)}
                  error={grams !== '' && parsed == null ? 'Từ 0,1 đến 5000 g' : undefined} />
              </div>
              <p className="pb-2.5 text-lg font-light">
                {parsed != null ? `≈ ${formatNumber(kcalFor(food, parsed, trim))}` : '—'}{' '}
                <span className="text-sm text-muted">kcal</span>
              </p>
              <Button type="submit" disabled={busy || parsed == null} className="mb-0.5">
                {busy ? 'Đang thêm…' : 'Thêm'}
              </Button>
            </form>
          )}
          {food && parsed != null && <MacroLine nutrition={nutritionFor(food, parsed, trim)} />}
          {trim && (
            <FatTrimSlider id={`fat-trim-new-${mealType}`} food={food!} leanFood={leanFood!}
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
          {food && <p className="text-xs text-muted">Nguồn số liệu: {food.source}</p>}
          {error && <p className="text-sm text-danger" role="alert">{error}</p>}
        </>
      )}
    </div>
  );
}
