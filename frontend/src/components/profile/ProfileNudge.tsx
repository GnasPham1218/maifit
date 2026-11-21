import { X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import type { Profile } from '../../types/profile';
import { coachGaps, coachProgress } from '../../utils/profileRequest';
import { buttonClass } from '../buttonStyles';

const HIDDEN_KEY = 'maifit-coach-nudge-hidden';

function hiddenBefore(): boolean {
  try {
    return localStorage.getItem(HIDDEN_KEY) === '1';
  } catch {
    return false;
  }
}

// "Hồ sơ còn N mục": shown on the home page and the profile until the coach answers are complete.
// "Ẩn" hides it on this device (the profile tab keeps a dot on "Hồ sơ huấn luyện").
export function ProfileNudge({ profile, dismissible = true }: { profile: Profile | null; dismissible?: boolean }) {
  const [hidden, setHidden] = useState(hiddenBefore);
  const gaps = coachGaps(profile);
  if (gaps.length === 0 || (dismissible && hidden)) return null;

  const percent = coachProgress(profile);
  const reasons = [
    gaps.includes('training') && 'cách tập để mục tiêu đạm chính xác',
    gaps.includes('diet') && 'chế độ ăn và dị ứng để MBotFit lọc món không an toàn',
  ].filter(Boolean).join(', ');

  function hide() {
    setHidden(true);
    try {
      localStorage.setItem(HIDDEN_KEY, '1');
    } catch { /* storage blocked: hidden until the page reloads */ }
  }

  return (
    <section aria-labelledby="nudge-title" className="flex items-center gap-4 rounded-card border border-accent bg-surface p-4 text-ink md:gap-5 md:p-5">
      <svg width="60" height="60" viewBox="0 0 36 36" role="img" aria-label={`Hồ sơ hoàn thành ${percent}%`} className="shrink-0">
        <circle cx="18" cy="18" r="15.9" fill="none" className="stroke-line" strokeWidth="3.5" />
        <circle cx="18" cy="18" r="15.9" fill="none" className="stroke-accent" strokeWidth="3.5" pathLength={100}
          strokeDasharray={`${percent} 100`} strokeLinecap="round" transform="rotate(-90 18 18)" />
        <text x="18" y="21.5" textAnchor="middle" className="fill-ink font-display" fontSize="10">{percent}%</text>
      </svg>
      <div className="grid min-w-0 flex-1 gap-1">
        <h2 id="nudge-title" className="font-semibold">Hồ sơ còn {gaps.length} phần, khoảng 1 phút</h2>
        <p className="text-sm text-muted">
          {gaps.includes('body') ? 'Thêm chiều cao, cân nặng và mức vận động để có mục tiêu calo của riêng bạn.' : `Thêm ${reasons}.`}
        </p>
        <Link to="/onboarding" className={`${buttonClass('primary', 'sm')} mt-1 justify-self-start`}>Điền tiếp</Link>
      </div>
      {dismissible && (
        <button type="button" onClick={hide} aria-label="Ẩn nhắc nhở"
          className="flex size-9 shrink-0 cursor-pointer items-center justify-center self-start rounded-full text-muted hover:bg-soft hover:text-ink
            focus-visible:outline-2 focus-visible:outline-accent">
          <X aria-hidden="true" className="size-4" />
        </button>
      )}
    </section>
  );
}
