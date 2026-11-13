import { MACROS, type MacroKey } from '../constants/macros';
import type { Nutrition } from '../types/meal';
import { formatNumber } from '../utils/number';

interface Props {
  nutrition: Nutrition;
  className?: string;
}

const PARTS: { key: MacroKey; label: string; pick: (n: Nutrition) => number | null }[] = [
  { key: 'protein', label: 'Đạm', pick: (n) => n.proteinG },
  { key: 'carb', label: 'Carb', pick: (n) => n.carbG },
  { key: 'fat', label: 'Béo', pick: (n) => n.fatG },
  { key: 'fiber', label: 'Xơ', pick: (n) => n.fiberG },
];

// One compact line under a food: a color swatch per macro, then "Đạm 12 g".
// "—" when the source has no data for that value (never shown as 0, which would be a claim).
// Spans only: it also sits inside row <button>s, where a <p> or <div> is invalid HTML.
export function MacroLine({ nutrition, className = 'text-xs text-muted' }: Props) {
  return (
    <span className={`flex flex-wrap gap-x-3 gap-y-1 ${className}`}>
      {PARTS.map(({ key, label, pick }) => {
        const v = pick(nutrition);
        return (
          <span key={key} className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span aria-hidden="true" className={`size-2 rounded-sm ${MACROS[key].swatch}`} />
            {label} {v == null ? '—' : `${formatNumber(v)} g`}
          </span>
        );
      })}
    </span>
  );
}
