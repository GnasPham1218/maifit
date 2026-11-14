import { Check, Crown } from 'lucide-react';
import { useState } from 'react';
import type { PremiumCheckout } from '../../hooks/usePremiumCheckout';
import { formatDateVn, formatVnd } from '../../utils/premium';
import { Button } from '../Button';

const DAY_MS = 86_400_000;
const PANEL = 'grid content-start gap-3.5 rounded-[22px] bg-hero-ink/[0.06] p-5 text-hero-ink md:p-6';

// The Premium part of the profile header (on the graphite block): days left + renew, or what Premium gives + buy
export function PremiumBlock({ checkout, onBuy }: { checkout: PremiumCheckout; onBuy: () => void }) {
  const { plan, waiting, busy } = checkout;
  const [now] = useState(() => Date.now()); // days left only need the time the page opened

  if (!plan) return <div className={`${PANEL} min-h-36 text-sm text-hero-muted`}>Đang tải gói…</div>;

  const label = waiting ? 'Tiếp tục thanh toán' : busy ? 'Đang tạo mã…'
    : plan.premium ? `Gia hạn ${plan.days} ngày, ${formatVnd(plan.price)}` : `Mua Premium, ${formatVnd(plan.price)}`;

  if (!plan.premium) {
    return (
      <div className={PANEL}>
        <p className="flex items-center gap-2 font-display text-2xl font-bold">
          <Crown aria-hidden="true" className="size-5 text-gold" /> MAIFit Premium
        </p>
        <ul className="grid gap-2 text-sm">
          {[
            `MBotFit ${plan.premiumDailyChats} câu mỗi ngày (đang có ${plan.freeDailyChats})`,
            `Nhận diện ảnh ${plan.premiumDailyScans} lượt mỗi ngày (đang có ${plan.freeDailyScans})`,
            `${plan.days} ngày, không tự gia hạn`,
          ].map((p) => (
            <li key={p} className="flex items-center gap-2">
              <Check aria-hidden="true" className="size-4 shrink-0 text-accent" strokeWidth={2.6} /> {p}
            </li>
          ))}
        </ul>
        <Button size="sm" className="justify-self-start" onClick={onBuy} disabled={busy}>
          <Crown aria-hidden="true" className="size-4" /> {label}
        </Button>
      </div>
    );
  }

  const until = plan.premiumUntil ? new Date(plan.premiumUntil).getTime() : now;
  const daysLeft = Math.max(1, Math.ceil((until - now) / DAY_MS));
  return (
    <div className={PANEL}>
      <p className="flex items-baseline gap-2.5">
        <span className="font-display text-6xl leading-none font-bold tabular-nums">{daysLeft}</span>
        <span className="text-hero-muted">ngày Premium còn lại</span>
      </p>
      {/* Bought several times ahead: more than one period left, the bar stays full */}
      <div className="h-2 overflow-hidden rounded-full bg-hero-ink/15" role="progressbar" aria-label="Thời gian Premium còn lại"
        aria-valuemin={0} aria-valuemax={plan.days} aria-valuenow={Math.min(daysLeft, plan.days)}>
        <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, (daysLeft / plan.days) * 100)}%` }} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-hero-muted">Hết hạn ngày {plan.premiumUntil && formatDateVn(plan.premiumUntil)}</span>
        <Button size="sm" onClick={onBuy} disabled={busy}>{label}</Button>
      </div>
    </div>
  );
}
