import { Activity, Bot, House, LogOut, PanelLeftClose, UserRound, Utensils, type LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useMatches, useNavigate } from 'react-router';
import { Avatar } from '../components/Avatar';
import { useAuth } from '../hooks/useAuth';
import { usePremium } from '../hooks/usePremium';
import { isRouteHandle } from '../types/route';

interface NavItem {
  to: string;
  also?: string[]; // other sections shown as this item (the food library and food pages under Ăn uống)
  label: string;
  icon: LucideIcon;
}

// Five sections. The leaderboard is a tab of /workout; Premium lives in the profile (step 9).
const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Trang chủ', icon: House },
  { to: '/meals', label: 'Ăn uống', icon: Utensils, also: ['/foods'] },
  { to: '/workout', label: 'Tập luyện', icon: Activity },
  { to: '/chat', label: 'MBotFit', icon: Bot },
  { to: '/profile', label: 'Hồ sơ', icon: UserRound },
];

const COLLAPSED_KEY = 'maifit-sidebar-collapsed';

function savedCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1';
  } catch {
    return false; // storage blocked (private mode): open by default
  }
}

// Sidebar sizes. md: always icons only. lg: icon + label, unless the user collapsed it (then like md).
function sideSizes(collapsed: boolean) {
  const wide = (cls: string) => (collapsed ? '' : cls); // an lg: class only while expanded
  return {
    page: `md:pl-20 ${wide('lg:pl-60')}`,
    aside: `w-20 px-3 ${wide('lg:w-60 lg:px-4')}`,
    justify: `justify-center ${wide('lg:justify-start')}`,
    label: `sr-only ${wide('lg:not-sr-only')}`,
    block: `hidden ${wide('lg:block')}`,
  };
}

function sideClass(isActive: boolean, justify: string) {
  return `flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-colors ${justify} ${
    isActive ? 'bg-accent text-on-accent hover:text-on-accent' : 'text-hero-muted hover:bg-white/8 hover:text-hero-ink'}`;
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

// "/foods/12" is in the "/foods" section; "/foodsx" is not
function inSection(pathname: string, prefixes: string[] | undefined): boolean {
  return (prefixes ?? []).some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// "/workout/leaderboard" -> "/workout", "/foods/12" -> "/meals": moving inside one sidebar item
// (tabs, conversations, a food page) does not replay the page entrance
function sectionOf(pathname: string): string {
  const item = NAV_ITEMS.find((n) => n.to !== '/' && inSection(pathname, [n.to, ...(n.also ?? [])]));
  return item?.to ?? '/' + (pathname.split('/')[1] ?? '');
}

export default function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const premium = usePremium();
  const [collapsed, setCollapsed] = useState(savedCollapsed);
  const size = sideSizes(collapsed);

  function toggleSidebar() {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0');
    } catch {
      // not remembered, still works for this visit
    }
  }

  // The deepest route with a title wins (e.g. a tab inside /workout)
  const handle = useMatches().map((m) => m.handle).filter(isRouteHandle).at(-1);
  const name = user?.displayName ?? '';

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className={`min-h-screen transition-[padding] duration-200 ${size.page}`}>
      {/* Desktop sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-20 hidden flex-col bg-side py-6 transition-[width] duration-200 md:flex ${size.aside}`}>
        {/* md: the logo goes home (the sidebar is icons only anyway). lg: the logo folds the sidebar. */}
        <Link to="/" className="mb-8 flex items-center justify-center lg:hidden">
          <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-xl bg-accent font-display text-lg font-bold text-on-accent">
            M
          </span>
          <span className="sr-only">MAIFit, trang chủ</span>
        </Link>
        <button type="button" onClick={toggleSidebar} aria-expanded={!collapsed}
          aria-label={collapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'} title={collapsed ? 'Mở rộng' : 'Thu gọn'}
          className={`mb-8 hidden cursor-pointer items-center gap-2 rounded-2xl py-1 hover:bg-white/8 focus-visible:outline-2 focus-visible:outline-accent lg:flex ${
            collapsed ? 'justify-center' : 'px-3'}`}>
          <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent font-display text-lg font-bold text-on-accent">
            M
          </span>
          {!collapsed && <span className="font-display text-2xl font-bold tracking-wide text-hero-ink">MAIFit</span>}
          {!collapsed && <PanelLeftClose aria-hidden="true" className="ml-auto size-5 text-hero-muted" />}
        </button>

        <nav aria-label="Điều hướng chính" className="grid gap-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon, also }) => (
            <NavLink key={to} to={to} end={to === '/'} title={label}
              className={({ isActive }) => sideClass(isActive || inSection(pathname, also), size.justify)}>
              <Icon aria-hidden="true" className="size-5 shrink-0" />
              <span className={size.label}>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto grid gap-2">
          <Link to="/profile" title={name} className={`flex items-center gap-3 rounded-2xl p-2 hover:bg-white/8 ${size.justify}`}>
            <Avatar name={name} size={40} premium={premium} />
            <span className={`min-w-0 ${size.block}`}>
              <span className="block truncate text-sm font-medium text-hero-ink">{name}</span>
              <span className="block text-xs text-hero-muted">{premium ? 'Premium' : 'Gói miễn phí'}</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className={`flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-hero-muted hover:bg-white/8 hover:text-hero-ink ${size.justify}`}
            title="Đăng xuất"
          >
            <LogOut aria-hidden="true" className="size-5 shrink-0" />
            <span className={size.label}>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Phone bottom bar; logout is on the profile page */}
      <nav aria-label="Điều hướng chính" className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-surface px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden">
        {NAV_ITEMS.map(({ to, label, icon: Icon, also }) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => bottomClass({ isActive: isActive || inSection(pathname, also) })}>
            {({ isActive: own }) => {
              const isActive = own || inSection(pathname, also);
              return (
                <>
                  <span className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors ${
                    isActive ? 'bg-accent text-on-accent' : 'group-hover:bg-line'}`}>
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  {label}
                </>
              );
            }}
          </NavLink>
        ))}
      </nav>

      {/* Collapsed: the 160px the sidebar gave back go to the content (72rem + 10rem), not to the margins */}
      <div className={`mx-auto px-5 pt-6 pb-28 transition-[max-width] duration-200 md:px-8 md:pt-8 md:pb-10 ${collapsed ? 'max-w-6xl lg:max-w-[82rem]' : 'max-w-6xl'}`}>
        <header className="mb-6 flex items-center justify-between gap-4 md:mb-8">
          <div className="min-w-0">
            {handle?.greeting ? (
              <>
                <p className="text-sm text-muted first-letter:uppercase">{todayLabel()}</p>
                <h1 className="truncate pb-[0.08em] font-display text-3xl leading-[1.25] font-bold tracking-wide md:text-4xl">Chào {name}</h1>
              </>
            ) : handle?.ownHeading ? null : (
              <h1 className="truncate pb-[0.08em] font-display text-3xl leading-[1.25] font-bold tracking-wide md:text-4xl">{handle?.title}</h1>
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
