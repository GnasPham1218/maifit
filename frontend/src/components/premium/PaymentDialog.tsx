import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { bankName } from '../../constants/banks';
import type { PremiumCheckout } from '../../hooks/usePremiumCheckout';
import { formatDateVn, formatVnd } from '../../utils/premium';
import { Alert } from '../Alert';
import { Avatar } from '../Avatar';
import { Button } from '../Button';
import { Modal } from '../Modal';

interface Props {
  open: boolean;
  onClose: () => void;
  checkout: PremiumCheckout;
  name: string; // for the avatar shown after paying
}

// 125 -> "2:05"
const formatCountdown = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

// The QR is SVG text made by our backend. Shown through an <img> data URL (never injected as HTML),
// which the Content-Security-Policy already allows (img-src data:).
const qrDataUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

// copyValue: what goes to the clipboard when it differs from the text on screen ("39000" for "39.000đ")
function CopyRow({ label, value, copyValue = value }: { label: string; value: string; copyValue?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(copyValue);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked by the browser: the value is still on screen to type by hand
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 border-t border-line py-2.5">
      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p className="truncate font-semibold">{value}</p>
      </div>
      <button type="button" onClick={() => void copy()} aria-label={`Sao chép ${label.toLowerCase()}`}
        className="inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-line px-3.5 text-sm font-medium hover:bg-soft
          focus-visible:outline-2 focus-visible:outline-accent">
        {copied ? <Check aria-hidden="true" className="size-4 text-success" /> : <Copy aria-hidden="true" className="size-4" />}
        {copied ? 'Đã chép' : 'Sao chép'}
      </button>
    </div>
  );
}

// QR transfer in a dialog (a sheet on phones): waiting -> paid, or the code expired
export function PaymentDialog({ open, onClose, checkout, name }: Props) {
  const { plan, order, secondsLeft, waiting, paid, expired, error, notice, busy } = checkout;
  const title = paid ? 'Thanh toán thành công' : plan?.premium ? 'Gia hạn Premium' : 'Mua Premium';

  return (
    <Modal open={open} onClose={onClose} title={title} closeOnBackdrop={!waiting}>
      {error && <div className="mb-3"><Alert type="error">{error}</Alert></div>}

      {paid && order ? (
        <div className="grid justify-items-center gap-4 py-2 text-center">
          <span className="flex size-20 items-center justify-center rounded-full bg-accent text-on-accent">
            <Check aria-hidden="true" className="size-10" strokeWidth={2.6} />
          </span>
          <p className="font-display text-3xl font-bold">Đã nhận {formatVnd(order.amount)}</p>
          <p className="text-muted">
            Premium của bạn được cộng thêm {order.premiumDays} ngày
            {plan?.premiumUntil ? `, đến hết ngày ${formatDateVn(plan.premiumUntil)}` : ''}.
          </p>
          <Avatar name={name} size={88} premium />
          <Button className="mt-2 w-full" onClick={onClose}>Về hồ sơ</Button>
        </div>
      ) : waiting && order ? (
        <div className="grid gap-4">
          <div className="grid justify-items-center gap-3 rounded-[22px] bg-bg p-4">
            {order.qrSvg && (
              <img src={qrDataUrl(order.qrSvg)} alt="Mã QR chuyển khoản"
                className="aspect-square w-full max-w-56 rounded-2xl bg-white p-2" />
            )}
            <p className="flex items-center gap-2 text-sm text-muted" role="status">
              <span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-accent" />
              Đang chờ tiền về, mã còn hạn <span className="font-semibold text-ink tabular-nums">{formatCountdown(secondsLeft)}</span>
            </p>
          </div>

          <div>
            <CopyRow label="Số tiền" value={formatVnd(order.amount)} copyValue={String(order.amount)} />
            {order.description && <CopyRow label="Nội dung chuyển khoản" value={order.description} />}
            {/* Bank details, for a transfer typed by hand instead of scanned */}
            <details className="border-t border-line py-2.5 text-sm">
              <summary className="cursor-pointer text-muted">Chuyển khoản bằng tay (không quét mã)</summary>
              <div className="mt-2">
                <CopyRow label="Ngân hàng" value={bankName(order.bankBin)} />
                {order.accountNumber && <CopyRow label="Số tài khoản" value={order.accountNumber} />}
                {order.accountName && <CopyRow label="Chủ tài khoản" value={order.accountName} />}
              </div>
            </details>
          </div>

          <p className="text-sm text-muted">
            Mở app ngân hàng, quét mã. Chuyển đúng số tiền và nội dung, trang này tự cập nhật khi tiền về.
            Thanh toán qua payOS, MAIFit không lưu thông tin tài khoản của bạn.
          </p>
          {notice && <p className="text-sm text-info" role="status">{notice}</p>}
          <Button variant="secondary" className="w-full" onClick={() => void checkout.refresh()} disabled={busy}>
            {busy ? 'Đang kiểm tra…' : 'Tôi đã chuyển khoản'}
          </Button>
        </div>
      ) : expired ? (
        <div className="grid gap-4">
          <p className="text-muted">Mã QR đã hết hạn. Nếu bạn chưa chuyển khoản, hãy tạo mã mới.</p>
          <Button className="w-full" onClick={() => void checkout.checkout()} disabled={busy}>
            {busy ? 'Đang tạo mã…' : 'Tạo mã mới'}
          </Button>
        </div>
      ) : (
        <p className="py-6 text-center text-muted">{busy ? 'Đang tạo mã…' : 'Đang tải…'}</p>
      )}
    </Modal>
  );
}
