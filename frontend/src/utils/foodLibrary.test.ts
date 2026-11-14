import { describe, expect, it } from 'vitest';
import type { Food } from '../types/meal';
import { filterLibrary, groupByName, type LibraryFilter } from './foodLibrary';

const food = (id: number, name: string, preparation: Food['preparation'], kcal: number, proteinG: number | null,
  categoryId = 1, sourceId = 1): Food => ({
  id, name, preparation, kcal, proteinG, carbG: 0, fatG: 0, fiberG: 0, categoryId, sourceId,
  sourceName: 'USDA', sourceRef: String(id), estimated: false, leanVersionId: null, image: null,
});

const FOODS = [
  food(2, 'Gạo tẻ', 'BOILED', 130, 2.69),
  food(1, 'Gạo tẻ', 'RAW', 365, 7.13),
  food(3, 'Ức gà', 'RAW', 120, 22.5, 2),
  food(4, 'Tôm', 'RAW', 75.7, 15.6, 3, 2),
  food(5, 'Đường', 'RAW', 385, null, 8),
];
const ALL: LibraryFilter = { query: '', categoryId: null, sourceId: null, sort: 'name' };

describe('groupByName', () => {
  it('makes one entry per name, raw first', () => {
    const rice = groupByName(FOODS).find((e) => e.name === 'Gạo tẻ')!;
    expect(rice.rows.map((r) => r.preparation)).toEqual(['RAW', 'BOILED']);
    expect(rice.first.kcal).toBe(365);
  });
});

describe('filterLibrary', () => {
  const entries = groupByName(FOODS);

  it('searches without accents', () => {
    expect(filterLibrary(entries, { ...ALL, query: 'uc ga' }).map((e) => e.name)).toEqual(['Ức gà']);
  });

  it('filters by group and by source', () => {
    expect(filterLibrary(entries, { ...ALL, categoryId: 2 }).map((e) => e.name)).toEqual(['Ức gà']);
    expect(filterLibrary(entries, { ...ALL, sourceId: 2 }).map((e) => e.name)).toEqual(['Tôm']);
  });

  it('sorts by protein with missing data last', () => {
    expect(filterLibrary(entries, { ...ALL, sort: 'protein' }).map((e) => e.name))
      .toEqual(['Ức gà', 'Tôm', 'Gạo tẻ', 'Đường']);
  });

  it('sorts by calories both ways', () => {
    expect(filterLibrary(entries, { ...ALL, sort: 'kcalAsc' })[0].name).toBe('Tôm');
    expect(filterLibrary(entries, { ...ALL, sort: 'kcalDesc' })[0].name).toBe('Đường');
  });
});
