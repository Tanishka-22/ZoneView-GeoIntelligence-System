import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';
import {
  SMART_CITIES_TARGETS,
  SCRAPER_SELECTORS,
  CityScraperConfig,
} from './smart-cities.config';

export interface ScrapedProject {
  title: string;
  status: string | null;
  budgetText: string | null;
  description: string | null;
  cityName: string;
  locationSlug: string;
}

@Injectable()
export class SmartCitiesScraper {
  private readonly logger = new Logger(SmartCitiesScraper.name);

  // Identify ourselves honestly — never impersonate a browser to bypass restrictions
  private readonly USER_AGENT = 'ZoneView-DataBot/1.0 (+https://zoneview.app/about-bot)';
  private readonly REQUEST_TIMEOUT_MS = 15000;
  private readonly DELAY_BETWEEN_REQUESTS_MS = 2000; // be polite between city pages

  /**
   * Scrape all configured city pages and return combined project data.
   * Each city is fetched sequentially with a delay — we are a guest
   * on this server and should not hammer it with concurrent requests.
   */
  async scrapeAll(): Promise<ScrapedProject[]> {
    const allProjects: ScrapedProject[] = [];

    for (const target of SMART_CITIES_TARGETS) {
      try {
        const projects = await this.scrapeCity(target);
        allProjects.push(...projects);

        this.logger.log(
          `Scraped ${projects.length} projects from ${target.cityName}`,
        );
      } catch (err) {
        // One city failing should not stop the others
        this.logger.error(
          `Failed to scrape ${target.cityName}: ${(err as Error).message}`,
        );
      }

      await this.sleep(this.DELAY_BETWEEN_REQUESTS_MS);
    }

    return allProjects;
  }

  async scrapeCity(target: CityScraperConfig): Promise<ScrapedProject[]> {
    if (!(await this.isAllowedByRobotsTxt(target.url))) {
      this.logger.warn(
        `Skipping ${target.cityName} — disallowed by robots.txt`,
      );
      return [];
    }

    const html = await this.fetchPage(target.url);
    if (!html) return [];

    return this.parseProjects(html, target);
  }

  // ─── HTML Fetching ────────────────────────────────────────────

  private async fetchPage(url: string): Promise<string | null> {
    try {
      const response = await axios.get(url, {
        timeout: this.REQUEST_TIMEOUT_MS,
        headers: {
          'User-Agent': this.USER_AGENT,
          Accept: 'text/html,application/xhtml+xml',
        },
      });

      return response.data as string;
    } catch (err) {
      const error = err as any;
      this.logger.warn(
        `Failed to fetch ${url}: ${error.response?.status ?? error.message}`,
      );
      return null;
    }
  }

  // ─── robots.txt Compliance ────────────────────────────────────

  /**
   * Basic robots.txt check — fetches the robots.txt for the domain
   * and checks whether our path is disallowed for all user agents.
   * This is a simple implementation, not a full robots.txt parser —
   * production scraping at scale would use a dedicated library.
   */
  private async isAllowedByRobotsTxt(url: string): Promise<boolean> {
    try {
      const { origin, pathname } = new URL(url);
      const robotsUrl = `${origin}/robots.txt`;

      const response = await axios.get(robotsUrl, {
        timeout: 5000,
        headers: { 'User-Agent': this.USER_AGENT },
      });

      const robotsTxt = response.data as string;
      const lines = robotsTxt.split('\n').map((l) => l.trim());

      let applies = false;
      for (const line of lines) {
        if (line.toLowerCase().startsWith('user-agent:')) {
          const agent = line.split(':')[1]?.trim();
          applies = agent === '*';
        }
        if (applies && line.toLowerCase().startsWith('disallow:')) {
          const disallowedPath = line.split(':')[1]?.trim();
          if (disallowedPath && pathname.startsWith(disallowedPath)) {
            return false;
          }
        }
      }

      return true;
    } catch {
      // If robots.txt is unreachable or doesn't exist, default to allowed
      return true;
    }
  }

  // ─── HTML Parsing ─────────────────────────────────────────────

  private parseProjects(
    html: string,
    target: CityScraperConfig,
  ): ScrapedProject[] {
    const $ = cheerio.load(html);
    const projects: ScrapedProject[] = [];

    const rows = $(SCRAPER_SELECTORS.projectRow);

    if (rows.length === 0) {
      this.logger.warn(
        `No project rows found for ${target.cityName} — ` +
        `selectors may need updating for the current site structure`,
      );
      return [];
    }

    rows.each((_, element) => {
      const $row = $(element);

      const title = this.extractText($row, SCRAPER_SELECTORS.projectTitle);
      if (!title) return; // skip rows with no title — likely a header row

      const status = this.extractText($row, SCRAPER_SELECTORS.projectStatus);
      const budgetText = this.extractText($row, SCRAPER_SELECTORS.projectBudget);
      const description = this.extractText(
        $row,
        SCRAPER_SELECTORS.projectDescription,
      );

      projects.push({
        title,
        status,
        budgetText,
        description,
        cityName: target.cityName,
        locationSlug: target.locationSlug,
      });
    });

    return projects;
  }

  private extractText(
    $row: cheerio.Cheerio<any>,
    selector: string,
  ): string | null {
    // Try each comma-separated selector option until one matches
    const selectors = selector.split(',').map((s) => s.trim());

    for (const sel of selectors) {
      const text = $row.find(sel).first().text().trim();
      if (text) return text;
    }

    return null;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}