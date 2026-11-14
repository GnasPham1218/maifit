import { Activity, Trophy } from 'lucide-react';
import { NavLink, Outlet } from 'react-router';

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${
    isActive ? 'bg-ink text-white' : 'bg-surface text-ink hover:bg-line'}`;

// Training and the leaderboard under one sidebar item. The tabs are routes, so reload and Back keep the tab.
// Leaving the training tab with a set not saved is guarded in WorkoutPage (useBlocker).
export default function WorkoutLayout() {
  return (
    <div className="grid gap-5">
      <nav aria-label="Tập luyện" className="flex flex-wrap gap-2">
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
