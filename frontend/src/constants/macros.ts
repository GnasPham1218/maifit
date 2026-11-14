// The four nutrients shown with colors everywhere (home ring, meals, chat card, food detail).
// Colors are tokens in global.css (validated together); text never uses them, only swatches and marks.
export type MacroKey = 'protein' | 'carb' | 'fat' | 'fiber';

export interface MacroInfo {
  key: MacroKey;
  label: string;
  kcalPerGram: number | null; // to split a calorie total by macro when drawing; fiber: not counted
  color: string; // CSS value for SVG strokes and inline swatches
  swatch: string; // Tailwind class for a filled swatch or bar
}

export const MACROS: Record<MacroKey, MacroInfo> = {
  protein: { key: 'protein', label: 'Đạm', kcalPerGram: 4, color: 'var(--color-protein)', swatch: 'bg-protein' },
  carb: { key: 'carb', label: 'Carb', kcalPerGram: 4, color: 'var(--color-carb)', swatch: 'bg-carb' },
  fat: { key: 'fat', label: 'Béo', kcalPerGram: 9, color: 'var(--color-fat)', swatch: 'bg-fat' },
  fiber: { key: 'fiber', label: 'Chất xơ', kcalPerGram: null, color: 'var(--color-fiber)', swatch: 'bg-fiber' },
};
