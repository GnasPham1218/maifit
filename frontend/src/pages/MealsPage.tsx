import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { foodApi } from '../apis/foodApi';
import { mealApi } from '../apis/mealApi';
import { profileApi } from '../apis/profileApi';
import { Alert } from '../components/Alert';
import { Card } from '../components/Card';
import { DailyNutritionSummary } from '../components/DailyNutritionSummary';
import { FoodPicker } from '../components/FoodPicker';
import { MealGroupCard } from '../components/MealGroupCard';
import { MonthCalendar } from '../components/MonthCalendar';
import { MonthlyKcalChart } from '../components/MonthlyKcalChart';
import { PhotoMealReview } from '../components/PhotoMealReview';
import { getErrorMessage } from '../constants/errorMessages';
import { MEAL_TYPES } from '../constants/meal';
import type { DailyMeals, Food, Meal, MealItem, MealItemRequest, MealType, MonthlySummary } from '../types/meal';
import type { EnergyTargets } from '../types/profile';
import { addDays, eatenAtFor, formatDayLabel, monthOf, todayVn } from '../utils/date';

const NAV_BUTTON =
  'flex size-10 cursor-pointer items-center justify-center rounded-full bg-surface hover:bg-line ' +
  'disabled:cursor-not-allowed disabled:opacity-40';

export default function MealsPage() {
  const [date, setDate] = useState(todayVn); // the day shown below
  const [viewMonth, setViewMonth] = useState(() => monthOf(todayVn())); // the month in the calendar + chart
  const [day, setDay] = useState<DailyMeals | null>(null);
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [energy, setEnergy] = useState<EnergyTargets | null>(null);
  const [foods, setFoods] = useState<Food[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pickerFor, setPickerFor] = useState<MealType | null>(null);
  const [photoFor, setPhotoFor] = useState<MealType | null>(null); // photo review panel
  const [editingItemId, setEditingItemId] = useState<number | null>(null);

  // Reference data, loaded once: the calorie target and the food list (cached for the whole session)
  useEffect(() => {
    let ignore = false;
    Promise.all([profileApi.find(), foodApi.listAll()])
      .then(([profile, foodList]) => {
        if (ignore) return;
        setEnergy(profile?.energy ?? null);
        setFoods(foodList);
      })
      .catch((err: unknown) => {
        if (!ignore) setError(getErrorMessage(err));
      });
    return () => {
      ignore = true;
    };
  }, []);

  // The selected day's meals: always fresh from the server. setState only inside .then()
  useEffect(() => {
    let ignore = false;
    mealApi
      .listDay(date)
      .then((data) => {
        if (!ignore) setDay(data);
      })
      .catch((err: unknown) => {
        if (!ignore) setError(getErrorMessage(err));
      });
    return () => {
      ignore = true;
    };
  }, [date]);

  // Calories per day of the month shown in the calendar + chart
  useEffect(() => {
    let ignore = false;
    mealApi
      .monthSummary(viewMonth)
      .then((data) => {
        if (!ignore) setSummary(data);
      })
      .catch((err: unknown) => {
        if (!ignore) setError(getErrorMessage(err));
      });
    return () => {
      ignore = true;
    };
  }, [viewMonth]);

  const foodsById = useMemo(() => new Map((foods ?? []).map((f) => [f.id, f])), [foods]);
  const kcalByDate = useMemo(
    () => new Map(summary?.month === viewMonth ? summary.days.map((d) => [d.date, d.kcal]) : []),
    [summary, viewMonth],
  );

  const today = todayVn();
  const loading = day?.date !== date; // showing the previous day while the new one loads
  const targetKcal = energy?.targetKcal ?? null;

  // After every change the day AND the month are reloaded: the server is the source of truth.
  // Errors are not caught here: the editor / picker that started the action shows them.
  async function reload() {
    const [dayData, monthData] = await Promise.all([mealApi.listDay(date), mealApi.monthSummary(viewMonth)]);
    setDay(dayData);
    setSummary(monthData);
  }

  function selectDate(newDate: string) {
    setDate(newDate);
    setViewMonth(monthOf(newDate));
    setPickerFor(null);
    setPhotoFor(null);
    setEditingItemId(null);
    setError(null);
  }

  // One meal per meal type and day: add to it if it exists, otherwise create it
  async function addFood(mealType: MealType, foodId: number, grams: number, fatPercent: number | null) {
    const existing = day?.meals.find((m) => m.mealType === mealType);
    if (existing) {
      await mealApi.addItem(existing.id, { foodId, grams, fatPercent });
    } else {
      await mealApi.create({ mealType, eatenAt: eatenAtFor(date, mealType), items: [{ foodId, grams, fatPercent }] });
    }
    await reload();
    setPickerFor(null);
  }

  // Photo flow: all reviewed items at once. A new meal gets them in one request;
  // an existing meal gets them one by one (the backend checks the 30-item limit each time)
  async function addRecognized(mealType: MealType, items: MealItemRequest[]) {
    const existing = day?.meals.find((m) => m.mealType === mealType);
    if (existing) {
      for (const item of items) await mealApi.addItem(existing.id, item);
    } else {
      await mealApi.create({ mealType, eatenAt: eatenAtFor(date, mealType), items });
    }
    await reload();
    setPhotoFor(null);
  }

  async function saveGrams(meal: Meal, item: MealItem, grams: number, fatPercent: number | null) {
    await mealApi.updateItemGrams(meal.id, item.id, grams, fatPercent);
    await reload();
    setEditingItemId(null);
  }

  async function removeItem(meal: Meal, item: MealItem) {
    await mealApi.removeItem(meal.id, item.id);
    await reload();
    setEditingItemId(null);
  }

  return (
    <div className="grid gap-5">
      {error && <Alert type="error">{error}</Alert>}

      {/* Month overview: calendar (pick a day) + calories per day */}
      {/* Grid rows stretch by default: both cards get the height of the taller one (the calendar) */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="min-w-0">
          <MonthCalendar month={viewMonth} valueByDate={kcalByDate} unit="kcal" emptyLabel="chưa ghi bữa ăn"
            target={targetKcal} footnote={targetKcal != null ? 'Thanh dưới mỗi ngày: calo so với mục tiêu.' : undefined}
            selectedDate={date} today={today} onSelectDate={selectDate} onChangeMonth={setViewMonth} />
        </Card>
        <Card title="Calo theo ngày" className="flex min-w-0 flex-col lg:col-span-2">
          <div className="min-h-0 flex-1">
            {summary?.month === viewMonth ? (
              <MonthlyKcalChart month={viewMonth} kcalByDate={kcalByDate} targetKcal={targetKcal}
                selectedDate={date} today={today} onSelectDate={selectDate} />
            ) : (
              <p className="text-sm text-muted">Đang tải…</p>
            )}
          </div>
        </Card>
      </div>

      {/* The selected day */}
      <div className="flex items-center gap-3">
        <button type="button" className={NAV_BUTTON} onClick={() => selectDate(addDays(date, -1))} aria-label="Ngày trước">
          <ChevronLeft aria-hidden="true" className="size-5" />
        </button>
        <h2 className="min-w-32 text-center text-xl font-semibold first-letter:uppercase">{formatDayLabel(date)}</h2>
        <button type="button" className={NAV_BUTTON} onClick={() => selectDate(addDays(date, 1))} disabled={date >= today}
          aria-label="Ngày sau">
          <ChevronRight aria-hidden="true" className="size-5" />
        </button>
      </div>

      {!day ? (
        !error && <p className="text-muted">Đang tải…</p>
      ) : (
        <div className={`grid items-start gap-5 lg:grid-cols-3 ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
          <div className="min-w-0 lg:sticky lg:top-8">
            <DailyNutritionSummary totals={day.totals} energy={energy} />
          </div>
          <div className="grid min-w-0 gap-5 lg:col-span-2">
            {MEAL_TYPES.map((type) => (
              <MealGroupCard
                key={type}
                mealType={type}
                meals={day.meals.filter((m) => m.mealType === type)}
                foodsById={foodsById}
                editingItemId={editingItemId}
                onEdit={(id) => {
                  setEditingItemId(id);
                  setPickerFor(null);
                  setPhotoFor(null);
                }}
                onSaveGrams={saveGrams}
                onRemoveItem={removeItem}
                onAddClick={() => {
                  setPickerFor(type);
                  setPhotoFor(null);
                  setEditingItemId(null);
                }}
                onPhotoClick={() => {
                  setPhotoFor(type);
                  setPickerFor(null);
                  setEditingItemId(null);
                }}
                picker={
                  pickerFor === type && !loading ? (
                    <FoodPicker
                      mealType={type}
                      foods={foods}
                      onAdd={(foodId, grams, fatPercent) => addFood(type, foodId, grams, fatPercent)}
                      onClose={() => setPickerFor(null)}
                    />
                  ) : photoFor === type && !loading ? (
                    <PhotoMealReview
                      mealType={type}
                      foods={foods}
                      foodsById={foodsById}
                      onSave={(items) => addRecognized(type, items)}
                      onClose={() => setPhotoFor(null)}
                    />
                  ) : null
                }
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
