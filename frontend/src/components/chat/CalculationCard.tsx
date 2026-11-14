import { Calculator, Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { foodApi } from '../../apis/foodApi';
import { mealApi } from '../../apis/mealApi';
import { getErrorMessage } from '../../constants/errorMessages';
import { MEAL_TYPE_LABELS, MEAL_TYPES, PREPARATION_LABELS } from '../../constants/meal';
import type { ChatCalcItem, ChatCalcItemRequest, ChatCalculation } from '../../types/chat';
import type { Food, MealType, Nutrition, Preparation } from '../../types/meal';
import { eatenAtFor, todayVn } from '../../utils/date';
import { formatNumber } from '../../utils/number';
import { parseGrams } from '../../utils/nutrition';
import { ButtonLink } from '../ButtonLink';
import { FoodChooser } from '../FoodChooser';
import { Modal } from '../Modal';
import { FoodDetailsView } from '../food/FoodDetailsView';

interface CalculationCardProps {
  calculation: ChatCalculation;
  // Sends the whole corrected list; the backend recalculates and saves it (no AI call, no quota)
  onSave: (items: ChatCalcItemRequest[]) => Promise<void>;
}

const MAX_ITEMS = 10;
const MAX_GRAMS = 2000;
const ICON_BUTTON = 'flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-bg disabled:cursor-wait disabled:opacity-60';

function macros(n: Nutrition): string {
  const part = (label: string, value: number | null) => (value === null ? null : `${label} ${formatNumber(value)} g`);
  return [part('Đạm', n.proteinG), part('Carb', n.carbG), part('Béo', n.fatG)].filter(Boolean).join(' · ');
}

const toRequest = (item: ChatCalcItem): ChatCalcItemRequest => ({
  food: item.food, preparation: item.preparation, grams: item.grams, estimated: item.estimated,
});

// A meal type that fits the current hour (Vietnam time), as the default choice
function mealTypeNow(): MealType {
  const hour = Number(new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' }));
  if (hour < 10) return 'BREAKFAST';
  if (hour < 15) return 'LUNCH';
  if (hour < 21) return 'DINNER';
  return 'SNACK';
}

// Portions under an answer. The model only named foods and grams; every number here was calculated by the
// backend from the foods table. The user can correct anything (the AI is a suggestion), then log it as a meal.
export function CalculationCard({ calculation, onSave }: CalculationCardProps) {
  const [busy, setBusy] = useState(false);
  const [viewing, setViewing] = useState<number | null>(null); // food whose details are open
  const [error, setError] = useState<string | null>(null);
  const [gramDrafts, setGramDrafts] = useState<Record<number, string>>({});
  const [choosing, setChoosing] = useState<number | 'new' | null>(null); // row whose food is being changed
  const [chosen, setChosen] = useState<Food | null>(null);
  const [foods, setFoods] = useState<Food[] | null>(null);
  const [mealType, setMealType] = useState<MealType>(mealTypeNow);
  const [logged, setLogged] = useState<MealType | null>(null);

  async function save(items: ChatCalcItemRequest[]) {
    setBusy(true);
    setError(null);
    try {
      await onSave(items);
      setLogged(null); // the list changed: it can be logged again
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const current = () => calculation.items.map(toRequest);

  function setPreparation(index: number, preparation: Preparation) {
    void save(current().map((item, i) => (i === index ? { ...item, preparation } : item)));
  }

  function commitGrams(index: number) {
    const draft = gramDrafts[index];
    setGramDrafts((drafts) => {
      const rest = { ...drafts };
      delete rest[index];
      return rest;
    });
    if (draft === undefined) return;
    const grams = parseGrams(draft);
    if (grams === null || grams < 1 || grams > MAX_GRAMS) {
      setError(`Số gram phải từ 1 đến ${MAX_GRAMS}.`);
      return;
    }
    if (grams === calculation.items[index].grams) return;
    void save(current().map((item, i) => (i === index ? { ...item, grams, estimated: false } : item)));
  }

  function remove(index: number) {
    void save(current().filter((_, i) => i !== index));
  }

  async function openChooser(target: number | 'new') {
    setChoosing(target);
    setChosen(null);
    if (!foods) {
      try {
        setFoods(await foodApi.listAll());
      } catch (err) {
        setError(getErrorMessage(err));
        setChoosing(null);
      }
    }
  }

  function applyChosen() {
    if (!chosen || choosing === null) return;
    const picked = { food: chosen.name, preparation: chosen.preparation };
    const items = choosing === 'new'
      ? [...current(), { ...picked, grams: 100, estimated: false }]
      : current().map((item, i) => (i === choosing ? { ...item, ...picked } : item));
    setChoosing(null);
    void save(items);
  }

  // Same rule as the meal page: one meal per type and day; add to it if it exists
  async function logMeal() {
    const items = calculation.items.map((item) => ({ foodId: item.foodId as number, grams: item.grams }));
    setBusy(true);
    setError(null);
    try {
      const today = todayVn();
      const day = await mealApi.listDay(today);
      const existing = day.meals.find((m) => m.mealType === mealType);
      if (existing) {
        for (const item of items) await mealApi.addItem(existing.id, item);
      } else {
        await mealApi.create({ mealType, eatenAt: eatenAtFor(today, mealType), items });
      }
      setLogged(mealType);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const canLog = calculation.total !== null && calculation.items.every((item) => item.foodId !== null);

  return (
    <div className="mt-2 rounded-3xl border border-line bg-surface px-4 py-3 text-sm" aria-busy={busy}>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted">
        <Calculator aria-hidden="true" className="size-3.5" /> Tính từ bảng thực phẩm MAIFit · sửa được nếu AI hiểu sai
      </p>

      <ul className="grid gap-3">
        {calculation.items.map((item, index) => (
          <li key={`${index}-${item.food}`} className="grid gap-1.5">
            <div className="flex items-center gap-2">
              <span className="min-w-0 flex-1">
                {item.foodId != null ? (
                  <button type="button" onClick={() => setViewing(item.foodId)}
                    className="cursor-pointer text-left font-medium text-link transition-colors hover:text-ink"
                    aria-label={`Xem chi tiết ${item.food}`}>
                    {item.food}
                  </button>
                ) : (
                  <span className="font-medium">{item.food}</span>
                )}
                {item.preparation && item.options.length === 1 && (
                  <span className="text-muted"> · {PREPARATION_LABELS[item.preparation]}</span>
                )}
              </span>
              <label className="flex items-center gap-1 text-xs text-muted">
                <span className="sr-only">Số gram {item.food}</span>
                <input
                  inputMode="decimal"
                  disabled={busy}
                  value={gramDrafts[index] ?? formatNumber(item.grams)}
                  onChange={(e) => setGramDrafts((d) => ({ ...d, [index]: e.target.value }))}
                  onBlur={() => commitGrams(index)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur();
                  }}
                  className="w-14 rounded-lg border border-line px-1.5 py-0.5 text-right text-sm text-ink tabular-nums"
                />
                g{item.estimated && <span title="AI ước lượng, bạn sửa được">≈</span>}
              </label>
              <span className="w-20 shrink-0 text-right tabular-nums">
                {item.nutrition ? `${formatNumber(item.nutrition.kcal)} kcal` : '—'}
              </span>
              <button type="button" className={ICON_BUTTON} disabled={busy} onClick={() => void openChooser(index)}
                aria-label={`Đổi món ${item.food}`} title="Đổi món">
                <Pencil aria-hidden="true" className="size-3.5" />
              </button>
              <button type="button" className={`${ICON_BUTTON} hover:text-danger`} disabled={busy}
                onClick={() => remove(index)} aria-label={`Bỏ ${item.food}`} title="Bỏ món này">
                <Trash2 aria-hidden="true" className="size-3.5" />
              </button>
            </div>

            {/* Always shown when the food has several preparations: pick one, or change the one chosen */}
            {item.options.length > 1 && (
              <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label={`Cách chế biến ${item.food}`}>
                {item.preparation === null && <span className="text-xs text-muted">Chế biến thế nào?</span>}
                {item.options.map((option) => {
                  const selected = option === item.preparation;
                  return (
                    <button key={option} type="button" role="radio" aria-checked={selected} disabled={busy}
                      onClick={() => {
                        if (!selected) setPreparation(index, option);
                      }}
                      className={`cursor-pointer rounded-full px-3 py-1 text-xs disabled:cursor-wait disabled:opacity-60 ${
                        selected ? 'bg-accent text-on-accent' : 'bg-soft text-link hover:bg-accent hover:text-on-accent'}`}>
                      {PREPARATION_LABELS[option]}
                    </button>
                  );
                })}
              </div>
            )}

            {choosing === index && (
              <Chooser foods={foods} idPrefix={`chat-calc-${index}`} initialQuery={item.food}
                onChange={setChosen} canApply={chosen !== null} onApply={applyChosen} onCancel={() => setChoosing(null)} />
            )}
          </li>
        ))}
      </ul>

      {choosing === 'new' ? (
        <div className="mt-3">
          <Chooser foods={foods} idPrefix="chat-calc-new" initialQuery="" onChange={setChosen}
            canApply={chosen !== null} onApply={applyChosen} onCancel={() => setChoosing(null)} />
        </div>
      ) : calculation.items.length < MAX_ITEMS && (
        <button type="button" disabled={busy} onClick={() => void openChooser('new')}
          className="mt-2 inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-link disabled:opacity-60">
          <Plus aria-hidden="true" className="size-3.5" /> Thêm món
        </button>
      )}

      <div className="mt-3 border-t border-line pt-2">
        {calculation.total ? (
          <>
            <p className="flex justify-between font-semibold tabular-nums">
              <span>Tổng</span><span>{formatNumber(calculation.total.kcal)} kcal</span>
            </p>
            <p className="text-xs text-muted">{macros(calculation.total)}</p>
          </>
        ) : (
          <p className="text-xs text-muted">Chọn cách chế biến để tính tổng.</p>
        )}
      </div>

      {canLog && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
          {logged ? (
            <p className="flex items-center gap-1.5 text-xs text-success" role="status">
              <Check aria-hidden="true" className="size-3.5" />
              Đã ghi vào {MEAL_TYPE_LABELS[logged].toLowerCase()} hôm nay. <Link to="/meals" className="font-medium">Xem nhật ký</Link>
            </p>
          ) : (
            <>
              <label htmlFor={`log-meal-${calculation.items.length}`} className="text-xs text-muted">Ghi vào</label>
              <select id={`log-meal-${calculation.items.length}`} value={mealType} disabled={busy}
                onChange={(e) => setMealType(e.target.value as MealType)}
                className="rounded-full border border-line bg-surface px-2 py-1 text-xs">
                {MEAL_TYPES.map((type) => <option key={type} value={type}>{MEAL_TYPE_LABELS[type]}</option>)}
              </select>
              <button type="button" disabled={busy} onClick={() => void logMeal()}
                className="cursor-pointer rounded-full bg-accent px-3 py-1 text-xs font-semibold text-on-accent enabled:hover:opacity-90 disabled:cursor-wait disabled:opacity-60">
                Ghi vào nhật ký hôm nay
              </button>
            </>
          )}
        </div>
      )}

      {error && <p className="mt-2 text-xs text-danger" role="alert">{error}</p>}

      {/* A food's details over the chat: the card and its unsaved corrections stay as they are */}
      <Modal open={viewing != null} onClose={() => setViewing(null)} title="Chi tiết món">
        {viewing != null && (
          <FoodDetailsView id={viewing} onSelect={setViewing}
            actions={(v) => <ButtonLink to={`/foods/${v.id}`} variant="secondary">Mở trang riêng</ButtonLink>} />
        )}
      </Modal>
    </div>
  );
}

interface ChooserProps {
  foods: Food[] | null;
  idPrefix: string;
  initialQuery: string;
  onChange: (food: Food | null) => void;
  canApply: boolean;
  onApply: () => void;
  onCancel: () => void;
}

// The meal page's food search (accents, aliases, close names, "weighed raw or cooked?")
function Chooser({ foods, idPrefix, initialQuery, onChange, canApply, onApply, onCancel }: ChooserProps) {
  return (
    <div className="grid gap-2 rounded-2xl bg-bg p-3">
      {foods ? (
        <FoodChooser foods={foods} idPrefix={idPrefix} autoFocus initialQuery={initialQuery} onChange={onChange} />
      ) : (
        <p className="text-xs text-muted">Đang tải danh sách món…</p>
      )}
      <div className="flex gap-2">
        <button type="button" disabled={!canApply} onClick={onApply}
          className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-on-accent disabled:cursor-not-allowed disabled:opacity-40">
          <Check aria-hidden="true" className="size-3.5" /> Dùng món này
        </button>
        <button type="button" onClick={onCancel}
          className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-line bg-surface px-3 py-1 text-xs">
          <X aria-hidden="true" className="size-3.5" /> Huỷ
        </button>
      </div>
    </div>
  );
}
