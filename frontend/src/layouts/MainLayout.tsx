import { Activity, Crown, Dumbbell, House, LogOut, MessageCircle, UserRound, Utensils, type LucideIcon } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { useAuth } from '../hooks/useAuth';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

// One item per page; the leaderboard is a tab of /workout
const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Trang chủ', icon: House },
  { to: '/meals', label: 'Ăn uống', icon: Utensils },
  { to: '/workout', label: 'Tập luyện', icon: Activity },
  { to: '/chat', label: 'Trợ lý AI', icon: MessageCircle },
  { to: '/premium', label: 'Premium', icon: Crown },
  { to: '/profile', label: 'Hồ sơ', icon: UserRound },
];

const ICON_BUTTON = 'flex size-12 items-center justify-center rounded-full transition-colors';

function navClass({ isActive }: { isActive: boolean }) {
  return `${ICON_BUTTON} ${isActive ? 'bg-ink text-peach' : 'bg-bg text-ink hover:bg-line'}`;
}

function todayLabel(): string {
  // e.g. "Thứ Hai, 2 tháng 11, 2026" in Vietnam time
  return new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh',
  });
}

export default function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  const initial = user?.displayName.trim().charAt(0).toUpperCase() ?? '?';

  return (
    <div className="min-h-screen md:pl-24">
      {/* Icon sidebar on desktop, bottom bar on mobile */}
      <aside className="fixed inset-x-0 bottom-0 z-10 flex items-center justify-between border-t border-line bg-surface px-4 py-2 md:inset-y-0 md:left-0 md:right-auto md:w-24 md:flex-col md:border-t-0 md:px-0 md:py-6">
        <Dumbbell aria-hidden="true" className="hidden size-8 text-sky-strong md:block" />

        <nav aria-label="Điều hướng chính" className="flex gap-3 md:flex-col">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} className={navClass} aria-label={label} title={label}>
              <Icon aria-hidden="true" className="size-5" />
            </NavLink>
          ))}
        </nav>

        {/* Desktop only: the bottom bar on phones has room for the pages alone (logout is on the profile page) */}
        <div className="hidden items-center gap-3 md:flex md:flex-col">
          <button
            type="button"
            onClick={() => void handleLogout()}
            className={`${ICON_BUTTON} cursor-pointer bg-bg text-ink hover:bg-line`}
            aria-label="Đăng xuất"
            title="Đăng xuất"
          >
            <LogOut aria-hidden="true" className="size-5" />
          </button>
          <div
            className="flex size-12 items-center justify-center rounded-full bg-peach font-semibold"
            title={user?.displayName}
          >
            {initial}
          </div>
        </div>
      </aside>

      <div className="mx-auto max-w-6xl px-5 pt-8 pb-28 md:px-8 md:pb-10">
        <header className="mb-8">
          <h1 className="text-3xl tracking-tight">
            <span className="font-bold">Xin chào,</span> {user?.displayName}
          </h1>
          <p className="mt-1 text-muted first-letter:uppercase">{todayLabel()}</p>
        </header>
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
