import { useEffect, useMemo, useState } from 'react';
import { foodApi } from '../apis/foodApi';
import { PREPARATIONS, WEIGHED_WHEN_LABELS } from '../constants/meal';
import type { Food } from '../types/meal';
import { normalize } from '../utils/text';
import { FormField } from './FormField';
import { ReportMissingFood } from './ReportMissingFood';

interface Props {
  foods: Food[];
  idPrefix: string; // keeps input ids unique when several choosers are on the page
  autoFocus?: boolean;
  initialQuery?: string; // e.g. what the AI saw ("bún mọc"), so close foods show without typing
  onChange: (food: Food | null) => void; // null = no complete choice yet
}

const MAX_RESULTS = 12;
const SUGGEST_DELAY_MS = 300; // wait until the user stops typing before asking the server

const CHIP = 'cursor-pointer rounded-full border px-3 py-1.5 text-sm transition-colors';
const chipClass = (selected: boolean) =>
  `${CHIP} ${selected ? 'border-ink bg-ink text-white' : 'border-line bg-surface hover:bg-bg'}`;

// Search a food by name (accent-insensitive), then "weighed raw or cooked?" when it has several states
export function FoodChooser({ foods, idPrefix, autoFocus, initialQuery = '', onChange }: Props) {
  const [query, setQuery] = useState(initialQuery);
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

  // Nothing found locally -> ask the server for close names ("bún mọc" -> "Bún tươi").
  // The answer is kept with the query it belongs to, so a late answer for an old query is never shown.
  const q = normalize(query);
  const needServer = results.length === 0 && q.length >= 2;
  const [remote, setRemote] = useState<{ query: string; names: string[] } | null>(null);
  useEffect(() => {
    if (!needServer) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      foodApi.suggest(query.trim())
        .then((list) => { if (!cancelled) setRemote({ query: q, names: list.map((s) => s.name) }); })
        .catch(() => { if (!cancelled) setRemote({ query: q, names: [] }); }); // suggestions are optional
    }, SUGGEST_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [needServer, q, query]);
  // null = still asking; only names we have rows for (the food list is loaded once per page)
  const suggestions = needServer && remote?.query === q ? remote.names.filter((n) => byName.has(n)) : null;

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

      {results.length === 0 && (
        !needServer ? (
          <p className="text-sm text-muted">Gõ ít nhất 2 chữ để tìm.</p>
        ) : suggestions == null ? (
          <p className="text-sm text-muted" role="status">Đang tìm món gần giống…</p>
        ) : (
          <div className="grid gap-3">
            {suggestions.length === 0 ? (
              <p className="text-sm text-muted">Chưa có món này trong danh sách.</p>
            ) : (
              <div className="grid gap-2">
                <p className="text-sm text-ink-soft">
                  Chưa có đúng “{query.trim()}”. Món gần giống (chọn món gần nhất, calo sẽ là số xấp xỉ):
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((n) => (
                    <button key={n} type="button" className={chipClass(n === name)} aria-pressed={n === name}
                      onClick={() => pickName(n)}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* key: a new search gets a fresh button instead of the previous result */}
            <ReportMissingFood key={q} name={query} />
          </div>
        )
      )}

      {results.length > 0 && (
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
