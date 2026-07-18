/**
 * data.gov.in dataset configurations for Madhya Pradesh development data.
 *
 * Each dataset has:
 * - resourceId: the unique dataset ID on data.gov.in
 * - name: human-readable name for logging
 * - defaultCategory: fallback category if auto-classification fails
 * - fieldMap: maps API field names to our internal field names
 *
 * To find new datasets:
 * Visit https://data.gov.in/search?title=madhya+pradesh
 * Click a dataset → API tab → copy the Resource ID
 */
export interface DatasetConfig {
  resourceId: string;
  name: string;
  defaultCategory: string;
  locationField?: string;
  titleField: string;
  descriptionField?: string;
  statusField?: string;
  budgetField?: string;
  budgetUnit?: 'crore' | 'lakh' | 'rupee';
  organizationField?: string;
  startDateField?: string;
  endDateField?: string;
}

export const MP_DATASETS: DatasetConfig[] = [
  {
    resourceId: '6176b4dc-1459-417c-a09c-ccea0b36498c',
    name: 'Smart City Projects MP',
    defaultCategory: 'Government Initiative',
    titleField: 'project_name',
    descriptionField: 'project_description',
    locationField: 'city',
    statusField: 'current_status',
    budgetField: 'project_cost',
    budgetUnit: 'crore',
    organizationField: 'implementing_agency',
    startDateField: 'start_date',
    endDateField: 'expected_completion_date',
  },
  {
    resourceId: '2ecb7d19-b0b0-4a21-adca-45b4f15e9b44',
    name: 'PMAY Urban Projects MP',
    defaultCategory: 'Housing',
    titleField: 'project_name',
    locationField: 'ulb_name',
    statusField: 'status',
    budgetField: 'project_cost_in_lakh',
    budgetUnit: 'lakh',
    organizationField: 'state',
  },
  {
    resourceId: '9ef84268-d588-465a-a308-a864a43d0070',
    name: 'PMGSY Road Projects MP',
    defaultCategory: 'Transportation',
    titleField: 'road_name',
    descriptionField: 'work_description',
    locationField: 'district_name',
    statusField: 'work_status',
    budgetField: 'sanctioned_cost',
    budgetUnit: 'lakh',
    organizationField: 'executing_agency',
  },
];