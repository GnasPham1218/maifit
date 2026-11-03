import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { getErrorMessage } from '../constants/errorMessages';
import type { Food, MealItem } from '../types/meal';
import { formatNumber } from '../utils/number';
import { kcalFor, parseGrams } from '../utils/nutrition';
import { Button } from './Button';
import { FormField } from './FormField';

interface Props {
  item: MealItem;
  food: Food | undefined; // for the live calorie preview
  onSave: (grams: number) => Promise<void>;
  onRemove: () => Promise<void>;
  onCancel: () => void;
}

// Inline editor opened by tapping a food row: change grams, see calories update while typing
export function MealItemEditor({ item, food, onSave, onRemove, onCancel }: Props) {
  const [grams, setGrams] = useState(String(item.grams));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const parsed = parseGrams(grams);
  const preview = food && parsed != null ? kcalFor(food, parsed) : null;

  async function submit(action: () => Promise<void>) {
    setError(null);
    setBusy(true);
    try {
      await action();
    } catch (err) {
      setError(getErrorMessage(err));
      setBusy(false); // on success the editor closes, so only reset on error
    }
  }

  return (
    <form
      className="grid gap-3 rounded-2xl bg-bg p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (parsed != null) void submit(() => onSave(parsed));
      }}
    >
      <p className="font-medium">{item.foodName}</p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-36">
          <FormField label="Số gram" name={`grams-${item.id}`} inputMode="decimal" autoFocus
            value={grams} onChange={(e) => setGrams(e.target.value)}
            error={parsed == null ? 'Từ 0,1 đến 5000 g' : undefined} />
        </div>
        <p className="pb-2.5 text-lg font-light">
          {preview != null ? `≈ ${formatNumber(preview)}` : '—'} <span className="text-sm text-muted">kcal</span>
        </p>
      </div>
      {item.aiGrams != null && (
        <p className="text-sm text-muted">AI ước lượng ban đầu: {formatNumber(item.aiGrams)} g</p>
      )}
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={busy || parsed == null}>Lưu</Button>
        <Button variant="secondary" size="sm" disabled={busy} onClick={onCancel}>Hủy</Button>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (window.confirm(`Xóa ${item.foodName} khỏi bữa này?`)) void submit(onRemove);
          }}
          className="ml-auto flex size-9 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-surface hover:text-danger disabled:cursor-not-allowed"
          aria-label={`Xóa ${item.foodName}`}
          title="Xóa"
        >
          <Trash2 aria-hidden="true" className="size-4" />
        </button>
      </div>
    </form>
  );
}
