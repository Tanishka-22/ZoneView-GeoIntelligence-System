import { PlanType } from '@prisma/client';

/** Monthly pricing in INR. Source of truth for the mock checkout amount. */
export const PLAN_PRICES: Record<PlanType, number> = {
  [PlanType.FREE]: 0,
  [PlanType.PRO]: 999,
  [PlanType.TEAM]: 4999,
};