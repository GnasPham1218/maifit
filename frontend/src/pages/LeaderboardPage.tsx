import { Flame, Info } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { workoutApi } from '../apis/workoutApi';
import { Alert } from '../components/Alert';
import { Chip } from '../components/Chip';
import { StreakWeekCard } from '../components/home/StreakWeekCard';
import { getErrorMessage } from '../constants/errorMessages';
import { EXERCISE_IDS, EXERCISES, type ExerciseId } from '../exercises';
import type { Leaderboard, LeaderboardEntry, LeaderboardPeriod, MonthlyWorkoutSummary } from '../types/workout';
import { todayVn } from '../utils/date';
import { activeDays, monthsOf, weekDays } from '../utils/week';

const PERIODS: { id: LeaderboardPeriod; label: string; mine: string }[] = [
  { id: 'DAY', label: 'Hôm nay', mine: 'hôm nay' },
  { id: 'WEEK', label: 'Tuần này', mine: 'tuần này' },
  { id: 'MONTH', label: 'Tháng này', mine: 'tháng này' },
];

// 2026-11-02 -> 2/11 (the window is shown as "2/11 đến 8/11")
const shortDate = (date: string) => {
  const [, m, d] = date.split('-');
  return `${Number(d)}/${Number(m)}`;
};

function Row({ entry }: { entry: LeaderboardEntry }) {
  return (
    <li className={`flex items-center gap-3.5 rounded-2xl px-3.5 py-3 ${entry.me ? 'bg-soft' : ''}`}
      aria-current={entry.me ? 'true' : undefined}>
      <span className={`w-8 shrink-0 text-center font-display text-2xl font-bold tabular-nums ${
        entry.me ? 'text-link' : entry.rank <= 3 ? 'text-accent' : 'text-muted'}`}>
        {entry.rank}
      </span>
      <span className={`min-w-0 flex-1 truncate ${entry.me ? 'font-semibold' : 'font-medium'}`}>
        {entry.displayName}
        {entry.me && <span className="ml-1.5 font-normal text-muted">(bạn)</span>}
      </span>
      <span className="shrink-0 font-display text-2xl font-semibold tabular-nums">
        {entry.reps} <span className="font-sans text-xs font-normal text-muted">rep</span>
      </span>
    </li>
  );
}

// Reps still needed to pass the person just above (equal totals share a rank, so "pass" = one more)
function gapToNext(board: Leaderboard): { rank: number; reps: number } | null {
  if (!board.me || board.me.rank === 1) return null;
  const above = board.top.filter((e) => e.rank < board.me!.rank).at(-1);
  return above ? { rank: above.rank, reps: above.reps - board.me.reps + 1 } : null;
}

// Total reps per exercise for today / this week (from Monday) / this month, Vietnam time.
// Only display names are shown, never emails.
export default function LeaderboardPage() {
  const [exercise, setExercise] = useState<ExerciseId>('PUSH_UP');
  const [period, setPeriod] = useState<LeaderboardPeriod>('WEEK');
  const [board, setBoard] = useState<Leaderboard | null>(null);
  const [summaries, setSummaries] = useState<MonthlyWorkoutSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [today] = useState(todayVn);
  const days = weekDays(today);

  useEffect(() => {
    let ignore = false;
    workoutApi
      .leaderboard(exercise, period)
      .then((data) => {
        if (!ignore) {
          setBoard(data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!ignore) setError(getErrorMessage(err));
      });
    return () => {
      ignore = true;
    };
  }, [exercise, period]);

  // The days of this week with a set, for the streak card (optional: a failure only hides the dots)
  useEffect(() => {
    let ignore = false;
    Promise.all(monthsOf(weekDays(today)).map((m) => workoutApi.monthSummary(m)))
      .then((list) => {
        if (!ignore) setSummaries(list);
      })
      .catch(() => {
        if (!ignore) setSummaries([]);
      });
    return () => {
      ignore = true;
    };
  }, [today]);

  const loading = board?.exercise !== exercise || board?.period !== period;
  const meInTop = board?.top.some((e) => e.me) ?? false;
  const gap = board ? gapToNext(board) : null;
  const periodWord = PERIODS.find((p) => p.id === period)!.mine;

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <section aria-label="Bảng xếp hạng" className="min-w-0 rounded-card bg-surface p-5 sm:p-6">
        {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div role="group" aria-label="Bài tập" className="flex flex-wrap gap-2">
            {EXERCISE_IDS.map((id) => (
              <Chip key={id} selected={id === exercise} onClick={() => setExercise(id)}>{EXERCISES[id].label}</Chip>
            ))}
          </div>
          <div role="group" aria-label="Khoảng thời gian" className="flex flex-wrap gap-2">
            {PERIODS.map((p) => (
              <Chip key={p.id} selected={p.id === period} onClick={() => setPeriod(p.id)}>{p.label}</Chip>
            ))}
          </div>
        </div>

        <div className={loading ? 'opacity-60' : ''} aria-busy={loading}>
          {board && (
            <p className="mb-2 text-sm text-muted">
              {EXERCISES[board.exercise].label},{' '}
              {board.from === board.to ? shortDate(board.from) : `${shortDate(board.from)} đến ${shortDate(board.to)}`}
            </p>
          )}
          {!board ? (
            !error && <p className="text-muted">Đang tải…</p>
          ) : board.top.length === 0 ? (
            <p className="py-4 text-muted">
              Chưa ai lưu set nào trong khoảng này. <Link to="/workout">Tập ngay</Link> để đứng đầu bảng.
            </p>
          ) : (
            <ol className="grid gap-0.5">
              {board.top.map((entry) => <Row key={`${entry.rank}-${entry.displayName}-${entry.me}`} entry={entry} />)}
            </ol>
          )}
          {/* Outside the top 20: still show where you are */}
          {board?.me && !meInTop && (
            <ol className="mt-3 border-t border-line pt-3">
              <Row entry={board.me} />
            </ol>
          )}
        </div>
      </section>

      <div className="grid min-w-0 gap-5">
        <section aria-label="Hạng của bạn" className="rounded-card bg-hero p-6 text-hero-ink">
          <p className="text-sm text-hero-muted">Hạng của bạn {periodWord}</p>
          {board?.me ? (
            <>
              <p className="mt-1.5 flex items-baseline gap-3">
                <span className="font-display text-7xl leading-none font-bold">#{board.me.rank}</span>
                <span className="text-hero-muted">{board.me.reps} rep</span>
              </p>
              <p className="mt-3 text-sm text-hero-muted">
                {gap ? `Thêm ${gap.reps} rep để vượt hạng ${gap.rank}.` : 'Bạn đang đứng đầu bảng.'}
              </p>
            </>
          ) : (
            <p className="mt-2 text-hero-muted">
              {board ? `Lưu một set ${EXERCISES[exercise].label.toLowerCase()} ${periodWord} để có tên trên bảng.` : '—'}
            </p>
          )}
        </section>

        {board && summaries && (
          <StreakWeekCard streakDays={board.streakDays} days={days} active={activeDays(days, summaries)} today={today} />
        )}

        <section className="grid gap-2 rounded-card bg-surface p-6 text-sm text-muted">
          <p className="flex items-start gap-2">
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" /> Xếp theo tổng rep đã lưu. Bằng nhau thì cùng hạng.
          </p>
          <p className="flex items-start gap-2">
            <Flame aria-hidden="true" className="mt-0.5 size-4 shrink-0" /> Máy chủ kiểm tra lại từng set trước khi tính.
          </p>
        </section>
      </div>
    </div>
  );
}
