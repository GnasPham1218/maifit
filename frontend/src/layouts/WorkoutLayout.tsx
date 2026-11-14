import { Activity, Trophy } from 'lucide-react';
import { NavLink, Outlet } from 'react-router';

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors ${
    isActive ? 'bg-accent text-on-accent hover:text-on-accent' : 'text-ink hover:bg-soft hover:text-ink'}`;

// Training and the leaderboard under one sidebar item. The tabs are routes, so reload and Back keep the tab.
// Leaving the training tab with a set not saved is guarded in WorkoutPage (useBlocker).
export default function WorkoutLayout() {
  return (
    <div className="grid gap-5">
      <nav aria-label="Tập luyện" className="inline-flex max-w-full gap-1 justify-self-start rounded-full border border-line bg-surface p-1">
        <NavLink to="/workout" end className={tabClass}>
          <Activity aria-hidden="true" className="size-4" /> Tập luyện
        </NavLink>
        <NavLink to="/workout/leaderboard" className={tabClass}>
          <Trophy aria-hidden="true" className="size-4" /> Bảng xếp hạng
        </NavLink>
      </nav>
      <Outlet />
    </div>
  );
}
