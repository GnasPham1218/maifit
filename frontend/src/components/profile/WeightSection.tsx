import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { bodyCheckinApi } from '../../apis/profileApi';
import { getErrorMessage, getFieldErrors } from '../../constants/errorMessages';
import type { BodyCheckin } from '../../types/profile';
import { formatNumber, optionalNumber } from '../../utils/number';
import { Alert } from '../Alert';
import { Button } from '../Button';
import { FormField } from '../FormField';
import { Modal } from '../Modal';
import { WeightSparkline } from '../WeightSparkline';
import { ProfileSection } from './ProfileSection';

const EMPTY_FORM = { weightKg: '', bodyFatPct: '', waistCm: '', note: '' };
const DAYS_30_MS = 30 * 86_400_000;

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// "giảm 0,5 kg" / "tăng 1,2 kg" / "không đổi": neutral words, losing or gaining is good depending on the goal
function changeText(delta: number): string {
  const rounded = Math.round(delta * 10) / 10;
  if (rounded === 0) return 'không đổi';
  return `${rounded < 0 ? 'giảm' : 'tăng'} ${formatNumber(Math.abs(rounded))} kg`;
}

// Weight over 30 days + "Ghi cân nặng" (a dialog). The API returns 90 days, oldest first.
export function WeightSection({ onChanged }: { onChanged: () => void }) {
  const [items, setItems] = useState<BodyCheckin[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [adding, setAdding] = useState(false);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    let ignore = false;
    bodyCheckinApi
      .list()
      .then((data) => {
        if (!ignore) setItems(data);
      })
      .catch((err: unknown) => {
        if (!ignore) setError(getErrorMessage(err));
      });
    return () => {
      ignore = true;
    };
  }, []);

  async function load() {
    try {
      setItems(await bodyCheckinApi.list());
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleSubmit() {
    setError(null);
    setFieldErrors({});
    setSubmitting(true);
    try {
      await bodyCheckinApi.create({
        weightKg: Number(form.weightKg),
        bodyFatPct: optionalNumber(form.bodyFatPct),
        waistCm: optionalNumber(form.waistCm),
        note: form.note.trim() || null,
      });
      setForm(EMPTY_FORM);
      setAdding(false);
      await load();
      onChanged(); // a new latest weight changes BMR / TDEE
    } catch (err) {
      setError(getErrorMessage(err));
      setFieldErrors(getFieldErrors(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await bodyCheckinApi.remove(id);
      setConfirmId(null);
      await load();
      onChanged();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  const recent = items.filter((c) => now - new Date(c.checkedAt).getTime() <= DAYS_30_MS);
  const latest = items.at(-1);
  const change = recent.length >= 2 ? recent[recent.length - 1].weightKg - recent[0].weightKg : null;
  const newestFirst = [...items].reverse();

  const addButton = (
    <Button variant="secondary" size="sm" onClick={() => { setError(null); setAdding(true); }}>
      <Plus aria-hidden="true" className="size-4" /> Ghi cân nặng
    </Button>
  );

  return (
    <ProfileSection title="Cân nặng 30 ngày" mobileTitle="Cân nặng và số đo" action={addButton}>
      {error && !adding && <Alert type="error">{error}</Alert>}
      {latest ? (
        <>
          <p className="flex flex-wrap items-baseline gap-2.5">
            <span className="font-display text-5xl leading-none font-bold tabular-nums">{formatNumber(latest.weightKg)}</span>
            <span className="text-muted">kg{change != null && `, ${changeText(change)} trong 30 ngày`}</span>
          </p>
          <div className="mt-4"><WeightSparkline checkins={recent} /></div>

          <details className="mt-4 border-t border-line pt-3">
            <summary className="cursor-pointer text-sm text-muted">Lịch sử ({items.length} lần ghi trong 90 ngày)</summary>
            <ul className="scroll-soft mt-2 max-h-72 divide-y divide-line overflow-y-auto">
              {newestFirst.map((c) => {
                const extras = [
                  c.bodyFatPct != null ? `Mỡ ${formatNumber(c.bodyFatPct)}%` : null,
                  c.waistCm != null ? `Eo ${formatNumber(c.waistCm)} cm` : null,
                  c.note,
                ].filter(Boolean);
                return (
                  <li key={c.id} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{formatTime(c.checkedAt)}</p>
                      {extras.length > 0 && <p className="truncate text-xs text-muted">{extras.join(' · ')}</p>}
                    </div>
                    <span className="font-semibold tabular-nums">{formatNumber(c.weightKg)} <span className="text-xs font-normal text-muted">kg</span></span>
                    {confirmId === c.id ? (
                      <span className="flex items-center gap-2 text-sm">
                        <button type="button" className="cursor-pointer font-semibold text-danger" onClick={() => void handleDelete(c.id)}>Xoá</button>
                        <button type="button" className="cursor-pointer text-muted" onClick={() => setConfirmId(null)}>Huỷ</button>
                      </span>
                    ) : (
                      <button type="button" onClick={() => setConfirmId(c.id)}
                        className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-soft hover:text-danger"
                        aria-label={`Xoá lần ghi ${formatTime(c.checkedAt)}`}>
                        <Trash2 aria-hidden="true" className="size-4" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </details>
        </>
      ) : (
        <p className="text-sm text-muted">Chưa có lần ghi nào. Ghi cân nặng để MAIFit tính calo chính xác hơn và vẽ xu hướng.</p>
      )}

      <Modal open={adding} onClose={() => setAdding(false)} title="Ghi cân nặng" closeOnBackdrop={false}>
        {error && <div className="mb-3"><Alert type="error">{error}</Alert></div>}
        <form className="grid gap-3.5 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); void handleSubmit(); }}>
          <FormField label="Cân nặng (kg)" name="weightKg" type="number" step="0.1" min="20" max="400" required
            value={form.weightKg} error={fieldErrors.weightKg}
            onChange={(e) => setForm({ ...form, weightKg: e.target.value })} />
          <FormField label="% mỡ (không bắt buộc)" name="bodyFatPct" type="number" step="0.1" min="2" max="75"
            value={form.bodyFatPct} error={fieldErrors.bodyFatPct}
            onChange={(e) => setForm({ ...form, bodyFatPct: e.target.value })} />
          <FormField label="Vòng eo cm (không bắt buộc)" name="waistCm" type="number" step="0.1" min="30" max="250"
            value={form.waistCm} error={fieldErrors.waistCm}
            onChange={(e) => setForm({ ...form, waistCm: e.target.value })} />
          <FormField label="Ghi chú" name="note" maxLength={500}
            value={form.note} error={fieldErrors.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })} />
          <Button type="submit" className="sm:col-span-2" disabled={submitting}>{submitting ? 'Đang lưu…' : 'Ghi lại'}</Button>
        </form>
      </Modal>
    </ProfileSection>
  );
}
