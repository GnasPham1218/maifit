import { Camera, ImageUp, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { mealApi } from '../apis/mealApi';
import { getErrorMessage } from '../constants/errorMessages';
import { MEAL_TYPE_LABELS, PREPARATION_LABELS } from '../constants/meal';
import type { Food, MealItemRequest, MealType, Preparation } from '../types/meal';
import { resizeForUpload } from '../utils/image';
import { edibleHint, leanHint } from '../utils/edible';
import { formatNumber } from '../utils/number';
import { kcalFor, nutritionFor, parseGrams, sumNutrition } from '../utils/nutrition';
import { normalize } from '../utils/text';
import { Button } from './Button';
import { FoodChooser } from './FoodChooser';
import { FormField } from './FormField';
import { MacroLine } from './MacroLine';
import { PhotoCropper } from './PhotoCropper';

interface Props {
  mealType: MealType;
  foods: Food[] | null; // for "change food" / "add a missed food"
  foodsById: Map<number, Food>; // calories come from here, never from the AI
  onSave: (items: MealItemRequest[]) => Promise<void>;
  onClose: () => void;
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
export function PhotoMealReview({ mealType, foods, foodsById, onSave, onClose }: Props) {
  const [status, setStatus] = useState<Status>('idle');
  const [preview, setPreview] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [unmatched, setUnmatched] = useState<string[]>([]);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
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
      })));
      setUnmatched(result.unmatched);
      setStatus('review');
    } catch (err) {
      if (id !== requestId.current) return;
      setStatus('idle');
      setError(getErrorMessage(err));
    }
  }

  const parsed = rows.map((r) => parseGrams(r.grams));
  const allValid = rows.length > 0 && parsed.every((g) => g != null);
  // Rows with invalid grams are left out of the total until fixed
  const { total, incomplete } = sumNutrition(rows.flatMap((r, i) => {
    const food = foodsById.get(r.foodId);
    const g = parsed[i];
    return food && g != null ? [nutritionFor(food, g)] : [];
  }));

  async function handleSave() {
    if (!allValid) return;
    setError(null);
    setBusy(true);
    try {
      await onSave(rows.map((r, i) => ({ foodId: r.foodId, grams: parsed[i]!, aiGrams: r.aiGrams })));
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
      ? { ...r, foodId: food.id, name: food.name, preparation: food.preparation, aiGrams: null, lowConfidence: false }
      : r)));
    setChoosing(null);
  }

  // A food the AI missed (or a close food for an unmatched AI name): the user types the grams
  function addMissed(food: Food) {
    const key = rows.reduce((max, r) => Math.max(max, r.key), -1) + 1; // unique within this list
    const forUnmatched = unmatched.includes(newQuery) ? newQuery : null;
    setRows([...rows, {
      key, foodId: food.id, name: food.name, preparation: food.preparation,
      aiGrams: null, aiName: forUnmatched, lowConfidence: false, grams: '',
    }]);
    if (forUnmatched) setUnmatched(unmatched.filter((n) => n !== forUnmatched)); // handled
    setChoosing(null);
  }

  // initialQuery = what the AI saw, so the closest foods show without typing.
  // key: a new initial query starts a fresh chooser instead of keeping the old search.
  const chooser = (onPick: (food: Food) => void, idPrefix: string, initialQuery = '') => foods && (
    <div className="grid gap-3 rounded-2xl bg-surface p-4">
      <FoodChooser key={`${idPrefix}-${initialQuery}`} foods={foods} idPrefix={idPrefix} autoFocus
        initialQuery={initialQuery} onChange={(f) => { if (f) onPick(f); }} />
      <div>
        <Button variant="secondary" size="sm" onClick={() => setChoosing(null)}>Hủy</Button>
      </div>
    </div>
  );

  return (
    <div className="grid gap-4 rounded-2xl bg-bg p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium">Nhận diện ảnh: {MEAL_TYPE_LABELS[mealType].toLowerCase()}</p>
        <button type="button" onClick={onClose} aria-label="Đóng"
          className="flex size-9 cursor-pointer items-center justify-center rounded-full hover:bg-surface">
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>

      {/* capture="environment" opens the back camera on phones; the second input opens the gallery */}
      <input ref={cameraInput} type="file" accept={ACCEPT} capture="environment" className="hidden"
        onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ''; }} />
      <input ref={galleryInput} type="file" accept={ACCEPT} className="hidden"
        onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ''; }} />

      {status === 'idle' && (
        <>
          <div className="grid gap-1 text-sm text-ink-soft">
            <p className="font-medium text-ink">Cách chụp để AI đoán đúng:</p>
            <ul className="list-disc pl-5">
              <li>Chụp từ trên xuống, đủ sáng, thấy cả đĩa hoặc bát.</li>
              <li>Đừng chụp quá gần: đứng xa hơn một chút để chừa viền quanh món ăn, vì bạn sẽ cắt lại khung vuông ở bước sau.</li>
              <li>Chụp từng bữa riêng; để chảo, nồi, dụng cụ ra ngoài khung.</li>
            </ul>
            <p>AI chỉ gợi ý món và số gram, bạn kiểm tra lại trước khi lưu.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => cameraInput.current?.click()}>
              <Camera aria-hidden="true" className="size-4" /> Chụp ảnh
            </Button>
            <Button variant="secondary" onClick={() => galleryInput.current?.click()}>
              <ImageUp aria-hidden="true" className="size-4" /> Chọn ảnh có sẵn
            </Button>
          </div>
        </>
      )}

      {status === 'cropping' && preview && (
        <PhotoCropper src={preview} onConfirm={(square) => void analyze(square)}
          onUseOriginal={() => void analyzeOriginal()} onCancel={pickAgain} onLoadError={cropFailed} />
      )}

      {preview && (status === 'analyzing' || status === 'review') && (
        <div className="flex justify-center overflow-hidden rounded-2xl bg-black/5">
          {/* object-contain + auto width: the whole photo stays visible, portrait or landscape, nothing is cropped */}
          <img
            src={preview}
            alt="Ảnh bữa ăn đã chọn"
            className="h-auto max-h-80 w-auto max-w-full object-contain"
          />
        </div>
      )}

      {status === 'analyzing' && <p className="text-sm text-muted" role="status">Đang nhận diện món…</p>}

      {status === 'review' && (
        <>
          {rows.length === 0 ? (
            <p className="text-sm text-ink-soft">
              Không nhận ra món nào có trong danh sách. Bạn thử ảnh khác hoặc thêm món bên dưới.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {rows.map((row, i) => {
                const food = foodsById.get(row.foodId);
                const g = parsed[i];
                return (
                  <li key={row.key} className="grid gap-3 py-3">
                    {/* Name on the left, actions pinned to the top-right corner */}
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 font-medium">
                          <span className="truncate">{row.name}</span>
                          {row.preparation !== 'RAW' && (
                            <span className="shrink-0 rounded-full bg-lime px-2 py-0.5 text-xs font-normal">
                              {PREPARATION_LABELS[row.preparation]}
                            </span>
                          )}
                          {row.lowConfidence && (
                            <span className="shrink-0 rounded-full border border-danger px-2 py-0.5 text-xs font-normal text-danger">
                              Kiểm tra lại
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted">
                          {row.aiGrams != null
                            ? `${sameName(row.aiName, row.name) ? '' : `AI thấy “${row.aiName}” · `}ước lượng ${formatNumber(row.aiGrams)} g`
                            : row.aiName
                              ? `Đã đổi từ “${row.aiName}”`
                              : 'Bạn thêm thủ công'}
                        </p>
                      </div>
                      <div className="-mt-1 -mr-2 flex shrink-0">
                        <button type="button" onClick={() => setChoosing(choosing === row.key ? null : row.key)}
                          className={`flex size-9 cursor-pointer items-center justify-center rounded-full hover:bg-surface hover:text-ink ${
                            choosing === row.key ? 'bg-surface text-ink' : 'text-muted'}`}
                          aria-label={`Đổi ${row.name} thành món khác`} aria-expanded={choosing === row.key}
                          title="Sửa món (AI nhận sai)">
                          <Pencil aria-hidden="true" className="size-4" />
                        </button>
                        <button type="button" onClick={() => setRows(rows.filter((r) => r.key !== row.key))}
                          className="flex size-9 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-surface hover:text-danger"
                          aria-label={`Bỏ ${row.name}`} title="Bỏ món này">
                          <Trash2 aria-hidden="true" className="size-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-end gap-3">
                      <div className="w-28">
                        <FormField label="Số gram" name={`photo-grams-${row.key}`} inputMode="decimal"
                          value={row.grams}
                          onChange={(e) => setRows(rows.map((r) => (r.key === row.key ? { ...r, grams: e.target.value } : r)))}
                          error={g == null ? '0,1–5000 g' : undefined} />
                      </div>
                      <p className="pb-2.5 text-lg font-light">
                        {food && g != null ? `≈ ${formatNumber(kcalFor(food, g))}` : '—'}{' '}
                        <span className="text-sm text-muted">kcal</span>
                      </p>
                    </div>
                    {food && g != null && <MacroLine nutrition={nutritionFor(food, g)} />}
                    {food && edibleHint(food) && <p className="text-xs text-ink-soft">{edibleHint(food)}</p>}
                    {food && leanHint(food) && <p className="text-xs text-ink-soft">{leanHint(food)}</p>}

                    {choosing === row.key && chooser((f) => changeFood(row.key, f), `swap-${row.key}`, row.aiName ?? '')}
                  </li>
                );
              })}
            </ul>
          )}

          {unmatched.length > 0 && (
            <div className="grid gap-2">
              <p className="text-sm text-ink-soft">
                AI còn thấy các món chưa có trong danh sách. Bấm vào một món để chọn món gần giống:
              </p>
              <div className="flex flex-wrap gap-2">
                {unmatched.map((n) => (
                  <button key={n} type="button" disabled={!foods}
                    onClick={() => { setNewQuery(n); setChoosing('new'); }}
                    className="cursor-pointer rounded-full border border-dashed border-line bg-surface px-3 py-1.5 text-sm hover:bg-bg disabled:cursor-not-allowed">
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}

          {choosing === 'new' ? (
            chooser(addMissed, 'photo-add', newQuery)
          ) : (
            <div>
              <Button variant="secondary" size="sm" onClick={() => { setNewQuery(''); setChoosing('new'); }} disabled={!foods}>
                <Plus aria-hidden="true" className="size-4" /> Thêm món bị sót
              </Button>
            </div>
          )}

          {rows.length > 0 && (
            <div className="grid gap-1">
              <p className="text-lg">
                Tổng ≈ <span className="font-semibold">{formatNumber(total.kcal)}</span>{' '}
                <span className="text-sm text-muted">kcal (tính từ bảng dữ liệu, không phải do AI)</span>
              </p>
              <MacroLine nutrition={total} className="block text-sm text-ink-soft" />
              {incomplete && (
                <p className="text-xs text-muted">Một số món chưa đủ số liệu dinh dưỡng, tổng trên chỉ tính phần đã biết.</p>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => void handleSave()} disabled={busy || !allValid}>
              {busy ? 'Đang lưu…' : `Lưu vào ${MEAL_TYPE_LABELS[mealType].toLowerCase()}`}
            </Button>
            <Button variant="secondary" onClick={pickAgain} disabled={busy}>Chọn ảnh khác</Button>
          </div>
        </>
      )}

      {remaining != null && (
        <p className="text-xs text-muted">Còn {remaining} lượt nhận diện ảnh hôm nay.</p>
      )}
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
    </div>
  );
}
