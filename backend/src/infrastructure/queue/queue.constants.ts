/**
 * Queue names — every queue in ZoneView is named here.
 * Using constants prevents typos when referencing queues
 * across producers (API) and consumers (workers).
 */
export const QUEUES = {
  REPORTS: 'reports',
  NOTIFICATIONS: 'notifications',
  AI_GENERATION: 'ai-generation',
} as const;

/**
 * Job names within each queue.
 * A queue can have multiple job types — naming them lets workers
 * handle different jobs with different processors.
 */
export const JOBS = {
  REPORT: {
    GENERATE: 'generate-report',
  },
  NOTIFICATION: {
    SEND: 'send-notification',
  },
  AI: {
    GENERATE_INSIGHT: 'generate-insight',
  },
} as const;