import { Flame, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { workoutApi } from '../apis/workoutApi';
import { Alert } from '../components/Alert';
import { Card } from '../components/Card';
import { StatTile } from '../components/StatTile';
import { getErrorMessage } from '../constants/errorMessages';
import { EXERCISE_IDS, EXERCISES, type ExerciseId } from '../exercises';
import type { Leaderboard, LeaderboardEntry, LeaderboardPeriod } from '../types/workout';

const PERIODS: { id: LeaderboardPeriod; label: string }[] = [
  { id: 'DAY', label: 'Hôm nay' },
  { id: 'WEEK', label: 'Tuần này' },
  { id: 'MONTH', label: 'Tháng này' },
];

const tab = (active: boolean) =>
  `cursor-pointer rounded-full px-4 py-2 text-sm font-medium ${active ? 'bg-ink text-white' : 'bg-bg text-ink hover:bg-line'}`;

// 2026-11-02 -> 2/11 (the window is shown as "2/11 – 8/11")
const shortDate = (date: string) => {
  const [, m, d] = date.split('-');
  return `${Number(d)}/${Number(m)}`;
};

function Row({ entry }: { entry: LeaderboardEntry }) {
  return (
    <li className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ${entry.me ? 'bg-lime' : ''}`}>
      <span className={`w-8 shrink-0 text-center font-semibold tabular-nums ${entry.rank <= 3 ? 'text-peach-strong' : 'text-muted'}`}>
        {entry.rank}
      </span>
      <span className="min-w-0 flex-1 truncate font-medium">
        {entry.displayName}
        {entry.me && <span className="ml-2 text-sm font-normal text-ink-soft">(bạn)</span>}
      </span>
      <span className="shrink-0 text-lg font-light tabular-nums">
        {entry.reps} <span className="text-sm text-muted">rep</span>
      </span>
    </li>
  );
}

// Total reps per exercise for today / this week (from Monday) / this month, Vietnam time.
// Only display names are shown, never emails.
export default function LeaderboardPage() {
  const [exercise, setExercise] = useState<ExerciseId>('PUSH_UP');
  const [period, setPeriod] = useState<LeaderboardPeriod>('WEEK');
  const [board, setBoard] = useState<Leaderboard | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const loading = board?.exercise !== exercise || board?.period !== period;
  const meInTop = board?.top.some((e) => e.me) ?? false;

  return (
    <div className="grid items-start gap-5 lg:grid-cols-3">
      <div className="grid min-w-0 gap-5 lg:col-span-2">
        {error && <Alert type="error">{error}</Alert>}

        <Card>
          <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Bài tập">
            {EXERCISE_IDS.map((id) => (
              <button key={id} type="button" role="tab" aria-selected={id === exercise}
                onClick={() => setExercise(id)} className={tab(id === exercise)}>
                {EXERCISES[id].label}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label="Khoảng thời gian">
            {PERIODS.map((p) => (
              <button key={p.id} type="button" role="tab" aria-selected={p.id === period}
                onClick={() => setPeriod(p.id)} className={tab(p.id === period)}>
                {p.label}
              </button>
            ))}
          </div>

          <div className={`mt-5 ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
            {board && (
              <p className="mb-3 text-sm text-muted">
                {EXERCISES[board.exercise].label} ·{' '}
                {board.from === board.to ? shortDate(board.from) : `${shortDate(board.from)} – ${shortDate(board.to)}`}
              </p>
            )}
            {!board ? (
              !error && <p className="text-muted">Đang tải…</p>
            ) : board.top.length === 0 ? (
              <p className="text-ink-soft">
                Chưa ai lưu set nào trong khoảng này. <Link to="/workout">Tập ngay</Link> để đứng đầu bảng.
              </p>
            ) : (
              <ol className="grid gap-1">
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
        </Card>
      </div>

      <div className="grid min-w-0 gap-5">
        <StatTile tone="peach" label="Chuỗi ngày tập" value={board?.streakDays ?? '—'} unit="ngày liên tiếp"
          hint="Tính cả hôm nay; chưa tập hôm nay thì chuỗi vẫn giữ tới hết ngày" />
        <StatTile tone="lime" label="Hạng của bạn" value={board?.me ? `#${board.me.rank}` : '—'}
          unit={board?.me ? `${board.me.reps} rep` : undefined}
          hint={board && !board.me ? 'Lưu một set trong khoảng này để có hạng' : undefined} />
        <Card>
          <p className="flex items-center gap-2 text-sm text-ink-soft">
            <Trophy aria-hidden="true" className="size-4" /> Xếp theo tổng số rep đã lưu. Bằng nhau thì cùng hạng.
          </p>
          <p className="mt-2 flex items-center gap-2 text-sm text-ink-soft">
            <Flame aria-hidden="true" className="size-4" /> Mỗi set được máy chủ kiểm tra lại trước khi tính.
          </p>
        </Card>
      </div>
    </div>
  );
}
