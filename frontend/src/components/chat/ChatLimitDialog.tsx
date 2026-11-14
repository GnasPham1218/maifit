import { Check, Crown } from 'lucide-react';
import type { PremiumPlan } from '../../types/payment';
import { formatNumber } from '../../utils/number';
import { Button } from '../Button';
import { ButtonLink } from '../ButtonLink';
import { Modal } from '../Modal';

interface Props {
  open: boolean;
  onClose: () => void;
  plan: PremiumPlan; // free plan only: a Premium user out of questions is not asked to buy again
}

// Out of questions on the free plan: what Premium gives, with the real numbers from the server
export function ChatLimitDialog({ open, onClose, plan }: Props) {
  const perks = [
    `MBotFit ${plan.premiumDailyChats} câu mỗi ngày (đang có ${plan.freeDailyChats})`,
    `Nhận diện ảnh ${plan.premiumDailyScans} lượt mỗi ngày (đang có ${plan.freeDailyScans})`,
    `${formatNumber(plan.price)}đ cho ${plan.days} ngày, không tự gia hạn`,
  ];
  return (
    <Modal open={open} onClose={onClose}
      title={(
        <span className="flex items-center gap-3">
          <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-gold">
            <Crown className="size-6 text-[#1c1e24]" strokeWidth={2.2} />
          </span>
          Bạn đã dùng hết {plan.freeDailyChats} câu hỏi hôm nay
        </span>
      )}
      footer={(
        <div className="grid gap-2">
          <ButtonLink to="/profile" state={{ openPay: true }} className="w-full"><Crown aria-hidden="true" className="size-4" /> Mở khóa với Premium</ButtonLink>
          <Button variant="ghost" className="w-full" onClick={onClose}>Để mai hỏi tiếp</Button>
        </div>
      )}>
      <p className="text-muted">Lượt hỏi MBotFit được làm mới lúc 0 giờ. Mở Premium để hỏi tiếp ngay hôm nay.</p>
      <ul className="mt-4 grid gap-2.5">
        {perks.map((p) => (
          <li key={p} className="flex items-center gap-2.5">
            <Check aria-hidden="true" className="size-[18px] shrink-0 text-accent" strokeWidth={2.5} />
            {p}
          </li>
        ))}
      </ul>
    </Modal>
  );
}
