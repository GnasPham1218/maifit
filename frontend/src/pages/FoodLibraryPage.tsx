import { ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { foodApi } from '../apis/foodApi';
import { Alert } from '../components/Alert';
import { Chip } from '../components/Chip';
import { FormField } from '../components/FormField';
import { ReportMissingFood } from '../components/ReportMissingFood';
import { FoodThumb } from '../components/food/FoodThumb';
import { MACROS } from '../constants/macros';
import { getErrorMessage } from '../constants/errorMessages';
import { PREPARATION_LABELS } from '../constants/meal';
import type { FoodMeta } from '../types/food';
import type { Food } from '../types/meal';
import { energySplit } from '../utils/energySplit';
import { filterLibrary, groupByName, type LibraryEntry, type LibrarySort } from '../utils/foodLibrary';
import { formatNumber } from '../utils/number';

const SORT_LABELS: Record<LibrarySort, string> = {
  name: 'Tên A–Z', protein: 'Nhiều đạm nhất', kcalAsc: 'Ít calo nhất', kcalDesc: 'Nhiều calo nhất',
};
const SELECT = 'h-11 rounded-2xl border border-line bg-surface px-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-accent';
const grams = (v: number | null) => (v == null ? 'chưa có' : `${formatNumber(v)} g`);

function SplitBar({ food }: { food: Food }) {
  const split = energySplit(food.proteinG, food.carbG, food.fatG);
  if (!split) return null;
  return (
    <span role="img" aria-label={`Năng lượng: đạm ${split.protein}%, carb ${split.carb}%, béo ${split.fat}%`}
      className="flex h-1.5 w-32 gap-0.5 overflow-hidden rounded-full md:h-2 md:w-full">
      {(['protein', 'carb', 'fat'] as const).map((k) => split[k] > 0 && (
        <span key={k} className={MACROS[k].swatch} style={{ flexGrow: split[k] }} />
      ))}
    </span>
  );
}

// Phones: photo, name + preparations + energy bar, kcal. From md: a table-like grid with every macro.
const ROW_GRID = 'grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 md:grid-cols-[auto_minmax(0,2fr)_6rem_5rem_5rem_5rem_minmax(0,1.3fr)_1rem]';

function LibraryRow({ entry }: { entry: LibraryEntry }) {
  const { first } = entry;
  return (
    <li className="border-t border-line first:border-t-0">
      <Link to={`/foods/${first.id}`} className={`${ROW_GRID} -mx-2 rounded-xl px-2 py-3 text-ink hover:bg-soft hover:text-ink`}>
        <FoodThumb image={first.image} />
        <span className="grid min-w-0 gap-1.5">
          <span className="truncate font-semibold">{entry.name}</span>
          <span className="flex flex-wrap gap-1">
            {entry.rows.map((r) => (
              <span key={r.id} className="rounded-full bg-soft px-2 py-0.5 text-xs text-link">{PREPARATION_LABELS[r.preparation]}</span>
            ))}
          </span>
          <span className="md:hidden"><SplitBar food={first} /></span>
        </span>
        <span className="text-right">
          <span className="font-display text-2xl font-semibold tabular-nums">{formatNumber(first.kcal)}</span>
          <span className="block text-xs text-muted">
            <span className="md:hidden">kcal/100 g</span>
            <span className="hidden md:inline">{PREPARATION_LABELS[first.preparation].toLowerCase()}</span>
          </span>
        </span>
        <span className="hidden text-right text-sm tabular-nums md:block">{grams(first.proteinG)}</span>
        <span className="hidden text-right text-sm tabular-nums md:block">{grams(first.carbG)}</span>
        <span className="hidden text-right text-sm tabular-nums md:block">{grams(first.fatG)}</span>
        <span className="hidden md:block"><SplitBar food={first} /></span>
        <ChevronRight aria-hidden="true" className="hidden size-4 text-muted md:block" />
      </Link>
    </li>
  );
}

// /foods: every food in the table, searchable and filterable on the device (the table is loaded once).
export default function FoodLibraryPage() {
  const [foods, setFoods] = useState<Food[] | null>(null);
  const [meta, setMeta] = useState<FoodMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [sourceId, setSourceId] = useState<number | null>(null);
  const [sort, setSort] = useState<LibrarySort>('name');

  useEffect(() => {
    let ignore = false;
    Promise.all([foodApi.listAll(), foodApi.meta()])
      .then(([list, m]) => {
        if (ignore) return;
        setFoods(list);
        setMeta(m);
      })
      .catch((err: unknown) => {
        if (!ignore) setError(getErrorMessage(err));
      });
    return () => {
      ignore = true;
    };
  }, []);

  const entries = useMemo(() => groupByName(foods ?? []), [foods]);
  const shown = useMemo(
    () => filterLibrary(entries, { query, categoryId, sourceId, sort }),
    [entries, query, categoryId, sourceId, sort],
  );

  if (error) return <Alert type="error">{error}</Alert>;
  if (!foods || !meta) return <p className="text-muted">Đang tải…</p>;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-60 flex-1">
          <FormField label="Tìm thực phẩm" name="library-search" type="search" value={query}
            placeholder={`Tìm trong ${entries.length} món, ví dụ: gà, cơm, chuối`} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <label className="grid gap-1.5 text-sm text-muted">
          Nguồn
          <select className={SELECT} value={sourceId ?? ''} onChange={(e) => setSourceId(e.target.value ? Number(e.target.value) : null)}>
            <option value="">Tất cả nguồn</option>
            {meta.sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm text-muted">
          Sắp xếp
          <select className={SELECT} value={sort} onChange={(e) => setSort(e.target.value as LibrarySort)}>
            {(Object.keys(SORT_LABELS) as LibrarySort[]).map((k) => <option key={k} value={k}>{SORT_LABELS[k]}</option>)}
          </select>
        </label>
      </div>

      <div role="group" aria-label="Nhóm thực phẩm" className="flex flex-wrap gap-2">
        <Chip selected={categoryId == null} onClick={() => setCategoryId(null)}>Tất cả</Chip>
        {meta.categories.map((c) => (
          <Chip key={c.id} selected={categoryId === c.id} onClick={() => setCategoryId(c.id)}>{c.name}</Chip>
        ))}
      </div>

      <section aria-label="Danh sách thực phẩm" className="rounded-card bg-surface p-5">
        <p className="mb-2 text-sm text-muted" role="status">
          {shown.length} món · số liệu trên 100 g phần ăn được, cách chế biến đầu tiên của mỗi món
        </p>
        {shown.length === 0 ? (
          <div className="grid gap-3 py-2">
            <p>Không có món nào khớp. Thử bỏ bớt bộ lọc, hoặc báo món còn thiếu.</p>
            {query.trim().length >= 2 && <ReportMissingFood key={query} name={query} />}
          </div>
        ) : (
          <>
            <div aria-hidden="true" className={`${ROW_GRID} hidden px-0 pb-2 text-right text-xs text-muted md:grid`}>
              <span className="w-12" /><span className="text-left">Món</span><span>kcal / 100 g</span>
              <span>Đạm</span><span>Carb</span><span>Béo</span><span className="text-left">Năng lượng từ</span><span />
            </div>
            <ul>{shown.map((e) => <LibraryRow key={e.name} entry={e} />)}</ul>
          </>
        )}
      </section>
    </div>
  );
}
