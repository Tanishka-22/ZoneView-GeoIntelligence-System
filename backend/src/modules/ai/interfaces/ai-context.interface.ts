/**
 * The structured context objects passed to PromptBuilder.
 *
 * These define exactly what data the AI has access to for each
 * type of analysis. Keeping these as explicit interfaces means:
 * - TypeScript catches missing fields at compile time
 * - It's clear what data each prompt type needs
 * - Context can be validated before being passed to the AI
 */

export interface LocationStats {
  totalProjects: number;
  ongoingProjects: number;
  completedProjects: number;
  plannedProjects: number;
  cancelledProjects: number;
  totalBudgetCrore: number; // in crores for readability
}

export interface DevelopmentRecordSummary {
  title: string;
  status: string;
  category: string;
  organization: string | null;
  budgetCrore: number | null;
  startDate: string | null;
  endDate: string | null;
}

export interface LocationContext {
  name: string;
  state: string | null;
  district: string | null;
  description: string | null;
  stats: LocationStats;
  developments: DevelopmentRecordSummary[];
  organizationNames: string[];
  categoryNames: string[];
}

export interface DevelopmentRecordContext {
  title: string;
  description: string | null;
  status: string;
  category: string;
  organization: string | null;
  budgetCrore: number | null;
  startDate: string | null;
  endDate: string | null;
  locationName: string;
  locationState: string | null;
}

export interface ComparisonContext {
  locations: LocationContext[];
}