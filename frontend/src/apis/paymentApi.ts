import type { PaymentOrder, PremiumPlan, Pricing } from '../types/payment';
import { api } from './client';

export const paymentApi = {
  plan: () => api<PremiumPlan>('/payments/plan'),

  // Public: visitors see the real price and limits (no login, no token)
  pricing: () => api<Pricing>('/payments/pricing', { auth: false }),

  // No body: the price comes from the server. Returns the order still waiting for payment if there is one.
  checkout: () => api<PaymentOrder>('/payments/checkout', { method: 'POST' }),

  // Reads our database only (cheap, polled while the QR is shown)
  get: (orderCode: number) => api<PaymentOrder>(`/payments/orders/${orderCode}`),

  // "I have paid": the backend asks the payment gateway right now
  refresh: (orderCode: number) => api<PaymentOrder>(`/payments/orders/${orderCode}/refresh`, { method: 'POST' }),
};
