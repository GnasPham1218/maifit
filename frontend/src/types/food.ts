// Mirrors backend food/dto FoodDetailsResponse and FoodVariantResponse
import type { Preparation } from './meal';

// One preparation of a food. Values per 100 g; null = not measured by the source (never shown as 0)
export interface FoodVariant {
  id: number;
  preparation: Preparation;
  kcal: number;
  proteinG: number | null;
  carbG: number | null;
  fatG: number | null;
  fiberG: number | null;
  source: string; // e.g. "USDA FDC 168878 (SR Legacy)"
  sourceDescription: string | null; // the source's own name for the item
  sourceUrl: string | null; // null when no single item backs the row
  approximate: boolean; // closest item used (XẤP XỈ)
  estimated: boolean; // computed from other measured rows (ƯỚC TÍNH)
  leanVersionId: number | null;
}

export interface FoodDetails {
  name: string;
  aliases: string[];
  selectedId: number;
  variants: FoodVariant[]; // RAW, BOILED, STEAMED, GRILLED, FRIED, BRAISED order
}
