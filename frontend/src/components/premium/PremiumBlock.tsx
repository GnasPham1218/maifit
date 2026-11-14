import { Check, Crown } from 'lucide-react';
import { useState } from 'react';
import type { PremiumCheckout } from '../../hooks/usePremiumCheckout';
import { Button } from '../Button';
import { formatDateVn, formatVnd } from '../../utils/premium';

const DAY_MS = 86_400_000;

// The Premium part of the profile: days left + renew, or what Premium gives + buy
export function PremiumBlock({ checkout, onBuy }: { checkout: PremiumCheckout; onBuy: () => void }) {
  const { plan, waiting, busy } = checkout;
  const [now] = useState(() => Date.now()); // days left only need the time the page opened

  if (!plan) return <div className="min-h-40 rounded-[22px] bg-bg p-5 text-sm text-muted md:p-6">Đang tải gói…</div>;

  const until = plan.premiumUntil ? new Date(plan.premiumUntil).getTime() : 0;
  const daysLeft = plan.premium ? Math.max(1, Math.ceil((until - now) / DAY_MS)) : 0;
  const price = `${plan.days} ngày, ${formatVnd(plan.price)}`;
  const label = waiting ? 'Tiếp tục thanh toán' : busy ? 'Đang tạo mã…' : plan.premium ? `Gia hạn ${price}` : `Mua Premium, ${formatVnd(plan.price)}`;

  return (
    <div className="grid content-start gap-4 rounded-[22px] bg-bg p-5 md:p-6">
      <div className="flex flex-wrap items-center gap-2.5">
        <Crown aria-hidden="true" className="size-5 text-gold" />
        <p className="font-display text-2xl font-bold">MAIFit Premium</p>
        {plan.premium && <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-on-accent">Đang dùng</span>}
      </div>

      {plan.premium ? (
        <>
          <p className="flex items-baseline gap-2.5">
            <span className="font-display text-6xl leading-none font-bold tabular-nums">{daysLeft}</span>
            <span className="text-muted">ngày Premium còn lại</span>
          </p>
          <div className="h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-label="Thời gian Premium còn lại"
            aria-valuemin={0} aria-valuemax={plan.days} aria-valuenow={Math.min(daysLeft, plan.days)}>
            <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, (daysLeft / plan.days) * 100)}%` }} />
          </div>
          <p className="text-sm text-muted">
            Hết hạn ngày {plan.premiumUntil && formatDateVn(plan.premiumUntil)}. Gia hạn trước hạn thì số ngày được cộng dồn.
          </p>
        </>
      ) : (
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
      )}

      <Button className="justify-self-start" onClick={onBuy} disabled={busy}>
        {!plan.premium && <Crown aria-hidden="true" className="size-4" />}
        {label}
      </Button>
    </div>
  );
}
