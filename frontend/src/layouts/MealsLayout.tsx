import { BookOpen, NotebookPen } from 'lucide-react';
import { NavLink, Outlet } from 'react-router';

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors ${
    isActive ? 'bg-accent text-on-accent hover:text-on-accent' : 'text-ink hover:bg-soft hover:text-ink'}`;

// The day's log and the food library under one sidebar item. The tabs are routes: reload and Back keep the tab.
export default function MealsLayout() {
  return (
    <div className="grid gap-5">
      <nav aria-label="Ăn uống" className="inline-flex max-w-full gap-1 justify-self-start rounded-full border border-line bg-surface p-1">
        <NavLink to="/meals" className={tabClass}>
          <NotebookPen aria-hidden="true" className="size-4" /> Nhật ký
        </NavLink>
        <NavLink to="/foods" end className={tabClass}>
          <BookOpen aria-hidden="true" className="size-4" /> Thực phẩm
        </NavLink>
      </nav>
      <Outlet />
    </div>
  );
}
