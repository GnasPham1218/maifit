import { Outlet } from 'react-router';

export default function AuthLayout() {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-6">
      <div className="w-full max-w-[420px] rounded-xl border border-line bg-surface px-6 py-7">
        <h1 className="mb-1 text-2xl font-bold text-primary">MAIFit</h1>
        <Outlet />
      </div>
    </main>
  );
}
