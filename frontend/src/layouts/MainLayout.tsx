import { Outlet, useNavigate } from 'react-router';
import { useAuth } from '../hooks/useAuth';

export default function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <>
      <header className="app-header">
        <strong className="brand">MAIFit</strong>
        <div>
          <span style={{ marginRight: 12 }}>{user?.displayName}</span>
          <button type="button" className="btn btn-secondary" onClick={() => void handleLogout()}>
            Đăng xuất
          </button>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </>
  );
}
