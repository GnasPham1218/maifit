import { X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { getErrorMessage } from '../constants/errorMessages';
import { MEAL_TYPE_LABELS, PREPARATIONS, WEIGHED_WHEN_LABELS } from '../constants/meal';
import type { Food, MealType } from '../types/meal';
import { formatNumber } from '../utils/number';
import { kcalFor, parseGrams } from '../utils/nutrition';
import { normalize } from '../utils/text';
import { Button } from './Button';
import { FormField } from './FormField';

interface Props {
  mealType: MealType;
  foods: Food[] | null; // null while loading
  onAdd: (foodId: number, grams: number) => Promise<void>;
  onClose: () => void;
}

const MAX_RESULTS = 12;

const CHIP = 'cursor-pointer rounded-full border px-3 py-1.5 text-sm transition-colors';
const chipClass = (selected: boolean) =>
  `${CHIP} ${selected ? 'border-ink bg-ink text-white' : 'border-line bg-surface hover:bg-bg'}`;

// Add one food to a meal: search by name -> "weighed raw or cooked?" -> grams (calories shown live)
export function FoodPicker({ mealType, foods, onAdd, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [name, setName] = useState<string | null>(null);
  const [foodId, setFoodId] = useState<number | null>(null);
  const [grams, setGrams] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // One entry per food name; its rows are the preparation states, RAW first
  const byName = useMemo(() => {
    const map = new Map<string, Food[]>();
    for (const f of foods ?? []) map.set(f.name, [...(map.get(f.name) ?? []), f]);
    for (const list of map.values()) {
      list.sort((a, b) => PREPARATIONS.indexOf(a.preparation) - PREPARATIONS.indexOf(b.preparation));
    }
    return map;
  }, [foods]);

  const results = useMemo(() => {
    const q = normalize(query);
    return [...byName.keys()].filter((n) => normalize(n).includes(q)).slice(0, MAX_RESULTS);
  }, [byName, query]);

  const variants = name ? (byName.get(name) ?? []) : [];
  const food = variants.find((f) => f.id === foodId);
  const parsed = parseGrams(grams);

  function pickName(n: string) {
    const list = byName.get(n) ?? [];
    setName(n);
    setFoodId(list.length === 1 ? list[0].id : null); // only one state: nothing to ask
    setError(null);
  }

  async function handleSubmit() {
    if (!food || parsed == null) return;
    setError(null);
    setBusy(true);
    try {
      await onAdd(food.id, parsed); // the parent closes the picker on success
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
          <FormField label="Tìm món" name={`food-search-${mealType}`} type="search" autoFocus
            placeholder="vd. gà, cơm, chuối" value={query} onChange={(e) => setQuery(e.target.value)} />

          {results.length === 0 ? (
            <p className="text-sm text-muted">Chưa có món này trong danh sách.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {results.map((n) => (
                <button key={n} type="button" className={chipClass(n === name)} aria-pressed={n === name}
                  onClick={() => pickName(n)}>
                  {n}
                </button>
              ))}
            </div>
          )}

          {/* The same food has very different calories raw vs cooked (rice: 365 vs 130 kcal/100 g) */}
          {variants.length > 1 && (
            <fieldset className="grid gap-2">
              <legend className="mb-2 text-sm font-medium">Bạn cân {name} lúc nào?</legend>
              <div className="flex flex-wrap gap-2">
                {variants.map((v) => (
                  <button key={v.id} type="button" className={chipClass(v.id === foodId)}
                    aria-pressed={v.id === foodId} onClick={() => setFoodId(v.id)}>
                    {WEIGHED_WHEN_LABELS[v.preparation]}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {food && (
            <form className="flex flex-wrap items-end gap-3"
              onSubmit={(e) => { e.preventDefault(); void handleSubmit(); }}>
              <div className="w-36">
                <FormField label="Số gram" name={`grams-new-${mealType}`} inputMode="decimal" placeholder="vd. 150"
                  value={grams} onChange={(e) => setGrams(e.target.value)}
                  error={grams !== '' && parsed == null ? 'Từ 0,1 đến 5000 g' : undefined} />
              </div>
              <p className="pb-2.5 text-lg font-light">
                {parsed != null ? `≈ ${formatNumber(kcalFor(food, parsed))}` : '—'}{' '}
                <span className="text-sm text-muted">kcal</span>
              </p>
              <Button type="submit" disabled={busy || parsed == null} className="mb-0.5">
                {busy ? 'Đang thêm…' : 'Thêm'}
              </Button>
            </form>
          )}
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
