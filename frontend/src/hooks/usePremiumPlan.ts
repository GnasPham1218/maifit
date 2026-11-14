import { useEffect, useState } from 'react';
import { paymentApi } from '../apis/paymentApi';
import type { PremiumPlan } from '../types/payment';

// The user's plan (premium or not, daily limits, price). null while loading or when the request failed:
// callers then show the neutral version. Never a gate: the server enforces every limit.
export function usePremiumPlan(): PremiumPlan | null {
  const [plan, setPlan] = useState<PremiumPlan | null>(null);

  useEffect(() => {
    let ignore = false;
    paymentApi
      .plan()
      .then((data) => {
        if (!ignore) setPlan(data);
      })
      .catch(() => {
        // keep null
      });
    return () => {
      ignore = true;
    };
  }, []);

  return plan;
}
