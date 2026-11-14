import { Camera, ChevronRight, Plus } from 'lucide-react';
import { useState } from 'react';
import { MEAL_TYPE_LABELS, PREPARATION_LABELS } from '../constants/meal';
import type { Meal, MealItem, MealType } from '../types/meal';
import { formatNumber } from '../utils/number';
import { Button } from './Button';

interface Props {
  mealType: MealType;
  meals: Meal[]; // this meal type's meals of the day (usually one)
  disabled: boolean; // while another day is loading
  onEdit: (meal: Meal, item: MealItem) => void;
  onAddClick: () => void;
  onPhotoClick: () => void;
}

// Long lists are cut to the first rows; "Xem thêm" shows the rest
const VISIBLE_ROWS = 6;

// One meal of the day: total kcal in the header, one row per food (tap to edit), add by search or by photo.
// Adding and editing open in a dialog (MealsPage), so the list never jumps around under the user's finger.
export function MealGroupCard({ mealType, meals, disabled, onEdit, onAddClick, onPhotoClick }: Props) {
  const rows = meals.flatMap((meal) => meal.items.map((item) => ({ meal, item })));
  const [expanded, setExpanded] = useState(false);
  const visibleRows = expanded ? rows : rows.slice(0, VISIBLE_ROWS);
  const kcal = Math.round(meals.reduce((sum, m) => sum + m.totals.kcal, 0));
  const label = MEAL_TYPE_LABELS[mealType];
  const titleId = `meal-${mealType}`;

  return (
    <section aria-labelledby={titleId} className="flex min-w-0 flex-col rounded-card bg-surface p-5">
      <header className="flex items-baseline justify-between gap-3">
        <h3 id={titleId} className="text-lg font-semibold">{label}</h3>
        <span className="font-display text-2xl font-semibold tabular-nums">
          {formatNumber(kcal)} <span className="font-sans text-xs font-normal text-muted">kcal</span>
        </span>
      </header>

      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-muted">Chưa ghi món nào.</p>
      ) : (
        <ul className="mt-2">
          {visibleRows.map(({ meal, item }) => (
            <li key={item.id} className="border-t border-line">
              <button type="button" onClick={() => onEdit(meal, item)} disabled={disabled}
                className="-mx-2 flex w-[calc(100%+1rem)] min-w-0 cursor-pointer items-center gap-3 rounded-xl px-2 py-3 text-left hover:bg-soft disabled:cursor-wait"
                aria-label={`Sửa ${item.foodName}, ${formatNumber(item.grams)} gam, ${formatNumber(item.nutrition.kcal)} kcal`}>
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-medium">{item.foodName}</span>
                    {/* Always shown, "Sống" too: 100 g raw rice is about 3x the calories of 100 g cooked */}
                    <span className="shrink-0 rounded-full bg-soft px-2 py-0.5 text-xs text-link">
                      {PREPARATION_LABELS[item.preparation]}
                    </span>
                  </span>
                  <span className="block text-sm text-muted">{formatNumber(item.grams)} g</span>
                </span>
                <span className="shrink-0 font-display text-xl font-semibold tabular-nums">
                  {formatNumber(Math.round(item.nutrition.kcal))}
                </span>
                <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {rows.length > VISIBLE_ROWS && (
        <button type="button" onClick={() => setExpanded(!expanded)}
          className="mt-1 cursor-pointer self-start rounded-full px-3 py-1 text-sm font-medium text-link hover:bg-soft">
          {expanded ? 'Thu gọn' : `Xem thêm ${rows.length - VISIBLE_ROWS} món`}
        </button>
      )}

      <div className="mt-auto flex flex-wrap gap-2 pt-4">
        <Button variant="secondary" size="sm" onClick={onAddClick} disabled={disabled}
          aria-label={`Thêm món vào ${label.toLowerCase()}`}>
          <Plus aria-hidden="true" className="size-4" /> Thêm món
        </Button>
        <Button variant="secondary" size="sm" onClick={onPhotoClick} disabled={disabled}
          aria-label={`Chụp ảnh ${label.toLowerCase()}`}>
          <Camera aria-hidden="true" className="size-4" /> Chụp ảnh
        </Button>
      </div>
    </section>
  );
}
