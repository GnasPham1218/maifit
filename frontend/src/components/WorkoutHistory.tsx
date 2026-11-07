import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { workoutApi } from '../apis/workoutApi';
import { getErrorMessage } from '../constants/errorMessages';
import { EXERCISE_IDS, EXERCISES } from '../exercises';
import type { DailyWorkouts, MonthlyWorkoutSummary, Workout } from '../types/workout';
import { addDays, formatDayLabel, monthOf, todayVn } from '../utils/date';
import { formatNumber } from '../utils/number';
import { Button } from './Button';
import { MonthCalendar } from './MonthCalendar';

interface Props {
  refreshKey: number; // bumped by the page after a set is saved, so the history reloads
}

const ZONE = 'Asia/Ho_Chi_Minh';
const NAV_BUTTON =
  'flex size-9 cursor-pointer items-center justify-center rounded-full hover:bg-bg disabled:cursor-not-allowed disabled:opacity-40';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: ZONE });
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m} phút ${s > 0 ? `${s} giây` : ''}`.trim() : `${s} giây`;
}

// Reps per minute, the same "pace" the server checks against
function pace(w: Workout): string {
  return formatNumber(Math.round((w.reps / w.durationSec) * 60 * 10) / 10);
}

// Workout history under the camera: month calendar (reps per day) + the sets of the chosen day.
// The server is the source of truth: after a delete, day and month are fetched again.
export function WorkoutHistory({ refreshKey }: Props) {
  const today = todayVn();
  const [date, setDate] = useState(today);
  const [viewMonth, setViewMonth] = useState(monthOf(today));
  const [day, setDay] = useState<DailyWorkouts | null>(null);
  const [summary, setSummary] = useState<MonthlyWorkoutSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null); // set waiting for "Xóa?" confirmation
  const [deleting, setDeleting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0); // bumped after a delete

  // setState only inside .then(): the effects re-run when the day, month, or a refresh key changes
  useEffect(() => {
    let ignore = false;
    workoutApi
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
  }, [date, refreshKey, reloadKey]);

  useEffect(() => {
    let ignore = false;
    workoutApi
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
  }, [viewMonth, refreshKey, reloadKey]);

  // Calendar shows total reps of all exercises per day
  const repsByDate = useMemo(() => {
    const map = new Map<string, number>();
    if (summary?.month === viewMonth) {
      for (const d of summary.days) map.set(d.date, (map.get(d.date) ?? 0) + d.reps);
    }
    return map;
  }, [summary, viewMonth]);

  const sessions = day?.date === date ? day.sessions : null;
  const totals = EXERCISE_IDS.map((id) => ({
    id,
    reps: (sessions ?? []).filter((s) => s.exercise === id).reduce((sum, s) => sum + s.reps, 0),
  })).filter((t) => t.reps > 0);

  function selectDate(newDate: string) {
    setDate(newDate);
    setViewMonth(monthOf(newDate));
    setConfirmId(null);
    setError(null);
  }

  async function remove(id: number) {
    setDeleting(true);
    setError(null);
    try {
      await workoutApi.remove(id);
      setConfirmId(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <MonthCalendar month={viewMonth} valueByDate={repsByDate} unit="rep" emptyLabel="chưa tập"
        selectedDate={date} today={today} onSelectDate={selectDate} onChangeMonth={setViewMonth} />

      <div className="min-w-0">
        <div className="mb-3 flex items-center justify-between">
          <button type="button" className={NAV_BUTTON} onClick={() => selectDate(addDays(date, -1))} aria-label="Ngày trước">
            <ChevronLeft aria-hidden="true" className="size-4" />
          </button>
          <p className="font-semibold first-letter:uppercase">{formatDayLabel(date)}</p>
          <button type="button" className={NAV_BUTTON} onClick={() => selectDate(addDays(date, 1))}
            disabled={date >= today} aria-label="Ngày sau">
            <ChevronRight aria-hidden="true" className="size-4" />
          </button>
        </div>

        {error && <p className="mb-2 text-sm text-danger" role="alert">{error}</p>}

        {sessions === null ? (
          <p className="text-sm text-muted">Đang tải…</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-muted">Chưa có set nào trong ngày này.</p>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap gap-2">
              {totals.map((t) => (
                <span key={t.id} className="rounded-full bg-lime px-3 py-1 text-sm font-medium">
                  {EXERCISES[t.id].label}: {formatNumber(t.reps)} rep
                </span>
              ))}
            </div>
            <ul className="grid max-h-80 gap-2 overflow-y-auto">
              {[...sessions].reverse().map((w) => (
                <li key={w.id} className="rounded-2xl bg-bg px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {formatTime(w.startedAt)} · {EXERCISES[w.exercise].label} · {w.reps} rep
                      </p>
                      <p className="text-xs text-muted">
                        {formatDuration(w.durationSec)} · {pace(w)} rep/phút
                      </p>
                    </div>
                    {confirmId !== w.id && (
                      <button type="button" onClick={() => setConfirmId(w.id)}
                        className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-line hover:text-danger"
                        aria-label={`Xóa set ${w.reps} rep lúc ${formatTime(w.startedAt)}`}>
                        <Trash2 aria-hidden="true" className="size-4" />
                      </button>
                    )}
                  </div>
                  {confirmId === w.id && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="text-danger">Xóa set này? Bảng xếp hạng cũng bị trừ.</span>
                      <Button size="sm" disabled={deleting} onClick={() => void remove(w.id)}>
                        {deleting ? 'Đang xóa…' : 'Xóa'}
                      </Button>
                      <Button size="sm" variant="secondary" disabled={deleting} onClick={() => setConfirmId(null)}>
                        Hủy
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
        {day && day.streakDays > 0 && (
          <p className="mt-3 text-xs text-muted">Chuỗi ngày tập: {day.streakDays} ngày</p>
        )}
      </div>
    </div>
  );
}
