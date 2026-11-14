import { Link, Outlet } from 'react-router';
import { AuthShowcase } from '../components/marketing/AuthShowcase';

// Sign-in pages. lg+: the form on the left, the graphite showcase on the right.
// Phones and tablets: a graphite band with the name, the form card overlapping it.
export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-ground lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-12 lg:p-10">
      <div className="bg-hero px-5 pt-6 pb-16 text-hero-ink lg:hidden">
        <Link to="/" className="font-display text-2xl font-bold text-hero-ink hover:text-hero-ink">MAIFit</Link>
        <p className="mt-2 max-w-sm text-hero-muted">Bữa ăn, bài tập và câu hỏi dinh dưỡng trong một app.</p>
      </div>
      <main className="-mt-10 px-4 pb-10 lg:mt-0 lg:flex lg:items-center lg:justify-center lg:p-0">
        <div className="mx-auto w-full max-w-[440px] rounded-card bg-surface p-6 lg:bg-transparent lg:p-0">
          <Link to="/" className="mb-8 hidden font-display text-3xl font-bold text-accent hover:text-accent lg:inline-block">MAIFit</Link>
          <Outlet />
        </div>
      </main>
      <AuthShowcase />
    </div>
  );
}
