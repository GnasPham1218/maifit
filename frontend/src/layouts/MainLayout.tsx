import { NavLink, Outlet, useNavigate } from 'react-router';
import { Button } from '../components/Button';
import { useAuth } from '../hooks/useAuth';

// NavLink passes isActive: highlight the current page
function navClass({ isActive }: { isActive: boolean }) {
  return `font-semibold no-underline ${isActive ? 'text-primary' : 'text-muted hover:text-ink'}`;
}

export default function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <>
      <header className="flex items-center justify-between border-b border-line bg-surface px-5 py-3.5">
        <nav className="flex items-center gap-4">
          <strong className="text-xl text-primary">MAIFit</strong>
          <NavLink to="/" end className={navClass}>
            Trang chủ
          </NavLink>
          <NavLink to="/profile" className={navClass}>
            Hồ sơ
          </NavLink>
        </nav>
        <div className="flex items-center gap-3">
          <span>{user?.displayName}</span>
          <Button variant="secondary" onClick={() => void handleLogout()}>
            Đăng xuất
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-[960px] px-4 py-6">
        <Outlet />
      </main>
    </>
  );
}
