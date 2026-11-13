import { Camera, Check, Crown, ImageUp, Pencil, Plus, ScanSearch, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ApiError } from '../apis/client';
import { mealApi } from '../apis/mealApi';
import { getErrorMessage } from '../constants/errorMessages';
import { MEAL_TYPE_LABELS, PREPARATION_LABELS, PREPARATIONS, WEIGHED_WHEN_LABELS } from '../constants/meal';
import type { Food, MealItemRequest, MealType, Preparation } from '../types/meal';
import { resizeForUpload } from '../utils/image';
import { edibleHint, leanHint } from '../utils/edible';
import { formatNumber } from '../utils/number';
import { kcalFor, nutritionFor, parseGrams, sumNutrition, type FatTrim } from '../utils/nutrition';
import { normalize } from '../utils/text';
import { Button } from './Button';
import { ButtonLink } from './ButtonLink';
import { Chip } from './Chip';
import { FoodChooser } from './FoodChooser';
import { FatTrimSlider } from './FatTrimSlider';
import { MacroLine } from './MacroLine';
import { PhotoCropper } from './PhotoCropper';

interface Props {
  mealType: MealType;
  foods: Food[] | null; // for "change food" / "add a missed food"
  foodsById: Map<number, Food>; // calories come from here, never from the AI
  onSave: (items: MealItemRequest[]) => Promise<void>;
  onManual: () => void; // out of photo scans: switch this dialog to the manual food search
}

interface Row {
  key: number;
  foodId: number;
  name: string;
  preparation: Preparation;
  // The AI's gram estimate, saved to compare with the user's correction.
  // null when the user changed the food or added it by hand: the estimate was for another food.
  aiGrams: number | null;
  aiName: string | null; // what the AI saw ("cơm trắng"); null for a food added by hand
  lowConfidence: boolean; // weak match: shown with a "Kiểm tra lại" badge until the user changes the food
  grams: string; // what the user sees and edits
  fatPercent: number; // 0-100; only used when the row's food has leanVersionId, else ignored
}

// Which row the food chooser is open for: a row key, 'new' for "add a missed food", or none
type Choosing = number | 'new' | null;

type Status = 'idle' | 'cropping' | 'analyzing' | 'review';

// "cơm trắng" vs "Cơm trắng": no need to repeat what the AI saw when it is our name
const sameName = (a: string | null, b: string) => a != null && normalize(a) === normalize(b);

// iOS converts HEIC photos to JPEG when HEIC is not in the accepted types
const ACCEPT = 'image/jpeg,image/png,image/webp';

// Photo -> AI suggestions -> the user fixes grams / removes wrong foods -> save.
// The AI only names foods from our table and guesses grams; nothing is saved until "Lưu".
// Shown inside a Modal (MealsPage), which gives the title and the close button.
export function PhotoMealReview({ mealType, foods, foodsById, onSave, onManual }: Props) {
  const [status, setStatus] = useState<Status>('idle');
  const [preview, setPreview] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [unmatched, setUnmatched] = useState<string[]>([]);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false); // AI_DAILY_LIMIT: offer Premium or manual add
  const [busy, setBusy] = useState(false);
  const [choosing, setChoosing] = useState<Choosing>(null);
  const [newQuery, setNewQuery] = useState(''); // prefilled search for 'new' (an unmatched AI name, or empty)
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const pendingFile = useRef<File | null>(null); // the chosen photo while the user frames it
  const requestId = useRef(0); // ignores a late answer for a photo that was replaced, or after closing

  // Free the preview image memory when it changes or the panel closes
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);
  useEffect(() => () => {
    requestId.current++;
  }, []);

  // Step 1: a photo was chosen -> let the user frame the plate in a square before anything is sent
  function handleFile(file: File | undefined) {
    if (!file) return;
    pendingFile.current = file;
    requestId.current++; // drop any answer still pending for the previous photo
    setError(null);
    setRows([]);
    setUnmatched([]);
    setChoosing(null);
    setPreview(URL.createObjectURL(file));
    setStatus('cropping');
  }

  function cropFailed() {
    pendingFile.current = null;
    setStatus('idle');
    setError('Không đọc được ảnh này. Hãy thử ảnh JPEG hoặc PNG.');
  }

  // "Dùng ảnh gốc": no crop, just shrink like before
  async function analyzeOriginal() {
    const file = pendingFile.current;
    if (!file) return;
    try {
      await analyze(await resizeForUpload(file));
    } catch {
      cropFailed();
    }
  }

  // Step 2: send the (cropped or original) image to the AI
  async function analyze(image: Blob) {
    const id = ++requestId.current;
    setStatus('analyzing');
    setPreview(URL.createObjectURL(image)); // the review shows exactly what the AI saw

    try {
      const result = await mealApi.recognize(image);
      if (id !== requestId.current) return;
      setRemaining(result.remainingToday);
      setRows(result.items.map((item, i) => ({
        key: i,
        foodId: item.foodId,
        name: item.name,
        preparation: item.preparation,
        aiGrams: item.grams,
        aiName: item.aiName,
        lowConfidence: item.lowConfidence,
        grams: String(item.grams),
        fatPercent: 100, // as listed; the AI cannot tell lean from fatty in a photo
      })));
      setUnmatched(result.unmatched);
      setStatus('review');
    } catch (err) {
      if (id !== requestId.current) return;
      setStatus('idle');
      if (err instanceof ApiError && err.code === 'AI_DAILY_LIMIT') {
        setRemaining(0);
        setLimitReached(true);
      } else {
        setError(getErrorMessage(err));
      }
    }
  }

  const parsed = rows.map((r) => parseGrams(r.grams));
  const allValid = rows.length > 0 && parsed.every((g) => g != null);
  // Rows with invalid grams are left out of the total until fixed
  const trimFor = (row: Row): FatTrim | undefined => {
    const food = foodsById.get(row.foodId);
    const leanFood = food?.leanVersionId != null ? foodsById.get(food.leanVersionId) : undefined;
    return leanFood ? { leanFood, fatPercent: row.fatPercent } : undefined;
  };
  const { total, incomplete } = sumNutrition(rows.flatMap((r, i) => {
    const food = foodsById.get(r.foodId);
    const g = parsed[i];
    return food && g != null ? [nutritionFor(food, g, trimFor(r))] : [];
  }));

  async function handleSave() {
    if (!allValid) return;
    setError(null);
    setBusy(true);
    try {
      await onSave(rows.map((r, i) => ({
        foodId: r.foodId,
        grams: parsed[i]!,
        aiGrams: r.aiGrams,
        fatPercent: trimFor(r) ? r.fatPercent : null,
      })));
      // the parent closes the panel on success
    } catch (err) {
      setError(getErrorMessage(err));
      setBusy(false);
    }
  }

  function pickAgain() {
    setStatus('idle');
    setRows([]);
    setUnmatched([]);
    setChoosing(null);
    setError(null);
  }

  // Wrong food: keep the grams (the portion is still on the plate), drop the AI estimate
  function changeFood(key: number, food: Food) {
    setRows(rows.map((r) => (r.key === key
      ? {
          ...r, foodId: food.id, name: food.name, preparation: food.preparation,
          aiGrams: null, lowConfidence: false, fatPercent: 100,
        }
      : r)));
    setChoosing(null);
  }

  // Same food, other preparation ("weighed after boiling", not raw): the portion and the AI estimate still hold
  function changePreparation(key: number, food: Food) {
    setRows(rows.map((r) => (r.key === key
      ? { ...r, foodId: food.id, preparation: food.preparation, lowConfidence: false, fatPercent: 100 }
      : r)));
  }

  // The other preparations of a food in our table, in the usual order (empty when there is only one)
  function preparationsOf(name: string): Food[] {
    const same = (foods ?? []).filter((f) => f.name === name);
    if (same.length < 2) return [];
    return PREPARATIONS.flatMap((p) => same.filter((f) => f.preparation === p));
  }

  // A food the AI missed (or a close food for an unmatched AI name): the user types the grams
  function addMissed(food: Food) {
    const key = rows.reduce((max, r) => Math.max(max, r.key), -1) + 1; // unique within this list
    const forUnmatched = unmatched.includes(newQuery) ? newQuery : null;
    setRows([...rows, {
      key, foodId: food.id, name: food.name, preparation: food.preparation,
      aiGrams: null, aiName: forUnmatched, lowConfidence: false, grams: '', fatPercent: 100,
    }]);
    if (forUnmatched) setUnmatched(unmatched.filter((n) => n !== forUnmatched)); // handled
    setChoosing(null);
  }

  // initialQuery = what the AI saw, so the closest foods show without typing.
  // key: a new initial query starts a fresh chooser instead of keeping the old search.
  const chooser = (onPick: (food: Food) => void, idPrefix: string, initialQuery = '') => foods && (
    <div className="grid gap-3 rounded-2xl border border-line p-4">
      <FoodChooser key={`${idPrefix}-${initialQuery}`} foods={foods} idPrefix={idPrefix} autoFocus
        initialQuery={initialQuery} onChange={(f) => { if (f) onPick(f); }} />
      <div>
        <Button variant="secondary" size="sm" onClick={() => setChoosing(null)}>Hủy</Button>
      </div>
    </div>
  );

  const scansLeft = remaining != null && (
    <p className="text-center text-sm text-muted">Mỗi lần nhận diện dùng 1 lượt, hôm nay còn {remaining} lượt.</p>
  );

  // Out of scans: say so and offer both ways forward instead of a dead end
  if (limitReached) {
    return (
      <div className="grid justify-items-center gap-4 py-4 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-gold/20 text-gold">
          <Crown aria-hidden="true" className="size-7" />
        </span>
        <p className="text-lg font-semibold">Hết lượt nhận diện ảnh hôm nay</p>
        <p className="max-w-sm text-muted">
          Lượt mới có lúc 0 giờ. Bạn vẫn thêm được món bằng cách tìm tên, hoặc mở Premium để chụp tiếp ngay.
        </p>
        <div className="grid w-full gap-3 sm:grid-cols-2">
          <ButtonLink to="/premium"><Crown aria-hidden="true" className="size-4" /> Mở khóa với Premium</ButtonLink>
          <Button variant="secondary" onClick={onManual}>Thêm món bằng tay</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      {/* capture="environment" opens the back camera on phones; the second input opens the gallery */}
      <input ref={cameraInput} type="file" accept={ACCEPT} capture="environment" className="hidden"
        onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ''; }} />
      <input ref={galleryInput} type="file" accept={ACCEPT} className="hidden"
        onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ''; }} />

      {status === 'idle' && (
        <>
          <div className="grid gap-3 rounded-2xl bg-soft p-4 text-sm">
            <p className="font-semibold">Chụp sao cho AI đoán đúng</p>
            <ul className="grid list-disc gap-1.5 pl-5 text-muted">
              <li>Chụp từ trên xuống, đủ sáng, thấy cả đĩa hoặc bát.</li>
              <li>Đứng xa hơn một chút để chừa viền quanh món: bước sau bạn sẽ cắt lại khung vuông.</li>
              <li>Chụp từng bữa riêng; để chảo, nồi, dụng cụ ra ngoài khung.</li>
            </ul>
            <p className="text-muted">AI chỉ gợi ý món và số gram. Calo tính từ bảng dữ liệu, bạn kiểm tra lại trước khi lưu.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button size="lg" onClick={() => cameraInput.current?.click()}>
              <Camera aria-hidden="true" className="size-5" /> Chụp ảnh
            </Button>
            <Button size="lg" variant="secondary" onClick={() => galleryInput.current?.click()}>
              <ImageUp aria-hidden="true" className="size-5" /> Chọn ảnh có sẵn
            </Button>
          </div>
        </>
      )}

               {status === 'cropping' && preview && (
           <PhotoCropper src={preview} remaining={remaining} onConfirm={(square) => void analyze(square)}
             onUseOriginal={() => void analyzeOriginal()} onCancel={pickAgain} onLoadError={cropFailed} />
         )}

      {status === 'analyzing' && preview && (
        <div className="grid gap-3">
          <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-2xl bg-black">
            <img src={preview} alt="Ảnh đang nhận diện" className="mx-auto h-auto max-h-80 w-auto max-w-full object-contain" />
            {/* A line sweeping over the photo while waiting; reduced motion leaves it still */}
            <span aria-hidden="true" className="absolute inset-x-0 h-0.5 bg-accent shadow-[0_0_18px_6px] shadow-accent/60 animate-scan" />
          </div>
          <p role="status" className="flex items-center justify-center gap-2 font-semibold">
            <ScanSearch aria-hidden="true" className="size-5 text-link" /> Đang nhận diện món…
          </p>
          <p className="text-center text-sm text-muted">Thường mất vài giây.</p>
        </div>
      )}

      {status === 'review' && (
        <>
          <div className="flex items-center gap-3">
            {preview && (
              <img src={preview} alt="Ảnh đã nhận diện" className="size-18 shrink-0 rounded-2xl object-cover" />
            )}
            <p className="text-sm text-muted">
              AI chỉ nhận món và ước lượng gram. Calo tính từ bảng dữ liệu, bạn sửa gram để tính lại.
            </p>
          </div>

          {rows.length === 0 ? (
            <p className="text-sm text-muted">
              Không nhận ra món nào có trong danh sách. Bạn thử ảnh khác hoặc thêm món bên dưới.
            </p>
          ) : (
            <ul>
              {rows.map((row, i) => {
                const food = foodsById.get(row.foodId);
                const g = parsed[i];
                const options = preparationsOf(row.name);
                const leanFood = food?.leanVersionId != null ? foodsById.get(food.leanVersionId) : undefined;
                return (
                  <li key={row.key} className="grid gap-3 border-t border-line py-3 first:border-t-0">
                    <div className="flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold">
                          <span>{row.name}</span>
                          {row.preparation !== 'RAW' && options.length === 0 && (
                            <span className="rounded-full bg-soft px-2 py-0.5 text-xs font-normal text-link">
                              {PREPARATION_LABELS[row.preparation]}
                            </span>
                          )}
                          {row.lowConfidence && (
                            <span className="rounded-full border border-gold bg-gold/15 px-2 py-0.5 text-xs font-medium">
                              Kiểm tra lại
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted">
                          {row.aiGrams != null
                            ? `${sameName(row.aiName, row.name) ? '' : `AI thấy “${row.aiName}”, `}ước lượng ${formatNumber(row.aiGrams)} g`
                            : row.aiName
                              ? `Đã đổi từ “${row.aiName}”`
                              : 'Bạn thêm thủ công'}
                        </p>
                      </div>
                      <label className="flex shrink-0 items-center gap-1 text-sm text-muted">
                        <span className="sr-only">Số gram {row.name}</span>
                        <input inputMode="decimal" value={row.grams} aria-invalid={g == null}
                          onChange={(e) => setRows(rows.map((r) => (r.key === row.key ? { ...r, grams: e.target.value } : r)))}
                          className={`h-10 w-16 rounded-xl border bg-field px-2 text-right text-base text-ink tabular-nums
                            focus-visible:outline-2 focus-visible:outline-accent ${g == null ? 'border-danger' : 'border-line'}`} />
                        g
                      </label>
                      <span className="w-16 shrink-0 text-right font-display text-lg font-semibold tabular-nums">
                        {food && g != null ? formatNumber(Math.round(kcalFor(food, g, trimFor(row)))) : '—'}
                      </span>
                      <div className="-mr-2 flex shrink-0">
                        <button type="button" onClick={() => setChoosing(choosing === row.key ? null : row.key)}
                          className={`flex size-9 cursor-pointer items-center justify-center rounded-full hover:bg-soft hover:text-ink ${
                            choosing === row.key ? 'bg-soft text-ink' : 'text-muted'}`}
                          aria-label={`Đổi ${row.name} thành món khác`} aria-expanded={choosing === row.key}
                          title="Sửa món (AI nhận sai)">
                          <Pencil aria-hidden="true" className="size-4" />
                        </button>
                        <button type="button" onClick={() => setRows(rows.filter((r) => r.key !== row.key))}
                          className="flex size-9 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-soft hover:text-danger"
                          aria-label={`Bỏ ${row.name}`} title="Bỏ món này">
                          <Trash2 aria-hidden="true" className="size-4" />
                        </button>
                      </div>
                    </div>
                    {g == null && <p className="-mt-2 text-xs text-danger">Số gram từ 0,1 đến 5000.</p>}

                    {/* The same food weighed at another stage changes the calories a lot (raw vs boiled rice) */}
                    {options.length > 0 && (
                      <fieldset className="grid gap-2">
                        <legend className="mb-2 text-sm">Bạn cân {row.name.toLowerCase()} lúc nào?</legend>
                        <div className="flex flex-wrap gap-2">
                          {options.map((f) => (
                            <Chip key={f.id} size="sm" selected={f.id === row.foodId}
                              onClick={() => changePreparation(row.key, f)}>
                              {WEIGHED_WHEN_LABELS[f.preparation]}
                            </Chip>
                          ))}
                        </div>
                      </fieldset>
                    )}

                    {food && leanFood && (
                      <FatTrimSlider id={`photo-fat-trim-${row.key}`} food={food} leanFood={leanFood}
                        value={row.fatPercent}
                        onChange={(v) => setRows(rows.map((r) => (r.key === row.key ? { ...r, fatPercent: v } : r)))} />
                    )}
                    {food && edibleHint(food) && <p className="text-xs text-muted">{edibleHint(food)}</p>}
                    {food && leanHint(food) && <p className="text-xs text-muted">{leanHint(food)}</p>}

                    {choosing === row.key && chooser((f) => changeFood(row.key, f), `swap-${row.key}`, row.aiName ?? '')}
                  </li>
                );
              })}
            </ul>
          )}

          {unmatched.length > 0 && (
            <div className="grid gap-2">
              <p className="text-sm text-muted">
                AI còn thấy các món chưa có trong danh sách. Bấm vào một món để chọn món gần giống:
              </p>
              <div className="flex flex-wrap gap-2">
                {unmatched.map((n) => (
                  <button key={n} type="button" disabled={!foods}
                    onClick={() => { setNewQuery(n); setChoosing('new'); }}
                    className="cursor-pointer rounded-full border border-dashed border-line px-3 py-1.5 text-sm hover:bg-soft disabled:cursor-not-allowed">
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}

          {choosing === 'new' ? (
            chooser(addMissed, 'photo-add', newQuery)
          ) : (
            <button type="button" onClick={() => { setNewQuery(''); setChoosing('new'); }} disabled={!foods}
              className="inline-flex cursor-pointer items-center gap-1.5 justify-self-start rounded-full py-1 font-semibold text-link hover:underline disabled:cursor-not-allowed">
              <Plus aria-hidden="true" className="size-4" /> Thêm món AI bỏ sót
            </button>
          )}

          <div className="grid gap-3 border-t border-line pt-4">
            <div className="flex items-end justify-between gap-4">
              <div className="grid min-w-0 gap-1">
                <MacroLine nutrition={total} className="text-sm text-muted" />
                {incomplete && (
                  <p className="text-xs text-muted">Một số món chưa đủ số liệu dinh dưỡng, tổng chỉ tính phần đã biết.</p>
                )}
              </div>
              <p className="shrink-0 font-display text-4xl font-bold tabular-nums">
                {formatNumber(Math.round(total.kcal))} <span className="font-sans text-sm font-normal text-muted">kcal</span>
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)]">
              <Button variant="secondary" onClick={pickAgain} disabled={busy}>Chọn ảnh khác</Button>
              <Button onClick={() => void handleSave()} disabled={busy || !allValid}>
                <Check aria-hidden="true" className="size-4" />
                {busy ? 'Đang lưu…' : `Lưu ${rows.length} món vào ${MEAL_TYPE_LABELS[mealType].toLowerCase()}`}
              </Button>
            </div>
            {scansLeft}
          </div>
        </>
      )}

      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
    </div>
  );
}
