// Mirrors backend food/dto FoodDetailsResponse and FoodVariantResponse
import type { Preparation } from './meal';

// path is relative to the site root: shown as "/" + path
export interface FoodImage {
  path: string;
  alt: string;
  credit: string;
  license: string;
  sourceUrl: string | null;
}

export interface FoodCategory {
  id: number;
  code: string;
  name: string;
}

export interface FoodSource {
  id: number;
  code: string;
  name: string;
  publisher: string;
  url: string;
  license: string;
}

// GET /foods/meta: the library filters
export interface FoodMeta {
  categories: FoodCategory[];
  sources: FoodSource[];
}

// One preparation of a food. Values per 100 g; null = not measured by the source (never shown as 0)
export interface FoodVariant {
  id: number;
  preparation: Preparation;
  kcal: number;
  proteinG: number | null;
  carbG: number | null;
  fatG: number | null;
  fiberG: number | null;
  source: FoodSource;
  sourceRef: string | null; // the item id at the source, e.g. the FDC id
  sourceDescription: string | null; // the source's own name for the item
  sourceUrl: string | null; // null when no single item backs the row
  approximate: boolean; // closest item used (XẤP XỈ)
  estimated: boolean; // computed from other measured rows (ƯỚC TÍNH)
  estimateNote: string | null;
  leanVersionId: number | null;
  images: FoodImage[]; // main photo first
}

export interface FoodDetails {
  name: string;
  category: FoodCategory;
  aliases: string[];
  selectedId: number;
  variants: FoodVariant[]; // RAW, BOILED, STEAMED, GRILLED, FRIED, BRAISED order
}
