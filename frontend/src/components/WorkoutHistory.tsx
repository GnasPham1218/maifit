import { Dumbbell, PersonStanding, Trash2, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { EXERCISE_IDS, EXERCISES, type ExerciseId } from '../exercises';
import type { WorkoutHistoryState } from '../hooks/useWorkoutHistory';
import type { Workout } from '../types/workout';
import { formatNumber } from '../utils/number';
import { Button } from './Button';
import { DaySwitch } from './meals/DaySwitch';
import { MonthCalendar } from './MonthCalendar';

const ZONE = 'Asia/Ho_Chi_Minh';
const ICONS: Record<ExerciseId, LucideIcon> = { SQUAT: PersonStanding, PUSH_UP: Dumbbell };

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: ZONE });
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m} phút ${s > 0 ? `${String(s).padStart(2, '0')} giây` : ''}`.trim() : `${s} giây`;
}

// Reps per minute, the same "pace" the server checks against
function pace(w: Workout): string {
  return formatNumber(Math.round((w.reps / w.durationSec) * 60 * 10) / 10);
}

// "Lịch sử tập": the sets of the chosen day, totals, delete with a confirmation
export function WorkoutHistoryCard({ history }: { history: WorkoutHistoryState }) {
  const { today, date, selectDate, sessions, error, remove, streakDays } = history;
  const [confirmId, setConfirmId] = useState<number | null>(null); // set waiting for "Xoá?" confirmation
  const [deleting, setDeleting] = useState(false);

  const total = (sessions ?? []).reduce((sum, s) => sum + s.reps, 0);
  const totals = EXERCISE_IDS.map((id) => ({
    id,
    reps: (sessions ?? []).filter((s) => s.exercise === id).reduce((sum, s) => sum + s.reps, 0),
  })).filter((t) => t.reps > 0);

  function changeDate(newDate: string) {
    setConfirmId(null);
    selectDate(newDate);
  }

  async function confirmRemove(id: number) {
    setDeleting(true);
    if (await remove(id)) setConfirmId(null);
    setDeleting(false);
  }

  return (
    <section className="min-w-0 rounded-card bg-surface p-5 text-ink sm:p-6" aria-labelledby="history-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id="history-title" className="text-lg font-semibold">Lịch sử tập</h3>
        <DaySwitch date={date} today={today} onChange={changeDate} />
      </div>

      {error && <p className="mt-3 text-sm text-danger" role="alert">{error}</p>}

      {sessions === null ? (
        <p className="mt-4 text-sm text-muted">Đang tải…</p>
      ) : sessions.length === 0 ? (
        <div className="grid justify-items-start gap-2 pt-5 pb-1">
          <p className="font-semibold">Chưa có set nào trong ngày này</p>
          <p className="text-sm text-muted">Bật camera và lưu một set: số rep sẽ vào đây và vào bảng xếp hạng.</p>
        </div>
      ) : (
        <>
          <div className="mt-4 mb-1.5 flex flex-wrap items-end justify-between gap-3">
            <p className="flex items-baseline gap-2.5">
              <span className="font-display text-5xl leading-none font-semibold tabular-nums">{formatNumber(total)}</span>
              <span className="text-muted">rep · {sessions.length} set</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {totals.map((t) => (
                <span key={t.id} className="rounded-full bg-soft px-3 py-1 text-sm font-semibold text-link">
                  {EXERCISES[t.id].label} {formatNumber(t.reps)} rep
                </span>
              ))}
            </div>
          </div>

          <ol className="mt-2">
            {[...sessions].reverse().map((w) => {
              const Icon = ICONS[w.exercise];
              const time = formatTime(w.startedAt);
              const confirming = confirmId === w.id;
              return (
                <li key={w.id} className="border-t border-line py-3.5">
                  <div className="flex items-center gap-3.5">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-soft text-link">
                      <Icon aria-hidden="true" className="size-5" />
                    </span>
                    <span className="grid min-w-0 flex-1 gap-0.5">
                      <span className="font-semibold">{EXERCISES[w.exercise].label}</span>
                      <span className="text-sm text-muted">{time} · {formatDuration(w.durationSec)} · {pace(w)} rep/phút</span>
                    </span>
                    <span className="flex items-baseline gap-1">
                      <span className="font-display text-3xl leading-none font-semibold tabular-nums">{w.reps}</span>
                      <span className="text-xs text-muted">rep</span>
                    </span>
                    {!confirming && (
                      <button type="button" onClick={() => setConfirmId(w.id)}
                        className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-soft hover:text-danger"
                        aria-label={`Xoá set ${w.reps} rep lúc ${time}`}>
                        <Trash2 aria-hidden="true" className="size-[18px]" />
                      </button>
                    )}
                  </div>
                  {confirming && (
                    <div className="mt-3 flex flex-wrap items-center gap-2.5 rounded-[14px] bg-danger-bg px-3.5 py-3">
                      <span className="flex-[1_1_200px] text-sm text-danger">Xoá set này? Bảng xếp hạng cũng bị trừ {w.reps} rep.</span>
                      <Button size="sm" variant="secondary" className="text-danger" disabled={deleting} onClick={() => void confirmRemove(w.id)}>
                        <Trash2 aria-hidden="true" className="size-4" /> {deleting ? 'Đang xoá…' : 'Xoá'}
                      </Button>
                      <Button size="sm" variant="secondary" disabled={deleting} onClick={() => setConfirmId(null)}>Huỷ</Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </>
      )}
      {streakDays > 0 && <p className="mt-3 text-xs text-muted">Chuỗi ngày tập: {streakDays} ngày</p>}
    </section>
  );
}

// Month calendar in the side column, like the meals page: a day with reps can be opened
export function WorkoutCalendarCard({ history }: { history: WorkoutHistoryState }) {
  const { today, date, viewMonth, setViewMonth, selectDate, repsByDate } = history;
  return (
    <div className="min-w-0 rounded-card bg-surface p-5 text-ink sm:p-6">
      <MonthCalendar month={viewMonth} valueByDate={repsByDate} unit="rep" emptyLabel="chưa tập"
        footnote="Ngày có số là ngày có tập, bấm để xem các set." selectedDate={date} today={today}
        onSelectDate={selectDate} onChangeMonth={setViewMonth} />
    </div>
  );
}
