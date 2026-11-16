import { PREPARATIONS } from '../constants/meal';
import type { Food } from '../types/meal';
import { searchFoods } from './foodSearch';

// One library row = one food name; its numbers are those of its first preparation (raw first)
export interface LibraryEntry {
  name: string;
  rows: Food[]; // every preparation, in the usual order
  first: Food;
  matchedAlias?: string | null; // set by filterLibrary when the search matched an everyday name, not the name
}

export type LibrarySort = 'name' | 'protein' | 'kcalAsc' | 'kcalDesc';

export interface LibraryFilter {
  query: string;
  categoryId: number | null; // null = every group
  sourceId: number | null; // null = every source
  sort: LibrarySort;
}

export function groupByName(foods: Food[]): LibraryEntry[] {
  const byName = new Map<string, Food[]>();
  for (const f of foods) byName.set(f.name, [...(byName.get(f.name) ?? []), f]);
  return [...byName.entries()].map(([name, rows]) => {
    const sorted = [...rows].sort((a, b) => PREPARATIONS.indexOf(a.preparation) - PREPARATIONS.indexOf(b.preparation));
    return { name, rows: sorted, first: sorted[0] };
  });
}

const BY_NAME = (a: LibraryEntry, b: LibraryEntry) => a.name.localeCompare(b.name, 'vi');
const SORTS: Record<LibrarySort, (a: LibraryEntry, b: LibraryEntry) => number> = {
  name: BY_NAME,
  protein: (a, b) => (b.first.proteinG ?? -1) - (a.first.proteinG ?? -1) || BY_NAME(a, b), // missing data last
  kcalAsc: (a, b) => a.first.kcal - b.first.kcal || BY_NAME(a, b),
  kcalDesc: (a, b) => b.first.kcal - a.first.kcal || BY_NAME(a, b),
};

// Accent-insensitive search on names and everyday names (see searchFoods); a name matches a source when any of
// its preparations comes from it. With a query, the default A-Z order becomes best match first.
export function filterLibrary(entries: LibraryEntry[], f: LibraryFilter): LibraryEntry[] {
  const kept = entries.filter((e) => (f.categoryId == null || e.first.categoryId === f.categoryId)
    && (f.sourceId == null || e.rows.some((r) => r.sourceId === f.sourceId)));
  if (f.query.trim() === '') return kept.sort(SORTS[f.sort]);

  const byName = new Map(kept.map((e) => [e.name, e]));
  const found = searchFoods(new Map(kept.map((e) => [e.name, e.rows])), f.query)
    .map((hit) => ({ ...byName.get(hit.name)!, matchedAlias: hit.alias }));
  return f.sort === 'name' ? found : found.sort(SORTS[f.sort]);
}
