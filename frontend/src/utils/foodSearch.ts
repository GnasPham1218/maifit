import type { Food } from '../types/meal';
import { normalize } from './text';

// Search over food names AND aliases (everyday names from the backend: "cơm" finds "Gạo tẻ").
// Runs on the device: the whole food table is loaded once per page (a few hundred rows).

export interface FoodSearchHit {
  name: string; // the food name (one entry per name, all its preparations)
  alias: string | null; // the everyday name that matched, null when the name itself matched
  lockedFood: Food | null; // the alias names one preparation ("Cơm" -> boiled): pick that row directly
}

// Lower is better. null = no match.
// 0 exact, 1 starts with the query, 2 a word starts with it ("ga" -> "Ức gà"), 3 anywhere inside ("ga" -> "Gạo")
function rank(text: string, q: string): number | null {
  if (text === q) return 0;
  if (text.startsWith(q)) return 1;
  if (text.split(/\s+/).some((word) => word.startsWith(q))) return 2;
  if (text.includes(q)) return 3;
  return null;
}

interface Scored extends FoodSearchHit {
  score: number;
  length: number;
}

// One hit per food name, best first: rank, then a name before an alias, then the shorter text, then A-Z.
// rowsByName: every food row grouped by name. An empty query returns every name A-Z.
export function searchFoods(rowsByName: Map<string, Food[]>, query: string): FoodSearchHit[] {
  const q = normalize(query);
  if (q === '') {
    return [...rowsByName.keys()].sort((a, b) => a.localeCompare(b, 'vi')).map((name) => ({ name, alias: null, lockedFood: null }));
  }
  const best = new Map<string, Scored>();

  const offer = (hit: Scored) => {
    const current = best.get(hit.name);
    if (!current || compare(hit, current) < 0) best.set(hit.name, hit);
  };

  for (const [name, rows] of rowsByName) {
    const nameScore = rank(normalize(name), q);
    if (nameScore != null) offer({ name, alias: null, lockedFood: null, score: nameScore, length: name.length });
    for (const row of rows) {
      for (const { alias, locksPreparation } of row.aliases) {
        const score = rank(normalize(alias), q);
        if (score == null) continue;
        offer({ name, alias, lockedFood: locksPreparation ? row : null, score, length: alias.length });
      }
    }
  }

  return [...best.values()].sort(compare).map(({ name, alias, lockedFood }) => ({ name, alias, lockedFood }));
}

function compare(a: Scored, b: Scored): number {
  return a.score - b.score
    || Number(a.alias != null) - Number(b.alias != null)
    || a.length - b.length
    || a.name.localeCompare(b.name, 'vi');
}
