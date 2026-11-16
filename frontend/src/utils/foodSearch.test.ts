import { describe, expect, it } from 'vitest';
import type { Food, FoodAlias } from '../types/meal';
import { searchFoods } from './foodSearch';

const food = (id: number, name: string, preparation: Food['preparation'], aliases: FoodAlias[] = []): Food => ({
  id, name, preparation, kcal: 100, proteinG: 0, carbG: 0, fatG: 0, fiberG: 0, categoryId: 1, sourceId: 1,
  sourceName: 'USDA', sourceRef: String(id), estimated: false, leanVersionId: null, image: null, aliases,
});
const alias = (text: string, locksPreparation = false): FoodAlias => ({ alias: text, locksPreparation });

const RICE_RAW = food(1, 'Gạo tẻ', 'RAW', [alias('Gạo', true)]);
const RICE_BOILED = food(2, 'Gạo tẻ', 'BOILED', [alias('Cơm', true), alias('Cơm trắng', true)]);
const FOODS = [
  RICE_RAW, RICE_BOILED,
  food(3, 'Ức gà', 'RAW', [alias('Gà'), alias('Thịt gà')]),
  food(4, 'Đậu phụ', 'RAW', [alias('Đậu hũ'), alias('Tàu hũ')]),
  food(5, 'Gan gà', 'RAW'),
  food(6, 'Cơm cháy', 'RAW'), // a name that starts with the same word as an alias
];

function byName(foods: Food[]) {
  const map = new Map<string, Food[]>();
  for (const f of foods) map.set(f.name, [...(map.get(f.name) ?? []), f]);
  return map;
}
const names = (query: string) => searchFoods(byName(FOODS), query).map((h) => h.name);

describe('searchFoods', () => {
  it('finds a food through its everyday name, without accents', () => {
    const [first] = searchFoods(byName(FOODS), 'com');
    expect(first.name).toBe('Gạo tẻ');
    expect(first.alias).toBe('Cơm');
  });

  it('picks the preparation an everyday name locks', () => {
    expect(searchFoods(byName(FOODS), 'cơm')[0].lockedFood).toBe(RICE_BOILED);
    expect(searchFoods(byName(FOODS), 'gạo')[0].lockedFood).toBe(RICE_RAW);
    expect(searchFoods(byName(FOODS), 'gà')[0].lockedFood).toBeNull(); // "Gà" says nothing about cooking
  });

  it('ranks an exact match first, then names starting with the query', () => {
    expect(names('cơm')).toEqual(['Gạo tẻ', 'Cơm cháy']);
  });

  it('ranks an exact everyday name before names that only start with the query', () => {
    // "ga": Ức gà through its alias "Gà" (exact), then Gan gà and Gạo tẻ (both start with "ga", A-Z)
    expect(names('ga')).toEqual(['Ức gà', 'Gan gà', 'Gạo tẻ']);
  });

  it('ranks a word start before a match inside a word', () => {
    // "te": Gạo tẻ has a word starting with it; nothing else contains it
    expect(names('te')).toEqual(['Gạo tẻ']);
    // "u": Ức gà starts with it, Đậu phụ only has it inside its words
    expect(names('u')).toEqual(['Ức gà', 'Đậu phụ']);
  });

  it('prefers the name over an alias at the same rank', () => {
    const [hit] = searchFoods(byName(FOODS), 'dau phu');
    expect(hit).toEqual({ name: 'Đậu phụ', alias: null, lockedFood: null });
    expect(names('dau hu')).toEqual(['Đậu phụ']);
  });

  it('returns one hit per name', () => {
    expect(names('gạo tẻ')).toEqual(['Gạo tẻ']);
  });

  it('returns every name A-Z for an empty query', () => {
    expect(names('  ')).toEqual(['Cơm cháy', 'Đậu phụ', 'Gan gà', 'Gạo tẻ', 'Ức gà']);
  });
});
