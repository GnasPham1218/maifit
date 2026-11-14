import { House } from 'lucide-react';
import { ButtonLink } from '../components/ButtonLink';

// Any unknown address. Graphite in both themes; the joint angle is the app's signature picture.
export default function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-hero px-6 text-center text-hero-ink">
      <div className="grid justify-items-center gap-4">
        <div className="flex items-end gap-6" aria-hidden="true">
          <svg viewBox="0 0 160 160" className="w-28 md:w-36">
            <path d="M20 140 L150 140" stroke="#5a6070" strokeWidth="6" strokeLinecap="round" />
            <path d="M20 140 L95 20" stroke="#f2f2ee" strokeWidth="6" strokeLinecap="round" />
            <path d="M70 140 A 50 50 0 0 0 46 98" fill="none" className="stroke-accent" strokeWidth="7" strokeLinecap="round" />
            <circle cx="20" cy="140" r="10" className="fill-accent" />
          </svg>
          <span className="font-display text-7xl leading-none font-bold md:text-8xl">404</span>
        </div>
        <h1 className="mt-4 font-display text-3xl font-bold md:text-4xl">Trang này không tồn tại</h1>
        <p className="text-hero-muted">Liên kết có thể đã cũ hoặc gõ nhầm.</p>
        <ButtonLink to="/" className="mt-2"><House aria-hidden="true" className="size-4" /> Về trang chủ</ButtonLink>
      </div>
    </main>
  );
}
