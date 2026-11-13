import { Link } from 'react-router';
import { MEAL_TYPE_LABELS } from '../../constants/meal';
import type { Meal } from '../../types/meal';
import { formatNumber } from '../../utils/number';
import { ButtonLink } from '../ButtonLink';

// Today's meals in one line each; the full log is on /meals
export function MealsTodayCard({ meals }: { meals: Meal[] }) {
  return (
    <section aria-labelledby="meals-today" className="min-w-0 rounded-card bg-surface p-6">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="meals-today" className="text-lg font-semibold">Bữa ăn hôm nay</h2>
        <Link to="/meals" className="text-sm font-semibold">Mở nhật ký</Link>
      </div>
      {meals.length === 0 ? (
        <div className="mt-4 grid justify-items-start gap-4">
          <p className="text-muted">Chưa ghi món nào hôm nay. Chụp ảnh bữa ăn hoặc chọn món từ danh sách.</p>
          <ButtonLink to="/meals" variant="secondary">Ghi bữa ăn</ButtonLink>
        </div>
      ) : (
        <ul className="mt-2">
          {meals.map((meal) => (
            <li key={meal.id} className="flex items-center gap-4 border-t border-line py-3.5 first:border-t-0">
              <span className="w-24 shrink-0 font-semibold">{MEAL_TYPE_LABELS[meal.mealType]}</span>
              <span className="min-w-0 flex-1 truncate text-sm text-muted">
                {meal.items.map((i) => i.foodName).join(', ')}
              </span>
              <span className="shrink-0 font-display text-2xl font-semibold tabular-nums">
                {formatNumber(Math.round(meal.totals.kcal))}
                <span className="ml-1 font-sans text-sm font-normal text-muted">kcal</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
