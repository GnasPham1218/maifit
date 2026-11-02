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
  return new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
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

  return (
    <Card title="Cân nặng & số đo">
      {error && <Alert type="error">{error}</Alert>}
      <form
        className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] items-end gap-3.5"
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
        <p className="text-sm text-muted">Chưa có lần ghi nào trong 90 ngày qua.</p>
      ) : (
        <table className="mt-4 w-full border-collapse text-sm [&_td]:border-b [&_td]:border-line [&_td]:p-2 [&_th]:border-b [&_th]:border-line [&_th]:p-2 [&_th]:text-left">
          <thead>
            <tr>
              <th>Thời gian</th>
              <th>Cân nặng</th>
              <th>% mỡ</th>
              <th>Vòng eo</th>
              <th>Ghi chú</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {newestFirst.map((c) => (
              <tr key={c.id}>
                <td>{formatTime(c.checkedAt)}</td>
                <td>{c.weightKg} kg</td>
                <td>{c.bodyFatPct ?? '—'}</td>
                <td>{c.waistCm != null ? `${c.waistCm} cm` : '—'}</td>
                <td>{c.note ?? ''}</td>
                <td>
                  <Button type="button" variant="secondary" size="sm" onClick={() => void handleDelete(c.id)}>
                    Xóa
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
