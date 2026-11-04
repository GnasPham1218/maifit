import { useMemo, useState } from 'react';
import { PREPARATIONS, WEIGHED_WHEN_LABELS } from '../constants/meal';
import type { Food } from '../types/meal';
import { normalize } from '../utils/text';
import { FormField } from './FormField';

interface Props {
  foods: Food[];
  idPrefix: string; // keeps input ids unique when several choosers are on the page
  autoFocus?: boolean;
  onChange: (food: Food | null) => void; // null = no complete choice yet
}

const MAX_RESULTS = 12;

const CHIP = 'cursor-pointer rounded-full border px-3 py-1.5 text-sm transition-colors';
const chipClass = (selected: boolean) =>
  `${CHIP} ${selected ? 'border-ink bg-ink text-white' : 'border-line bg-surface hover:bg-bg'}`;

// Search a food by name (accent-insensitive), then "weighed raw or cooked?" when it has several states
export function FoodChooser({ foods, idPrefix, autoFocus, onChange }: Props) {
  const [query, setQuery] = useState('');
  const [name, setName] = useState<string | null>(null);
  const [foodId, setFoodId] = useState<number | null>(null);

  // One entry per food name; its rows are the preparation states, RAW first
  const byName = useMemo(() => {
    const map = new Map<string, Food[]>();
    for (const f of foods) map.set(f.name, [...(map.get(f.name) ?? []), f]);
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

  function pickName(n: string) {
    const list = byName.get(n) ?? [];
    const only = list.length === 1 ? list[0] : null; // only one state: nothing to ask
    setName(n);
    setFoodId(only?.id ?? null);
    onChange(only);
  }

  function pickVariant(food: Food) {
    setFoodId(food.id);
    onChange(food);
  }

  return (
    <div className="grid gap-4">
      <FormField label="Tìm món" name={`${idPrefix}-search`} type="search" autoFocus={autoFocus}
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
                aria-pressed={v.id === foodId} onClick={() => pickVariant(v)}>
                {WEIGHED_WHEN_LABELS[v.preparation]}
              </button>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  );
}
