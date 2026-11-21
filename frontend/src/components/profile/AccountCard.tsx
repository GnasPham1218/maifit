import { CheckCircle2, Crown, LogOut, Mail, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import type { PremiumCheckout } from '../../hooks/usePremiumCheckout';
import { formatDateVn } from '../../utils/premium';
import { Button } from '../Button';

function Row({ icon: Icon, tone, title, sub, right }: {
  icon: LucideIcon; tone: string; title: string; sub: ReactNode; right: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3.5 border-t border-line py-3.5 first:border-t-0">
      <span aria-hidden="true" className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
        <Icon className="size-5" />
      </span>
      <div className="grid min-w-0 flex-1 gap-0.5">
        <p className="font-semibold">{title}</p>
        <p className="text-[13px] break-words text-muted">{sub}</p>
      </div>
      <div className="shrink-0">{right}</div>
    </div>
  );
}

// Tab "Cài đặt": the account (email, plan) and logging out, as rows with one action each
export function AccountCard({ email, checkout, onBuy, onLogout, loggingOut }: {
  email: string; checkout: PremiumCheckout; onBuy: () => void; onLogout: () => void; loggingOut: boolean;
}) {
  const plan = checkout.plan;
  const premium = plan?.premium ?? false;
  return (
    <>
      <section className="grid rounded-card bg-surface p-5 text-ink md:p-6" aria-labelledby="account-title">
        <div className="mb-2 grid gap-0.5">
          <h2 id="account-title" className="text-lg font-semibold">Tài khoản</h2>
          <p className="text-sm text-muted">Thông tin đăng nhập và gói của bạn</p>
        </div>
        <Row icon={Mail} tone="bg-soft text-link" title="Email đăng nhập" sub={email}
          right={
            <span className="inline-flex items-center gap-1 rounded-full bg-success-bg px-2.5 py-1 text-xs font-bold text-success">
              <CheckCircle2 aria-hidden="true" className="size-3.5" /> Đã xác thực
            </span>
          } />
        <Row icon={Crown} tone="bg-gold/15 text-gold" title={premium ? 'Gói Premium' : 'Gói miễn phí'}
          sub={premium && plan?.premiumUntil ? `Hết hạn ngày ${formatDateVn(plan.premiumUntil)}` : 'Nâng cấp để có thêm lượt AI mỗi ngày'}
          right={<Button size="sm" onClick={onBuy} disabled={!plan || checkout.busy}>{premium ? 'Gia hạn' : 'Mua Premium'}</Button>} />
      </section>

      <section className="flex items-center gap-3.5 rounded-card bg-surface p-5 text-ink md:px-6">
        <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-danger-bg text-danger">
          <LogOut className="size-5" />
        </span>
        <div className="grid min-w-0 flex-1 gap-0.5">
          <p className="font-semibold">Đăng xuất</p>
          <p className="text-[13px] text-muted">Chỉ trên thiết bị này</p>
        </div>
        <Button variant="secondary" size="sm" className="text-danger hover:text-danger" onClick={onLogout} disabled={loggingOut}>
          {loggingOut ? 'Đang đăng xuất…' : 'Đăng xuất'}
        </Button>
      </section>
    </>
  );
}
