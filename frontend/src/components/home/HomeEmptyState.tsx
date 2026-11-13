import { Activity, Bot, Camera, ChevronRight, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router';
import { ButtonLink } from '../ButtonLink';

interface Starter {
  to: string;
  icon: LucideIcon;
  title: string;
  hint: string;
}

const STARTERS: Starter[] = [
  { to: '/meals', icon: Camera, title: 'Chụp bữa ăn đầu tiên', hint: 'AI nhận món, calo tính từ bảng dữ liệu' },
  { to: '/workout', icon: Activity, title: 'Thử đếm 10 squat', hint: 'Camera đếm rep ngay trên máy bạn' },
  { to: '/chat', icon: Bot, title: 'Hỏi MBotFit một câu', hint: 'Ví dụ: nên ăn bao nhiêu đạm mỗi ngày?' },
];

// First visit: no calorie target yet. The hero says what is missing; the list shows what the app can do meanwhile.
export function HomeEmptyState({ hasProfile }: { hasProfile: boolean }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <section aria-labelledby="no-target" className="flex flex-col gap-6 rounded-card bg-hero p-6 text-hero-ink sm:flex-row sm:items-center md:p-8">
        <svg aria-hidden="true" viewBox="0 0 200 200" className="size-36 shrink-0 text-hero-muted">
          <circle cx="100" cy="100" r="76" fill="none" stroke="currentColor" strokeOpacity="0.3" strokeWidth="20" strokeDasharray="6 6" />
        </svg>
        <div className="grid justify-items-start gap-3">
          <h2 id="no-target" className="text-xl font-semibold">Chưa có mục tiêu calo</h2>
          <p className="text-hero-muted">
            {hasProfile
              ? 'Ghi cân nặng hôm nay để tính TDEE và mục tiêu calo của bạn.'
              : 'Nhập chiều cao, cân nặng và mục tiêu, mất khoảng 1 phút.'}
          </p>
          <ButtonLink to="/profile">{hasProfile ? 'Ghi cân nặng' : 'Thiết lập hồ sơ'}</ButtonLink>
        </div>
      </section>

      <section aria-labelledby="starters" className="rounded-card bg-surface p-6">
        <h2 id="starters" className="text-lg font-semibold">Bắt đầu với MAIFit</h2>
        <ul className="mt-2">
          {STARTERS.map(({ to, icon: Icon, title, hint }) => (
            <li key={to} className="border-t border-line first:border-t-0">
              <Link to={to} className="flex items-center gap-4 py-3.5 text-ink no-underline hover:text-ink">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-soft text-link">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <span className="font-semibold">{title}</span>
                  <span className="text-sm text-muted">{hint}</span>
                </span>
                <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
