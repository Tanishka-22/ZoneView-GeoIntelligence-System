import { Injectable, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AppException } from '../../../common/exceptions/app.exception';
import {
  LocationContext,
  LocationStats,
  DevelopmentRecordSummary,
  DevelopmentRecordContext,
  ComparisonContext,
} from '../interfaces/ai-context.interface';

@Injectable()
export class ContextBuilderService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Location Context ─────────────────────────────────────────

  async buildLocationContext(locationId: string): Promise<LocationContext> {
    // Fetch location with all its development records and relations
    const location = await this.prisma.location.findUnique({
      where: { id: locationId },
      include: {
        developmentRecords: {
          include: {
            category: true,
            organization: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!location) {
      throw new AppException(
        'Location not found',
        'LOCATION_NOT_FOUND',
        HttpStatus.NOT_FOUND,
      );
    }

    const developments = location.developmentRecords;

    // Compute stats from actual data — AI should reference these numbers,
    // not try to count from the list itself (which can introduce errors)
    const stats: LocationStats = {
      totalProjects: developments.length,
      ongoingProjects: developments.filter((d) => d.status === 'ONGOING').length,
      completedProjects: developments.filter((d) => d.status === 'COMPLETED').length,
      plannedProjects: developments.filter((d) => d.status === 'PLANNED').length,
      cancelledProjects: developments.filter((d) => d.status === 'CANCELLED').length,
      totalBudgetCrore: this.sumBudgetToCrore(
        developments.map((d) => d.budget).filter(Boolean) as number[],
      ),
    };

    // Summarize each development record for the prompt —
    // we don't dump the full record (too many tokens), just the key fields
    const developmentSummaries: DevelopmentRecordSummary[] = developments.map(
      (d) => ({
        title: d.title,
        status: d.status,
        category: d.category.name,
        organization: d.organization?.name ?? null,
        budgetCrore: d.budget ? this.toCrore(d.budget) : null,
        startDate: d.startDate ? this.formatDate(d.startDate) : null,
        endDate: d.endDate ? this.formatDate(d.endDate) : null,
      }),
    );

    // Unique organizations and categories — for the AI to understand
    // who is building what without having to parse each record
    const organizationNames = [
      ...new Set(
        developments
          .map((d) => d.organization?.name)
          .filter(Boolean) as string[],
      ),
    ];

    const categoryNames = [
      ...new Set(developments.map((d) => d.category.name)),
    ];

    return {
      name: location.name,
      state: location.state,
      district: location.district,
      description: location.description,
      stats,
      developments: developmentSummaries,
      organizationNames,
      categoryNames,
    };
  }

  // ─── Development Record Context ───────────────────────────────

  async buildDevelopmentRecordContext(
    recordId: string,
  ): Promise<DevelopmentRecordContext> {
    const record = await this.prisma.developmentRecord.findUnique({
      where: { id: recordId },
      include: {
        category: true,
        organization: true,
        location: true,
      },
    });

    if (!record) {
      throw new AppException(
        'Development record not found',
        'DEVELOPMENT_RECORD_NOT_FOUND',
        HttpStatus.NOT_FOUND,
      );
    }

    return {
      title: record.title,
      description: record.description,
      status: record.status,
      category: record.category.name,
      organization: record.organization?.name ?? null,
      budgetCrore: record.budget ? this.toCrore(record.budget) : null,
      startDate: record.startDate ? this.formatDate(record.startDate) : null,
      endDate: record.endDate ? this.formatDate(record.endDate) : null,
      locationName: record.location.name,
      locationState: record.location.state,
    };
  }

  // ─── Comparison Context ───────────────────────────────────────

  async buildComparisonContext(locationIds: string[]): Promise<ComparisonContext> {
    const locations = await Promise.all(
      locationIds.map((id) => this.buildLocationContext(id)),
    );

    return { locations };
  }

  // ─── Private Helpers ──────────────────────────────────────────

  private toCrore(amount: number): number {
    return Math.round((amount / 10000000) * 100) / 100; // round to 2 decimal places
  }

  private sumBudgetToCrore(amounts: number[]): number {
    const total = amounts.reduce((sum, a) => sum + a, 0);
    return this.toCrore(total);
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
    });
  }
}