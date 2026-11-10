import { Check, Copy, Crown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { paymentApi } from '../apis/paymentApi';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { StatTile } from '../components/StatTile';
import { bankName } from '../constants/banks';
import { getErrorMessage } from '../constants/errorMessages';
import type { PaymentOrder, PremiumPlan } from '../types/payment';

const POLL_MS = 3000;

const formatVnd = (amount: number) => `${amount.toLocaleString('vi-VN')} đ`;

// 2026-12-10T05:00:00Z -> "10/12/2026" (Vietnam time)
const formatDate = (iso: string) => new Date(iso).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

// 125 -> "2:05"
const formatCountdown = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

// The QR is SVG text made by our backend. Shown through an <img> data URL (never injected as HTML),
// which the Content-Security-Policy already allows (img-src data:).
const qrDataUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

// copyValue: what goes to the clipboard when it differs from the text on screen (e.g. "39000" for "39.000 đ")
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
    <div className="flex items-center justify-between gap-3 border-b border-line py-2.5 last:border-b-0">
      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p className="truncate font-medium">{value}</p>
      </div>
      <button type="button" onClick={() => void copy()} aria-label={`Sao chép ${label.toLowerCase()}`}
        className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-bg hover:bg-line">
        {copied ? <Check aria-hidden="true" className="size-4 text-success" /> : <Copy aria-hidden="true" className="size-4" />}
      </button>
    </div>
  );
}

// Premium = more photo recognitions per day. Paid by bank transfer (QR) right on this page:
// the backend creates the order, this page shows the QR and waits for the backend to confirm it.
// Premium is never granted by this page; only the server decides, after the gateway's signed notice.
export default function PremiumPage() {
  const [plan, setPlan] = useState<PremiumPlan | null>(null);
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let ignore = false;
    paymentApi
      .plan()
      .then((data) => {
        if (ignore) return;
        setPlan(data);
        setOrder(data.pendingOrder);
      })
      .catch((err: unknown) => {
        if (!ignore) setError(getErrorMessage(err));
      });
    return () => {
      ignore = true;
    };
  }, []);

  const secondsLeft = order ? Math.max(0, Math.floor((new Date(order.expiresAt).getTime() - now) / 1000)) : 0;
  const waiting = order?.state === 'PENDING' && secondsLeft > 0;
  const orderCode = order?.orderCode;

  // While the QR is shown: tick the countdown and ask our backend whether the money has arrived
  useEffect(() => {
    if (!waiting || orderCode === undefined) return;
    let ignore = false;
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    const poll = window.setInterval(() => {
      paymentApi
        .get(orderCode)
        .then((latest) => {
          if (ignore) return;
          setOrder(latest);
          if (latest.state === 'PAID') {
            // Premium time changed on the server: read it again
            paymentApi.plan().then((data) => {
              if (!ignore) setPlan(data);
            }).catch(() => {});
          }
        })
        .catch(() => {}); // a failed poll is retried by the next one
    }, POLL_MS);
    return () => {
      ignore = true;
      window.clearInterval(tick);
      window.clearInterval(poll);
    };
  }, [waiting, orderCode]);

  async function handleCheckout() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      setNow(Date.now());
      setOrder(await paymentApi.checkout());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  // "Tôi đã chuyển khoản": the backend asks the gateway directly instead of waiting for its notice
  async function handleRefresh() {
    if (!order) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const latest = await paymentApi.refresh(order.orderCode);
      setOrder(latest);
      if (latest.state === 'PAID') {
        setPlan(await paymentApi.plan());
      } else {
        setNotice('Chưa thấy tiền về. Ngân hàng có thể mất khoảng một phút, trang này sẽ tự cập nhật.');
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const paid = order?.state === 'PAID';
  const expired = order != null && !paid && !waiting;

  return (
    <div className="grid items-start gap-5 lg:grid-cols-3">
      <div className="grid min-w-0 gap-5 lg:col-span-2">
        {error && <Alert type="error">{error}</Alert>}

        <Card>
          <div className="flex items-center gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-peach">
              <Crown aria-hidden="true" className="size-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-xl font-semibold">MAIFit Premium</h2>
              <p className="text-sm text-muted">
                {plan ? `${formatVnd(plan.price)} cho ${plan.days} ngày · không tự gia hạn` : 'Đang tải…'}
              </p>
            </div>
          </div>

          {plan && (
            <ul className="mt-5 grid gap-2 text-ink-soft">
              <li className="flex items-start gap-2">
                <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
                <span>
                  Nhận diện món ăn từ ảnh <strong className="font-semibold text-ink">{plan.premiumDailyScans} lượt mỗi ngày</strong>{' '}
                  (gói miễn phí: {plan.freeDailyScans} lượt)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
                <span>Mua thêm khi còn hạn thì số ngày được cộng dồn</span>
              </li>
            </ul>
          )}

          {paid && order && (
            <div className="mt-5">
              <Alert type="success">
                Đã nhận {formatVnd(order.amount)}. Premium của bạn được cộng thêm {order.premiumDays} ngày.
              </Alert>
            </div>
          )}
          {expired && (
            <div className="mt-5">
              <Alert type="info">Mã QR đã hết hạn. Nếu bạn chưa chuyển khoản, hãy tạo mã mới.</Alert>
            </div>
          )}

          {plan && !waiting && (
            <div className="mt-5">
              <Button onClick={() => void handleCheckout()} disabled={busy}>
                {busy ? 'Đang tạo mã…' : plan.premium ? `Gia hạn thêm ${plan.days} ngày` : 'Mua Premium'}
              </Button>
            </div>
          )}
        </Card>

        {waiting && order && (
          <Card title="Chuyển khoản để kích hoạt">
            <div className="grid gap-6 sm:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
              <div className="grid justify-items-center gap-2">
                {order.qrSvg && (
                  <img src={qrDataUrl(order.qrSvg)} alt="Mã QR chuyển khoản"
                    className="aspect-square w-full max-w-60 rounded-2xl border border-line" />
                )}
                <p className="text-center text-xs text-muted">Mở ứng dụng ngân hàng và quét mã</p>
              </div>

              <div className="min-w-0">
                <CopyRow label="Ngân hàng" value={bankName(order.bankBin)} />
                {order.accountNumber && <CopyRow label="Số tài khoản" value={order.accountNumber} />}
                {order.accountName && <CopyRow label="Chủ tài khoản" value={order.accountName} />}
                <CopyRow label="Số tiền" value={formatVnd(order.amount)} copyValue={String(order.amount)} />
                {order.description && <CopyRow label="Nội dung chuyển khoản" value={order.description} />}
              </div>
            </div>

            <p className="mt-5 text-sm text-ink-soft">
              Chuyển đúng số tiền và đúng nội dung. Mã còn hiệu lực{' '}
              <strong className="font-semibold tabular-nums text-ink">{formatCountdown(secondsLeft)}</strong>.
              Trang này tự cập nhật khi tiền về.
            </p>
            {notice && <p className="mt-2 text-sm text-info" role="status">{notice}</p>}

            <div className="mt-4">
              <Button variant="secondary" onClick={() => void handleRefresh()} disabled={busy}>
                {busy ? 'Đang kiểm tra…' : 'Tôi đã chuyển khoản'}
              </Button>
            </div>
          </Card>
        )}
      </div>

      <div className="grid min-w-0 gap-5">
        <StatTile tone={plan?.premium ? 'lime' : 'sky'} label="Gói hiện tại"
          value={plan ? (plan.premium ? 'Premium' : 'Miễn phí') : '—'}
          hint={plan?.premium && plan.premiumUntil ? `Đến hết ngày ${formatDate(plan.premiumUntil)}` : undefined} />
        <StatTile tone="peach" label="Nhận diện ảnh"
          value={plan ? (plan.premium ? plan.premiumDailyScans : plan.freeDailyScans) : '—'} unit="lượt mỗi ngày" />
        <Card>
          <p className="text-sm text-ink-soft">
            Thanh toán bằng chuyển khoản ngân hàng qua payOS. MAIFit không lưu thông tin thẻ hay tài khoản của bạn.
          </p>
        </Card>
      </div>
    </div>
  );
}
