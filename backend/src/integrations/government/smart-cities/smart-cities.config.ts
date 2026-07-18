/**
 * Smart Cities Mission portal configuration.
 *
 * IMPORTANT: The actual smartcities.gov.in site structure changes over time
 * and may require JavaScript rendering for some sections. The selectors below
 * are illustrative — before running this in production, inspect the live
 * page's HTML (View Source / DevTools) and adjust selectors to match.
 *
 * This scraper is defensive by design: if selectors don't match, it logs
 * a warning and returns an empty array rather than crashing.
 */

export interface CityScraperConfig {
  cityName: string;
  locationSlug: string;
  // URL pattern for a city's project listing page
  url: string;
}

export const SMART_CITIES_TARGETS: CityScraperConfig[] = [
  {
    cityName: 'Jabalpur',
    locationSlug: 'jabalpur',
    url: 'https://smartcities.gov.in/city-info/jabalpur',
  },
  {
    cityName: 'Bhopal',
    locationSlug: 'bhopal',
    url: 'https://smartcities.gov.in/city-info/bhopal',
  },
  {
    cityName: 'Indore',
    locationSlug: 'indore',
    url: 'https://smartcities.gov.in/city-info/indore',
  },
];

/**
 * CSS selectors for project data on a city page.
 * These are the parts most likely to need adjustment if the site changes.
 */
export const SCRAPER_SELECTORS = {
  projectRow: '.project-item, .project-card, table.projects-table tbody tr',
  projectTitle: '.project-title, .project-name, td:nth-child(1)',
  projectStatus: '.project-status, .status, td:nth-child(2)',
  projectBudget: '.project-cost, .cost, td:nth-child(3)',
  projectDescription: '.project-description, .description',
};