import { ArrowDown, ArrowUp, Minus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { bodyCheckinApi } from '../apis/profileApi';
import { getErrorMessage, getFieldErrors } from '../constants/errorMessages';
import type { BodyCheckin } from '../types/profile';
import { optionalNumber } from '../utils/number';
import { Alert } from './Alert';
import { FormField } from './FormField';
import { Button } from './Button';
import { Card } from './Card';

interface Props {
  onChanged: () => void; // the profile reloads: a new latest weight changes TDEE
}

const EMPTY_FORM = { weightKg: '', bodyFatPct: '', waistCm: '', note: '' };

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// 70.5 -> "70,5" (Vietnamese decimal comma); also hides float noise like 0.30000000000000004
function formatNumber(n: number): string {
  return n.toLocaleString('vi-VN', { maximumFractionDigits: 1 });
}

function formatDelta(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  return `${rounded > 0 ? '+' : ''}${formatNumber(rounded)}`;
}

// Neutral colors on purpose: losing or gaining is "good" depending on the user's goal
function DeltaChip({ delta }: { delta: number }) {
  const rounded = Math.round(delta * 10) / 10;
  const Icon = rounded > 0 ? ArrowUp : rounded < 0 ? ArrowDown : Minus;
  return (
    <span className="hidden items-center gap-1 rounded-full bg-bg px-2.5 py-1 text-xs font-medium text-ink-soft sm:inline-flex">
      <Icon aria-hidden="true" className="size-3" />
      {formatNumber(Math.abs(rounded))} kg
    </span>
  );
}

export function BodyCheckinSection({ onChanged }: Props) {
  const [items, setItems] = useState<BodyCheckin[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // First load. setState only inside .then(): never synchronously in the effect body
  // (react-hooks/set-state-in-effect). `ignore` drops a late response after unmount.
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

  // Reload after create / delete: called from event handlers, where setState is fine
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
      await load();
      onChanged();
    } catch (err) {
      setError(getErrorMessage(err));
      setFieldErrors(getFieldErrors(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm('Xóa lần ghi này?')) return;
    try {
      await bodyCheckinApi.remove(id);
      await load();
      onChanged();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  // Newest first in the list (the API returns oldest first, ready for a chart)
  const newestFirst = [...items].reverse();
  const change = items.length >= 2 ? items[items.length - 1].weightKg - items[0].weightKg : null;

  return (
    <Card title="Cân nặng & số đo">
      {error && <Alert type="error">{error}</Alert>}
      <form
        className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] items-end gap-3.5"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit();
        }}
      >
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
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Đang lưu…' : 'Ghi lại'}
        </Button>
      </form>

      {newestFirst.length === 0 ? (
        <p className="mt-5 text-sm text-muted">Chưa có lần ghi nào trong 90 ngày qua.</p>
      ) : (
        <>
          {change != null && (
            <p className="mt-6 text-sm text-muted">
              Thay đổi trong 90 ngày:{' '}
              <span className="rounded-full bg-sky px-3 py-1 font-medium text-ink">{formatDelta(change)} kg</span>
            </p>
          )}
          {/* History list: newest first, each row shows the change vs the previous check-in */}
          <ul className="mt-4 divide-y divide-line">
            {newestFirst.map((c, i) => {
              const older = newestFirst[i + 1];
              const delta = older ? c.weightKg - older.weightKg : null;
              const extras = [
                c.bodyFatPct != null ? `Mỡ ${formatNumber(c.bodyFatPct)}%` : null,
                c.waistCm != null ? `Eo ${formatNumber(c.waistCm)} cm` : null,
                c.note,
              ].filter(Boolean);
              return (
                <li key={c.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{formatTime(c.checkedAt)}</p>
                    {extras.length > 0 && <p className="truncate text-sm text-muted">{extras.join(' · ')}</p>}
                  </div>
                  {delta != null && <DeltaChip delta={delta} />}
                  <span className="w-24 text-right text-xl font-light">
                    {formatNumber(c.weightKg)} <span className="text-sm text-muted">kg</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleDelete(c.id)}
                    className="flex size-9 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-bg hover:text-danger"
                    aria-label={`Xóa lần ghi ${formatTime(c.checkedAt)}`}
                    title="Xóa"
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Card>
  );
}
