import { useEffect, useState } from 'react';
import { paymentApi } from '../apis/paymentApi';
import { getErrorMessage } from '../constants/errorMessages';
import type { PaymentOrder, PremiumPlan } from '../types/payment';

const POLL_MS = 3000;

// Buying Premium by bank transfer (QR). The page never grants Premium: the backend creates the order,
// the page shows the QR and waits; only the server marks it PAID (gateway's signed notice, or asking
// the gateway itself on "Tôi đã chuyển khoản"). Then the plan is read again.
export function usePremiumCheckout() {
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
          if (!ignore) setOrder(latest);
        })
        .catch(() => {}); // a failed poll is retried by the next one
    }, POLL_MS);
    return () => {
      ignore = true;
      window.clearInterval(tick);
      window.clearInterval(poll);
    };
  }, [waiting, orderCode]);

  // The order just became PAID: Premium time changed on the server, read the plan again.
  // Its own effect on purpose: the polling effect is cleaned up the moment the order stops being PENDING.
  const paidOrderCode = order?.state === 'PAID' ? order.orderCode : undefined;
  useEffect(() => {
    if (paidOrderCode === undefined) return;
    let ignore = false;
    paymentApi
      .plan()
      .then((data) => {
        if (!ignore) setPlan(data);
      })
      .catch(() => {}); // a reload shows the new plan
    return () => {
      ignore = true;
    };
  }, [paidOrderCode]);

  // Creates an order, or gets back the one still waiting (the server never makes two)
  async function checkout() {
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
  async function refresh() {
    if (!order) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const latest = await paymentApi.refresh(order.orderCode);
      setOrder(latest);
      if (latest.state !== 'PAID') {
        setNotice('Chưa thấy tiền về. Ngân hàng có thể mất khoảng một phút, trang này sẽ tự cập nhật.');
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  // The dialog was closed after a payment or an expired code: start clean next time
  function clearFinished() {
    if (order && order.state !== 'PENDING') setOrder(null);
    if (order && order.state === 'PENDING' && secondsLeft === 0) setOrder(null);
    setError(null);
    setNotice(null);
  }

  const paid = order?.state === 'PAID';
  const expired = order != null && !paid && !waiting;

  return { plan, order, secondsLeft, waiting, paid, expired, error, notice, busy, checkout, refresh, clearFinished };
}

export type PremiumCheckout = ReturnType<typeof usePremiumCheckout>;
