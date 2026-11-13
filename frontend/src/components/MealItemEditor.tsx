import { Check, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { getErrorMessage } from '../constants/errorMessages';
import { MEAL_TYPE_LABELS, PREPARATION_LABELS } from '../constants/meal';
import type { Food, MealItem, MealType } from '../types/meal';
import { edibleHint, leanHint } from '../utils/edible';
import { formatNumber } from '../utils/number';
import { kcalFor, nutritionFor, parseGrams } from '../utils/nutrition';
import { Button } from './Button';
import { FatTrimSlider } from './FatTrimSlider';
import { FormField } from './FormField';
import { MacroLine } from './MacroLine';

interface Props {
  item: MealItem;
  mealType: MealType;
  food: Food | undefined; // for the live calorie preview
  leanFood: Food | undefined; // food.leanVersionId resolved, when it has one
  onSave: (grams: number, fatPercent: number | null) => Promise<void>;
  onRemove: () => Promise<void>;
}

// Change the grams of a logged food (calories update while typing), or remove it.
// Shown inside a Modal (MealsPage), which gives the title (the food name) and the close button.
export function MealItemEditor({ item, mealType, food, leanFood, onSave, onRemove }: Props) {
  const [grams, setGrams] = useState(String(item.grams));
  // 100 = as listed (the food's own numbers), matching a food without a trim pair at all
  const [fatPercent, setFatPercent] = useState(item.fatPercent ?? 100);
  const [confirmRemove, setConfirmRemove] = useState(false); // remove needs a second tap, no browser confirm()
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const parsed = parseGrams(grams);
  const trim = food?.leanVersionId && leanFood ? { leanFood, fatPercent } : undefined;
  const preview = food && parsed != null ? kcalFor(food, parsed, trim) : null;
  const where = [item.preparation !== 'RAW' ? PREPARATION_LABELS[item.preparation] : null, MEAL_TYPE_LABELS[mealType].toLowerCase()]
    .filter(Boolean).join(' · ');

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
    <form className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (parsed != null) void submit(() => onSave(parsed, trim ? fatPercent : null));
      }}>
      <p className="-mt-1 text-sm text-muted first-letter:uppercase">{where}</p>
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
  );
}
