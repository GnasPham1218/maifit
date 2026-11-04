import type { Nutrition } from '../types/meal';
import { formatNumber } from '../utils/number';

interface Props {
  nutrition: Nutrition;
  className?: string;
}

const PARTS: { label: string; pick: (n: Nutrition) => number | null }[] = [
  { label: 'Đạm', pick: (n) => n.proteinG },
  { label: 'Carb', pick: (n) => n.carbG },
  { label: 'Béo', pick: (n) => n.fatG },
  { label: 'Xơ', pick: (n) => n.fiberG },
];

// One compact line under a food: "Đạm 12 g · Carb 30 g · Béo 5 g · Xơ 2 g".
// "—" when the source has no data for that value (never shown as 0, which would be a claim).
// A <span> (display: block), not a <p>: it also sits inside row <button>s, where a <p> is invalid HTML.
export function MacroLine({ nutrition, className = 'block text-xs text-muted' }: Props) {
  return (
    <span className={className}>
      {PARTS.map(({ label, pick }, i) => {
        const v = pick(nutrition);
        return (
          <span key={label} className="whitespace-nowrap">
            {i > 0 && ' · '}
            {label} {v == null ? '—' : `${formatNumber(v)} g`}
          </span>
        );
      })}
    </span>
  );
}
