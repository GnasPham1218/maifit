import { Outlet } from 'react-router';

export default function AuthLayout() {
  return (
    <main className="auth-layout">
      <div className="auth-card">
        <h1 className="brand">MAIFit</h1>
        <Outlet />
      </div>
    </main>
  );
}
