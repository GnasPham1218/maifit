import { Link } from 'react-router';
import { EXERCISES } from '../../exercises';
import type { Leaderboard } from '../../types/workout';
import { weekRepTotal } from '../../utils/week';
import { BigNumber } from '../BigNumber';

// This week's reps (all exercises) and my rank per exercise on the weekly leaderboard
export function WeekRepsCard({ boards }: { boards: Leaderboard[] }) {
  const ranked = boards.filter((b) => b.me != null);
  return (
    <section aria-labelledby="week-reps" className="rounded-card bg-surface p-6">
      <h2 id="week-reps" className="font-medium text-muted">Rep tuần này</h2>
      <BigNumber value={weekRepTotal(boards)} className="mt-1 block text-6xl leading-none" />
      {ranked.length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-2">
          {ranked.map((b) => (
            <li key={b.exercise}>
              <Link to="/workout/leaderboard" className="inline-flex rounded-full bg-soft px-3 py-1 text-sm font-semibold text-link">
                {EXERCISES[b.exercise].label}: hạng {b.me?.rank}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted">Tập một hiệp để có tên trên bảng xếp hạng tuần.</p>
      )}
    </section>
  );
}
