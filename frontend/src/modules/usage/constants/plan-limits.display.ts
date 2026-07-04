/**
 * Frontend copy of plan limits for display purposes.
 * -1 = unlimited.
 * Keep in sync with backend plan-limits.constants.ts.
 */
export const PLAN_LIMITS_DISPLAY: Record<string, Record<string, number>> = {
  FREE: {
    AI_INSIGHT: 20,
    AI_REPORT: 2,
    LOCATION_SEARCH: 100,
    REGION_COMPARE: 5,
  },
  PRO: {
    AI_INSIGHT: 500,
    AI_REPORT: 50,
    LOCATION_SEARCH: -1,
    REGION_COMPARE: -1,
  },
  TEAM: {
    AI_INSIGHT: 5000,
    AI_REPORT: 500,
    LOCATION_SEARCH: -1,
    REGION_COMPARE: -1,
  },
};