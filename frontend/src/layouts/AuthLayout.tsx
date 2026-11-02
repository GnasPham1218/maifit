import { Dumbbell } from 'lucide-react';
import { Outlet } from 'react-router';

export default function AuthLayout() {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-8">
      <div className="w-full max-w-[440px] rounded-card bg-surface px-7 py-8">
        <div className="mb-6 flex items-center gap-2">
          <Dumbbell aria-hidden="true" className="size-7 text-sky-strong" />
          <span className="text-2xl font-bold tracking-tight">MAIFit</span>
        </div>
        <Outlet />
      </div>
    </main>
  );
}
