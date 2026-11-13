import { useEffect, useState } from 'react';
import { paymentApi } from '../apis/paymentApi';

// Premium status for the avatar ring. The User from login has no premium field, so it is read from the plan.
// A failed request shows the normal ring: the ring is decoration, never a gate (the server enforces limits).
export function usePremium(): boolean {
  const [premium, setPremium] = useState(false);

  useEffect(() => {
    let ignore = false;
    paymentApi
      .plan()
      .then((plan) => {
        if (!ignore) setPremium(plan.premium);
      })
      .catch(() => {
        // keep the normal ring
      });
    return () => {
      ignore = true;
    };
  }, []);

  return premium;
}
