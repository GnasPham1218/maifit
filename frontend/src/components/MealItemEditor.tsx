import { ArrowLeft, Check, Info, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { getErrorMessage } from '../constants/errorMessages';
import { MEAL_TYPE_LABELS, PREPARATIONS, WEIGHED_WHEN_LABELS } from '../constants/meal';
import type { Food, MealItem, MealType } from '../types/meal';
import { edibleHint, leanHint } from '../utils/edible';
import { formatNumber } from '../utils/number';
import { kcalFor, nutritionFor, parseGrams } from '../utils/nutrition';
import { Button } from './Button';
import { Chip } from './Chip';
import { FatTrimSlider } from './FatTrimSlider';
import { FormField } from './FormField';
import { MacroLine } from './MacroLine';
import { FoodDetailsView } from './food/FoodDetailsView';

interface Props {
  item: MealItem;
  mealType: MealType;
  foods: Food[] | null; // the food table: live calorie preview and the other preparations of this food
  onSave: (grams: number, fatPercent: number | null, foodId: number) => Promise<void>;
  onRemove: () => Promise<void>;
}

// Change the grams or how the food was weighed (raw / boiled…) of a logged food, or remove it.
// Calories update while typing. Shown inside a Modal (MealsPage), which gives the title and the close button.
export function MealItemEditor({ item, mealType, foods, onSave, onRemove }: Props) {
  const [grams, setGrams] = useState(String(item.grams));
  const [foodId, setFoodId] = useState(item.foodId);
  // 100 = as listed (the food's own numbers), matching a food without a trim pair at all
  const [fatPercent, setFatPercent] = useState(item.fatPercent ?? 100);
  const [confirmRemove, setConfirmRemove] = useState(false); // remove needs a second tap, no browser confirm()
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [viewing, setViewing] = useState<number | null>(null); // food details over the form (form kept)

  const foodsById = useMemo(() => new Map((foods ?? []).map((f) => [f.id, f])), [foods]);
  const food = foodsById.get(foodId);
  const leanFood = food?.leanVersionId != null ? foodsById.get(food.leanVersionId) : undefined;
  // Every preparation of this food in the table, raw first (a food with only one has nothing to choose)
  const preparations = useMemo(() => {
    const same = (foods ?? []).filter((f) => f.name === item.foodName);
    return PREPARATIONS.flatMap((p) => same.filter((f) => f.preparation === p));
  }, [foods, item.foodName]);

  const parsed = parseGrams(grams);
  const trim = food?.leanVersionId && leanFood ? { leanFood, fatPercent } : undefined;
  const preview = food && parsed != null ? kcalFor(food, parsed, trim) : null;

  function choosePreparation(id: number) {
    setFoodId(id);
    setFatPercent(100); // the trim belongs to one preparation's lean/fat pair
  }

  async function submit(action: () => Promise<void>) {
    setError(null);
    setBusy(true);
    try {
      await action(); // on success the parent closes the dialog
    } catch (err) {
      setError(getErrorMessage(err));
      setBusy(false);
    }
  }

  return (
    <>
    {viewing != null && (
      <div className="grid gap-4">
        <button type="button" onClick={() => setViewing(null)}
          className="inline-flex cursor-pointer items-center gap-1.5 justify-self-start rounded-full py-1 text-sm font-medium text-link transition-colors hover:text-ink">
          <ArrowLeft aria-hidden="true" className="size-4" /> Quay lại sửa món
        </button>
        <FoodDetailsView id={viewing} onSelect={setViewing} />
      </div>
    )}
    <form className={viewing != null ? 'hidden' : 'grid gap-4'}
      onSubmit={(e) => {
        e.preventDefault();
        if (parsed != null) void submit(() => onSave(parsed, trim ? fatPercent : null, foodId));
      }}>
      <p className="-mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
        <span className="first-letter:uppercase">{MEAL_TYPE_LABELS[mealType]}</span>
        <button type="button" onClick={() => setViewing(foodId)}
          className="inline-flex cursor-pointer items-center gap-1 font-semibold text-link transition-colors hover:text-ink">
          <Info aria-hidden="true" className="size-4" /> Xem chi tiết
        </button>
      </p>
      {/* The same food weighed raw or cooked has very different calories (rice: 365 vs 130 kcal/100 g) */}
      {preparations.length > 1 && (
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-medium">Bạn cân {item.foodName.toLowerCase()} lúc nào?</legend>
          <div className="flex flex-wrap gap-2">
            {preparations.map((f) => (
              <Chip key={f.id} size="sm" selected={f.id === foodId} onClick={() => choosePreparation(f.id)}>
                {WEIGHED_WHEN_LABELS[f.preparation]}
              </Chip>
            ))}
          </div>
        </fieldset>
      )}
      <div className="flex items-end gap-4">
        <div className="w-36">
          <FormField label="Số gram" name={`grams-${item.id}`} inputMode="decimal" autoFocus
            value={grams} onChange={(e) => setGrams(e.target.value)}
            error={parsed == null ? 'Từ 0,1 đến 5000 g' : undefined} />
        </div>
        <p className="pb-1 font-display text-4xl font-bold tabular-nums">
          {preview != null ? formatNumber(preview) : '—'} <span className="font-sans text-sm font-normal text-muted">kcal</span>
        </p>
      </div>
      {food && parsed != null && <MacroLine nutrition={nutritionFor(food, parsed, trim)} />}
      {trim && (
        <FatTrimSlider id={`fat-trim-${item.id}`} food={food!} leanFood={leanFood!}
          value={fatPercent} onChange={setFatPercent} />
      )}
      {food && edibleHint(food) && <p className="text-xs text-muted">{edibleHint(food)}</p>}
      {food && leanHint(food) && <p className="text-xs text-muted">{leanHint(food)}</p>}
      {item.aiGrams != null && (
        <p className="text-sm text-muted">AI ước lượng ban đầu: {formatNumber(item.aiGrams)} g</p>
      )}
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}

      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 pt-2">
        {confirmRemove ? (
          <Button variant="danger" disabled={busy} onClick={() => void submit(onRemove)}>
            <Trash2 aria-hidden="true" className="size-4" /> Xoá thật
          </Button>
        ) : (
          <Button variant="secondary" disabled={busy} onClick={() => setConfirmRemove(true)}
            aria-label={`Xoá ${item.foodName} khỏi bữa này`}>
            <Trash2 aria-hidden="true" className="size-4" /> Xoá
          </Button>
        )}
        <Button type="submit" disabled={busy || parsed == null}>
          <Check aria-hidden="true" className="size-4" /> {busy ? 'Đang lưu…' : 'Lưu thay đổi'}
        </Button>
      </div>
      {confirmRemove && !busy && (
        <p className="text-sm text-muted" role="status">Bấm “Xoá thật” lần nữa để xoá {item.foodName} khỏi bữa này.</p>
      )}
    </form>
    </>
  );
}
