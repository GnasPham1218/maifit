import type { Food } from '../types/meal';

interface Props {
  food: Food; // the "có mỡ" (as-listed) row
  leanFood: Food; // its lean-only counterpart (food.leanVersionId)
  value: number; // 0-100, % of the as-listed fat still kept
  onChange: (value: number) => void;
  id: string;
}

// 0-100 slider between a food's lean-only row and its as-listed (fatty) row. Both ends are real
// USDA numbers (V10/V11); everything in between is linear interpolation (nutrition.ts / backend
// NutritionCalculator), not a new measurement.
export function FatTrimSlider({ food, leanFood, value, onChange, id }: Props) {
  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between text-xs text-ink-soft">
        <label htmlFor={id}>Lượng mỡ còn giữ lại khi ăn</label>
        <span className="font-medium text-ink">{value}%</span>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-ink"
      />
      <div className="flex justify-between text-xs text-muted">
        <span>0% · như {leanFood.name}</span>
        <span>100% · như {food.name} (mua về, chưa lọc)</span>
      </div>
    </div>
  );
}
