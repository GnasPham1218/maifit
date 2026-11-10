// Mirrors the backend DTOs in payment/dto
export type PaymentOrderState = 'PENDING' | 'PAID' | 'EXPIRED';

export interface PaymentOrder {
  orderCode: number;
  amount: number; // VND
  premiumDays: number;
  state: PaymentOrderState;
  expiresAt: string; // ISO-8601, UTC
  paidAt: string | null;
  // Transfer details: only while the order can still be paid (state PENDING)
  qrSvg: string | null; // SVG markup made by our backend, shown through an <img> data URL
  bankBin: string | null;
  accountNumber: string | null;
  accountName: string | null;
  description: string | null; // transfer content
}

export interface PremiumPlan {
  premium: boolean;
  premiumUntil: string | null; // may be in the past
  price: number; // VND for one purchase
  days: number; // Premium days one purchase adds
  freeDailyScans: number;
  premiumDailyScans: number;
  pendingOrder: PaymentOrder | null; // an order still waiting for payment
}
