import { Activity, Bot, House, LogOut, UserRound, Utensils, type LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { Link, NavLink, Outlet, useLocation, useMatches, useNavigate } from 'react-router';
import { Avatar } from '../components/Avatar';
import { useAuth } from '../hooks/useAuth';
import { usePremium } from '../hooks/usePremium';
import { isRouteHandle } from '../types/route';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

// Five sections. The leaderboard is a tab of /workout; Premium lives in the profile (step 9).
const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Trang chủ', icon: House },
  { to: '/meals', label: 'Ăn uống', icon: Utensils },
  { to: '/workout', label: 'Tập luyện', icon: Activity },
  { to: '/chat', label: 'MBotFit', icon: Bot },
  { to: '/profile', label: 'Hồ sơ', icon: UserRound },
];

// Desktop: icons only on md, icon + label from lg
function sideClass({ isActive }: { isActive: boolean }) {
  return `flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-colors md:justify-center lg:justify-start ${
    isActive ? 'bg-accent text-on-accent' : 'text-hero-muted hover:bg-white/8 hover:text-hero-ink'}`;
}

// Phone: label under the icon, the active icon sits in a pill
function bottomClass({ isActive }: { isActive: boolean }) {
  return `group flex flex-1 flex-col items-center gap-1 py-1 text-[0.7rem] font-medium ${
    isActive ? 'text-ink' : 'text-muted'}`;
}

function todayLabel(): string {
  // e.g. "Thứ Sáu, 13 tháng 11" in Vietnam time
  return new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Asia/Ho_Chi_Minh',
  });
}

// "/workout/leaderboard" -> "/workout": tabs and conversations inside one section do not replay the page entrance
function sectionOf(pathname: string): string {
  return '/' + (pathname.split('/')[1] ?? '');
}

export default function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const premium = usePremium();

  // The deepest route with a title wins (e.g. a tab inside /workout)
  const handle = useMatches().map((m) => m.handle).filter(isRouteHandle).at(-1);
  const name = user?.displayName ?? '';

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen md:pl-20 lg:pl-60">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-20 flex-col bg-side px-3 py-6 md:flex lg:w-60 lg:px-4">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2 lg:justify-start lg:px-3">
          <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-xl bg-accent font-display text-lg font-bold text-on-accent">
            M
          </span>
          <span className="hidden font-display text-2xl font-bold tracking-wide text-hero-ink lg:inline">MAIFit</span>
          <span className="sr-only lg:hidden">MAIFit, trang chủ</span>
        </Link>

        <nav aria-label="Điều hướng chính" className="grid gap-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} className={sideClass} title={label}>
              <Icon aria-hidden="true" className="size-5 shrink-0" />
              <span className="sr-only lg:not-sr-only">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto grid gap-2">
          <Link to="/profile" className="flex items-center justify-center gap-3 rounded-2xl p-2 hover:bg-white/8 lg:justify-start">
            <Avatar name={name} size={40} premium={premium} />
            <span className="hidden min-w-0 lg:block">
              <span className="block truncate text-sm font-medium text-hero-ink">{name}</span>
              <span className="block text-xs text-hero-muted">{premium ? 'Premium' : 'Gói miễn phí'}</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="flex cursor-pointer items-center justify-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-hero-muted hover:bg-white/8 hover:text-hero-ink lg:justify-start"
            title="Đăng xuất"
          >
            <LogOut aria-hidden="true" className="size-5 shrink-0" />
            <span className="sr-only lg:not-sr-only">Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Phone bottom bar; logout is on the profile page */}
      <nav aria-label="Điều hướng chính" className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-surface px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'} className={bottomClass}>
            {({ isActive }) => (
              <>
                <span className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors ${
                  isActive ? 'bg-accent text-on-accent' : 'group-hover:bg-line'}`}>
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mx-auto max-w-6xl px-5 pt-6 pb-28 md:px-8 md:pt-8 md:pb-10">
        <header className="mb-6 flex items-center justify-between gap-4 md:mb-8">
          <div className="min-w-0">
            {handle?.greeting ? (
              <>
                <p className="text-sm text-muted first-letter:uppercase">{todayLabel()}</p>
                <h1 className="truncate font-display text-3xl font-bold tracking-wide md:text-4xl">Chào {name}</h1>
              </>
            ) : (
              <h1 className="truncate font-display text-3xl font-bold tracking-wide md:text-4xl">{handle?.title}</h1>
            )}
          </div>
          {/* Phone: the avatar opens the profile (the sidebar has it on desktop) */}
          <Link to="/profile" className="shrink-0 rounded-full md:hidden" aria-label="Hồ sơ">
            <Avatar name={name} size={40} premium={premium} />
          </Link>
        </header>

        {/* Entrance only (no exit), keyed by section. Motion follows the OS reduced-motion setting via MotionConfig. */}
        <motion.main
          key={sectionOf(pathname)}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          <Outlet />
        </motion.main>
      </div>
    </div>
  );
}
