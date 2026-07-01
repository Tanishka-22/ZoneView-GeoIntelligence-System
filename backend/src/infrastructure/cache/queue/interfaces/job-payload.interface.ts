/**
 * Type-safe job payloads for every job type.
 *
 * When a job is added to the queue, its payload must match
 * the interface defined here. When a worker processes it,
 * it receives a typed payload — no guessing what fields exist.
 */

export interface GenerateReportPayload {
  reportId: string;    // the Report record already created in the DB
  locationId: string;  // which location to report on
  userId: string;      // who requested the report
}

export interface SendNotificationPayload {
  userId: string;
  title: string;
  message: string;
}

export interface GenerateInsightPayload {
  insightType: 'location' | 'development';
  entityId: string;
}