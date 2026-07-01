import { PlanType } from '@prisma/client';

/**
 * Feature usage limits per plan per billing cycle.
 * -1 means unlimited.
 *
 * These are the source of truth for quota enforcement.
 * Changing limits here affects all users immediately —
 * no database migration required for limit adjustments.
 */
export const PLAN_LIMITS: Record<PlanType, Record<string, number>> = {
  [PlanType.FREE]: {
    AI_INSIGHT: 20,
    AI_REPORT: 2,
    LOCATION_SEARCH: 100,
    REGION_COMPARE: 5,
  },
  [PlanType.PRO]: {
    AI_INSIGHT: 500,
    AI_REPORT: 50,
    LOCATION_SEARCH: -1, // unlimited
    REGION_COMPARE: -1,
  },
  [PlanType.TEAM]: {
    AI_INSIGHT: 5000,
    AI_REPORT: 500,
    LOCATION_SEARCH: -1,
    REGION_COMPARE: -1,
  },
};

/** Returns the billing cycle key for the current month: "2026-01" */
export function getCurrentBillingCycle(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}
