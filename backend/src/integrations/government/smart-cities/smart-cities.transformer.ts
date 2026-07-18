import { Injectable } from '@nestjs/common';
import { RecordStatus } from '@prisma/client';
import { ScrapedProject } from './smart-cities.scraper';

export interface TransformedScrapedRecord {
  title: string;
  description: string | null;
  status: RecordStatus;
  budget: number | null;
  locationSlug: string;
}

@Injectable()
export class SmartCitiesTransformer {
  transform(projects: ScrapedProject[]): TransformedScrapedRecord[] {
    return projects
      .map((p) => this.transformOne(p))
      .filter((r): r is TransformedScrapedRecord => r !== null);
  }

  private transformOne(
    project: ScrapedProject,
  ): TransformedScrapedRecord | null {
    const title = project.title?.trim();
    if (!title) return null;

    return {
      title: title.substring(0, 200),
      description: project.description?.trim().substring(0, 500) || null,
      status: this.parseStatus(project.status),
      budget: this.parseBudget(project.budgetText),
      locationSlug: project.locationSlug,
    };
  }

  private parseStatus(statusText: string | null): RecordStatus {
    if (!statusText) return RecordStatus.PLANNED;
    const s = statusText.toLowerCase();

    if (s.includes('complet') || s.includes('done')) return RecordStatus.COMPLETED;
    if (s.includes('progress') || s.includes('ongoing') || s.includes('under'))
      return RecordStatus.ONGOING;
    if (s.includes('cancel')) return RecordStatus.CANCELLED;

    return RecordStatus.PLANNED;
  }

  private parseBudget(budgetText: string | null): number | null {
    if (!budgetText) return null;

    // Extract numeric value, e.g. "₹28.5 Cr" → 28.5
    const match = budgetText.match(/[\d.]+/);
    if (!match) return null;

    const num = parseFloat(match[0]);
    if (isNaN(num)) return null;

    // Assume crore unless "lakh" is explicitly mentioned
    const isLakh = budgetText.toLowerCase().includes('lakh');
    return Math.round(num * (isLakh ? 100_000 : 10_000_000));
  }
}