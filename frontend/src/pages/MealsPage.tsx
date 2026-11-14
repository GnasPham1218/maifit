import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { foodApi } from '../apis/foodApi';
import { mealApi } from '../apis/mealApi';
import { profileApi } from '../apis/profileApi';
import { Alert } from '../components/Alert';
import { Card } from '../components/Card';
import { FoodPicker } from '../components/FoodPicker';
import { MealGroupCard } from '../components/MealGroupCard';
import { MealItemEditor } from '../components/MealItemEditor';
import { DaySwitch } from '../components/meals/DaySwitch';
import { PhotoInfoCard } from '../components/meals/PhotoInfoCard';
import { Modal } from '../components/Modal';
import { MonthCalendar } from '../components/MonthCalendar';
import { NutritionHero } from '../components/NutritionHero';
import { PhotoMealReview } from '../components/PhotoMealReview';
import { getErrorMessage } from '../constants/errorMessages';
import { MEAL_TYPE_LABELS, MEAL_TYPES } from '../constants/meal';
import type { DailyMeals, Food, MealItemRequest, MealType, MonthlySummary } from '../types/meal';
import type { EnergyTargets } from '../types/profile';
import { eatenAtFor, mealTypeAt, monthOf, todayVn } from '../utils/date';

// The one dialog open at a time. Edit keeps ids, not objects: after a reload the fresh item is looked up again.
type Dialog =
  | { kind: 'pick'; mealType: MealType; foodId?: number } // foodId: opened from a food page
  | { kind: 'photo'; mealType: MealType }
  | { kind: 'edit'; mealType: MealType; mealId: number; itemId: number };

export default function MealsPage() {
  const [date, setDate] = useState(todayVn); // the day shown
  const [viewMonth, setViewMonth] = useState(() => monthOf(todayVn())); // the month in the calendar + chart
  const [day, setDay] = useState<DailyMeals | null>(null);
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [energy, setEnergy] = useState<EnergyTargets | null>(null);
  const [foods, setFoods] = useState<Food[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  // From a food page ("Thêm vào bữa ăn"): open the add dialog with that food, for the meal of the hour
  const [dialog, setDialog] = useState<Dialog | null>(() => {
    const foodId = (location.state as { addFoodId?: unknown } | null)?.addFoodId;
    return typeof foodId === 'number' ? { kind: 'pick', mealType: mealTypeAt(), foodId } : null;
  });

  // Used once: clear it so a reload or Back does not open the dialog again
  useEffect(() => {
    if (location.state != null) navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

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
  const targets = energy ? (energy.macros.find((m) => m.split === 'MODERATE_CARB') ?? energy.macros[0]) : null;

  // After every change the day AND the month are reloaded: the server is the source of truth.
  // Errors are not caught here: the dialog that started the action shows them.
  async function reload() {
    const [dayData, monthData] = await Promise.all([mealApi.listDay(date), mealApi.monthSummary(viewMonth)]);
    setDay(dayData);
    setSummary(monthData);
  }

  function selectDate(newDate: string) {
    setDate(newDate);
    setViewMonth(monthOf(newDate));
    setDialog(null);
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
    setDialog(null);
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
    setDialog(null);
  }

  async function saveItem(mealId: number, itemId: number, grams: number, fatPercent: number | null, foodId: number) {
    await mealApi.updateItem(mealId, itemId, { grams, fatPercent, foodId });
    await reload();
    setDialog(null);
  }

  async function removeItem(mealId: number, itemId: number) {
    await mealApi.removeItem(mealId, itemId);
    await reload();
    setDialog(null);
  }

  // The item being edited, looked up in the current day
  const editing = dialog?.kind === 'edit'
    ? day?.meals.find((m) => m.id === dialog.mealId)?.items.find((i) => i.id === dialog.itemId)
    : undefined;

  const dialogTitle = !dialog
    ? ''
    : dialog.kind === 'pick'
      ? `Thêm món vào ${MEAL_TYPE_LABELS[dialog.mealType].toLowerCase()}`
      : dialog.kind === 'photo'
        ? `Ảnh ${MEAL_TYPE_LABELS[dialog.mealType].toLowerCase()}`
        : (editing?.foodName ?? 'Sửa món');

  return (
    <div className="grid gap-5">
      {error && <Alert type="error">{error}</Alert>}

      <div className="flex justify-center md:justify-start">
        <DaySwitch date={date} today={today} onChange={selectDate} />
      </div>

      {!day ? (
        !error && <p className="text-muted">Đang tải…</p>
      ) : (
        <div className={`grid gap-5 ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
          <NutritionHero title="Tổng trong ngày" eaten={day.totals} targetKcal={targetKcal} targets={targets} />

          {/* Both columns end at the same line: the meal cards share the height of the row equally
              (auto-rows-fr) and the calendar card grows to fill its column, so no empty gap is left under either */}
          <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="grid auto-rows-fr gap-4 sm:grid-cols-2">
              {MEAL_TYPES.map((type) => (
                <MealGroupCard key={type} mealType={type} disabled={loading}
                  meals={day.meals.filter((m) => m.mealType === type)}
                  onEdit={(meal, item) => setDialog({ kind: 'edit', mealType: type, mealId: meal.id, itemId: item.id })}
                  onAddClick={() => setDialog({ kind: 'pick', mealType: type })}
                  onPhotoClick={() => setDialog({ kind: 'photo', mealType: type })} />
              ))}
            </div>

            <div className="flex flex-col gap-5">
              <Card className="min-w-0 flex-1">
                <MonthCalendar month={viewMonth} valueByDate={kcalByDate} unit="kcal" emptyLabel="chưa ghi bữa ăn"
                  target={targetKcal} footnote={targetKcal != null ? 'Thanh dưới mỗi ngày: calo so với mục tiêu.' : undefined}
                  selectedDate={date} today={today} onSelectDate={selectDate} onChangeMonth={setViewMonth} />
              </Card>
              <PhotoInfoCard />
            </div>
          </div>

        </div>
      )}

      {/* One dialog for all three flows. Content only while open, keyed by the flow: each opening starts fresh.
          The photo and picker dialogs hold unsaved work, so a tap on the backdrop does not close them. */}
      <Modal open={dialog != null} onClose={() => setDialog(null)} title={dialogTitle}
        size={dialog?.kind === 'photo' ? 'lg' : 'md'} closeOnBackdrop={dialog?.kind === 'edit'}>
        {/* With a food from its page, wait for the food list: the picker reads its initial food once */}
        {dialog?.kind === 'pick' && (dialog.foodId != null && foods == null ? (
          <p className="text-muted">Đang tải…</p>
        ) : (
          <FoodPicker key="pick" mealType={dialog.mealType} foods={foods}
            initialFood={dialog.foodId != null ? foodsById.get(dialog.foodId) : null}
            onMealTypeChange={(mealType) => setDialog({ ...dialog, mealType })}
            onAdd={(foodId, grams, fatPercent) => addFood(dialog.mealType, foodId, grams, fatPercent)} />
        ))}
        {dialog?.kind === 'photo' && (
          <PhotoMealReview key={`photo-${dialog.mealType}`} mealType={dialog.mealType} foods={foods} foodsById={foodsById}
            onSave={(items) => addRecognized(dialog.mealType, items)}
            onManual={() => setDialog({ kind: 'pick', mealType: dialog.mealType })} />
        )}
        {dialog?.kind === 'edit' && editing && (
          <MealItemEditor key={`edit-${editing.id}`} item={editing} mealType={dialog.mealType} foods={foods}
            onSave={(grams, fatPercent, foodId) => saveItem(dialog.mealId, dialog.itemId, grams, fatPercent, foodId)}
            onRemove={() => removeItem(dialog.mealId, dialog.itemId)} />
        )}
      </Modal>
    </div>
  );
}
