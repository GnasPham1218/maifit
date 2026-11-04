import { Camera, ChevronDown, Plus } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { MEAL_TYPE_LABELS, PREPARATION_LABELS } from '../constants/meal';
import type { Food, Meal, MealItem, MealType } from '../types/meal';
import { formatNumber } from '../utils/number';
import { MacroLine } from './MacroLine';
import { MealItemEditor } from './MealItemEditor';

interface Props {
  mealType: MealType;
  meals: Meal[]; // this meal type's meals of the day (usually one)
  foodsById: Map<number, Food>;
  editingItemId: number | null;
  onEdit: (itemId: number | null) => void;
  onSaveGrams: (meal: Meal, item: MealItem, grams: number, fatPercent: number | null) => Promise<void>;
  onRemoveItem: (meal: Meal, item: MealItem) => Promise<void>;
  onAddClick: () => void;
  onPhotoClick: () => void;
  picker: ReactNode; // the FoodPicker or the photo review when open for this meal type
}

// Long lists are cut to the first rows; "Xem thêm" shows the rest
const VISIBLE_ROWS = 6;

// One meal of the day (MyFitnessPal style). Collapsed by default: the header shows the meal's calories
// and item count; tap it to unfold the food rows, then tap a row to edit its grams.
export function MealGroupCard(props: Props) {
  const { mealType, meals, foodsById, editingItemId, onEdit, onSaveGrams, onRemoveItem, onAddClick, onPhotoClick, picker } = props;
  const rows = meals.flatMap((meal) => meal.items.map((item) => ({ meal, item })));
  const [open, setOpen] = useState(false); // food rows unfolded
  const [expanded, setExpanded] = useState(false); // all rows instead of the first VISIBLE_ROWS
  const visibleRows = expanded ? rows : rows.slice(0, VISIBLE_ROWS);
  const hiddenCount = rows.length - visibleRows.length;
  const kcal = Math.round(meals.reduce((sum, m) => sum + m.totals.kcal, 0) * 10) / 10;

  return (
    <section className="rounded-card bg-surface p-6">
      <header className="flex items-center gap-3">
        {rows.length > 0 ? (
          <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls={`meal-rows-${mealType}`}
            className="-m-2 flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-2xl p-2 text-left hover:bg-bg">
            <ChevronDown aria-hidden="true" className={`size-5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-semibold">{MEAL_TYPE_LABELS[mealType]}</span>
              <span className="text-sm text-muted">{rows.length} món</span>
            </span>
            <span className="shrink-0 text-lg font-light">
              {formatNumber(kcal)} <span className="text-sm text-muted">kcal</span>
            </span>
          </button>
        ) : (
          <h2 className="flex-1 text-lg font-semibold">{MEAL_TYPE_LABELS[mealType]}</h2>
        )}
        <button type="button"
          onClick={() => {
            setOpen(true);
            onPhotoClick();
          }}
          className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-bg text-ink hover:bg-line"
          aria-label={`Nhận diện ảnh cho ${MEAL_TYPE_LABELS[mealType].toLowerCase()}`} title="Thêm bằng ảnh">
          <Camera aria-hidden="true" className="size-4" />
        </button>
        <button type="button"
          onClick={() => {
            setOpen(true); // show the list so the new food appears where the user expects it
            onAddClick();
          }}
          className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-ink text-white hover:bg-ink-soft"
          aria-label={`Thêm món vào ${MEAL_TYPE_LABELS[mealType].toLowerCase()}`} title="Thêm món">
          <Plus aria-hidden="true" className="size-4" />
        </button>
      </header>

      {rows.length === 0 && !picker && <p className="mt-3 text-sm text-muted">Chưa ghi món nào.</p>}

      {open && rows.length > 0 && (
        <ul id={`meal-rows-${mealType}`} className="mt-3 divide-y divide-line">
          {visibleRows.map(({ meal, item }) => (
            <li key={item.id} className="py-1">
              {editingItemId === item.id ? (
                <MealItemEditor
                  item={item}
                  food={foodsById.get(item.foodId)}
                  leanFood={(() => {
                    const leanId = foodsById.get(item.foodId)?.leanVersionId;
                    return leanId != null ? foodsById.get(leanId) : undefined;
                  })()}
                  onSave={(grams, fatPercent) => onSaveGrams(meal, item, grams, fatPercent)}
                  onRemove={() => onRemoveItem(meal, item)}
                  onCancel={() => onEdit(null)}
                />
              ) : (
                <button type="button" onClick={() => onEdit(item.id)}
                  className="-mx-2 flex w-[calc(100%+1rem)] min-w-0 cursor-pointer items-center gap-3 rounded-2xl px-2 py-2.5 text-left hover:bg-bg"
                  aria-label={`Sửa ${item.foodName}, ${formatNumber(item.grams)} gam`}>
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate font-medium">{item.foodName}</span>
                      {item.preparation !== 'RAW' && (
                        <span className="shrink-0 rounded-full bg-lime px-2 py-0.5 text-xs">
                          {PREPARATION_LABELS[item.preparation]}
                        </span>
                      )}
                    </span>
                    <span className="block text-sm text-muted">{formatNumber(item.grams)} g</span>
                    <MacroLine nutrition={item.nutrition} />
                  </span>
                  <span className="shrink-0 text-lg font-light">
                    {formatNumber(item.nutrition.kcal)} <span className="text-sm text-muted">kcal</span>
                  </span>
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {open && rows.length > VISIBLE_ROWS && (
        <button type="button" onClick={() => setExpanded(!expanded)}
          className="mt-2 cursor-pointer rounded-full px-3 py-1 text-sm font-medium text-sky-strong hover:bg-bg">
          {expanded ? 'Thu gọn' : `Xem thêm ${hiddenCount} món`}
        </button>
      )}

      {picker && <div className="mt-4">{picker}</div>}
    </section>
  );
}
