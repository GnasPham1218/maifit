import { usePremiumPlan } from './usePremiumPlan';

// Premium status for the avatar ring. The User from login has no premium field, so it is read from the plan.
// A failed request shows the normal ring: the ring is decoration, never a gate (the server enforces limits).
export function usePremium(): boolean {
  return usePremiumPlan()?.premium ?? false;
}
