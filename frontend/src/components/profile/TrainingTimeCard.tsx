import { useEffect, useState } from 'react';
import { workoutApi } from '../../apis/workoutApi';
import type { TimeBucket, WorkoutTimeSummary } from '../../types/workout';
import { dayLabel, formatTrainingTime, monthLabel, weekLabel } from '../../utils/workoutTime';

type Period = 'day' | 'week' | 'month';

const PERIODS: { id: Period; label: string }[] = [
  { id: 'day', label: 'Ngày' },
  { id: 'week', label: 'Tuần' },
  { id: 'month', label: 'Tháng' },
];

// What each period shows: its total, the sub line, and the bars to compare with the periods before
function view(summary: WorkoutTimeSummary, period: Period) {
  switch (period) {
    case 'day':
      return {
        total: summary.today,
        sub: summary.today.sets > 0 ? `hôm nay, ${summary.today.sets} set` : 'hôm nay chưa tập',
        bars: summary.days.map((b) => ({ ...b, label: dayLabel(b.start) })),
      };
    case 'week':
      return {
        total: summary.thisWeek,
        sub: `tuần này, ${summary.thisWeek.days} buổi`,
        bars: summary.weeks.map((b, i, all) => ({ ...b, label: i === all.length - 1 ? 'Nay' : weekLabel(b.start) })),
      };
    case 'month':
      return {
        total: summary.thisMonth,
        sub: `tháng này, ${summary.thisMonth.days} buổi`,
        bars: summary.months.map((b) => ({ ...b, label: monthLabel(b.start) })),
      };
  }
}

// "Thời gian tập": the sum of the saved sets' durations (from "in position" to the last rep)
export function TrainingTimeCard({ refreshKey }: { refreshKey?: number }) {
  const [summary, setSummary] = useState<WorkoutTimeSummary | null>(null);
  const [failed, setFailed] = useState(false);
  const [period, setPeriod] = useState<Period>('week');

  useEffect(() => {
    let ignore = false;
    workoutApi
      .timeSummary()
      .then((data) => {
        if (!ignore) setSummary(data);
      })
      .catch(() => {
        if (!ignore) setFailed(true);
      });
    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  const current = summary ? view(summary, period) : null;
  const time = current ? formatTrainingTime(current.total.seconds) : null;

  return (
    <section className="grid min-w-0 content-start gap-3.5 rounded-card bg-surface p-5 text-ink md:p-6" aria-labelledby="time-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="time-title" className="text-sm text-muted">Thời gian tập</h2>
        <div role="group" aria-label="Khoảng thời gian" className="flex w-full max-w-56 gap-0.5 rounded-full bg-ground p-[3px] sm:w-56">
          {PERIODS.map((p) => (
            <button key={p.id} type="button" aria-pressed={period === p.id} onClick={() => setPeriod(p.id)}
              className={`min-h-7 flex-1 cursor-pointer rounded-full px-2 text-xs font-semibold transition-colors
                focus-visible:outline-2 focus-visible:outline-accent ${
                period === p.id ? 'bg-accent text-on-accent' : 'text-muted hover:text-ink'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {current && time ? (
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="grid gap-1.5">
            <p className="flex items-baseline gap-2" aria-live="polite">
              <span className="font-display text-5xl leading-none font-bold tabular-nums">{time.value}</span>
              <span className="font-display text-2xl font-bold">{time.unit}</span>
            </p>
            <p className="text-sm text-muted">{current.sub}</p>
          </div>
          <Bars bars={current.bars} />
        </div>
      ) : (
        <p className="py-4 text-sm text-muted">{failed ? 'Chưa tải được thời gian tập.' : 'Đang tải…'}</p>
      )}
    </section>
  );
}

// The current period is the last bar, in the accent color; the others are grey for comparison
function Bars({ bars }: { bars: (TimeBucket & { label: string })[] }) {
  const max = Math.max(...bars.map((b) => b.seconds), 1);
  const summary = bars.map((b) => {
    const t = formatTrainingTime(b.seconds);
    return `${b.label}: ${t.value} ${t.unit}`;
  }).join(', ');
  return (
    <div role="img" aria-label={`Các kỳ gần đây: ${summary}`} className="flex h-24 w-full max-w-72 items-end gap-2 sm:w-72">
      {bars.map((b, i) => {
        const last = i === bars.length - 1;
        const t = formatTrainingTime(b.seconds);
        return (
          <div key={b.start} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5" title={`${b.label}: ${t.value} ${t.unit}`}>
            <div className={`w-full max-w-7 rounded-md ${last ? 'bg-accent' : 'bg-line'}`}
              style={{ height: `${Math.max(4, (b.seconds / max) * 72)}px` }} />
            <span className={`text-[11px] leading-none ${last ? 'font-semibold text-ink' : 'text-muted'}`}>{b.label}</span>
          </div>
        );
      })}
    </div>
  );
}
