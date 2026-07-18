import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CacheService } from '../../../infrastructure/cache/cache.service';
import { DataGovClient } from '../../../integrations/government/data-gov/data-gov.client';
import { DataGovTransformer } from '../../../integrations/government/data-gov/data-gov.transformer';
import { MP_DATASETS } from '../../../integrations/government/data-gov/datasets.config';
import { CsvImportService } from '../import/csv-import.service';
import { SmartCitiesScraper } from '../../../integrations/government/smart-cities/smart-cities.scraper';
import { SmartCitiesTransformer } from '../../../integrations/government/smart-cities/smart-cities.transformer';

export interface SyncResult {
  dataset: string;
  fetched: number;
  imported: number;
  skipped: number;
  failed: number;
  error?: string;
}

export interface FullSyncResult {
  startedAt: string;
  completedAt: string;
  duration: string;
  results: SyncResult[];
  totalImported: number;
  totalSkipped: number;
}

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly dataGovClient: DataGovClient,
    private readonly transformer: DataGovTransformer,
    private readonly csvImportService: CsvImportService,
    private readonly smartCitiesScraper: SmartCitiesScraper,
    private readonly smartCitiesTransformer: SmartCitiesTransformer,
  ) {}

  /**
   * Full sync — fetches all configured MP datasets from data.gov.in
   * and imports new records. Called by the nightly BullMQ worker.
   */
  async syncAll(): Promise<FullSyncResult> {
    const startedAt = new Date();
    this.logger.log('Starting full data sync from data.gov.in');

    const results: SyncResult[] = [];

    for (const dataset of MP_DATASETS) {
      this.logger.log(`Syncing dataset: ${dataset.name}`);

      try {
        // Fetch all records for this dataset filtered to MP
        const rawRecords = await this.dataGovClient.fetchAllRecords(
          dataset.resourceId,
          { state: 'Madhya Pradesh' },
        );

        if (rawRecords.length === 0) {
          results.push({
            dataset: dataset.name,
            fetched: 0,
            imported: 0,
            skipped: 0,
            failed: 0,
          });
          continue;
        }

        // Transform API records to our schema
        const transformed = this.transformer.transform(rawRecords, dataset);

        // Resolve location/category/org IDs and bulk insert
        const syncResult = await this.importTransformedRecords(
          transformed,
          dataset.name,
        );

        results.push({
          dataset: dataset.name,
          fetched: rawRecords.length,
          ...syncResult,
        });
      } catch (err) {
        this.logger.error(
          `Dataset sync failed: ${dataset.name} — ${(err as Error).message}`,
        );
        results.push({
          dataset: dataset.name,
          fetched: 0,
          imported: 0,
          skipped: 0,
          failed: 0,
          error: (err as Error).message,
        });
      }
    }

    // Invalidate search cache — new data is in
    await this.cache.delByPattern('search:*');
    await this.cache.delByPattern('ai:*'); // stale AI insights should regenerate

    const completedAt = new Date();
    const duration = `${Math.round((completedAt.getTime() - startedAt.getTime()) / 1000)}s`;

    const fullResult: FullSyncResult = {
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      duration,
      results,
      totalImported: results.reduce((sum, r) => sum + r.imported, 0),
      totalSkipped: results.reduce((sum, r) => sum + r.skipped, 0),
    };

    this.logger.log(
      `Full sync complete in ${duration}: ` +
        `${fullResult.totalImported} imported, ${fullResult.totalSkipped} skipped`,
    );

    return fullResult;
  }

  /**
   * Sync a single dataset by its index in MP_DATASETS.
   * Used for manual triggers and testing individual datasets.
   */
  async syncDataset(datasetIndex: number): Promise<SyncResult> {
    const dataset = MP_DATASETS[datasetIndex];
    if (!dataset) throw new Error(`Dataset index ${datasetIndex} not found`);

    const rawRecords = await this.dataGovClient.fetchAllRecords(
      dataset.resourceId,
      { state: 'Madhya Pradesh' },
    );

    const transformed = this.transformer.transform(rawRecords, dataset);
    const result = await this.importTransformedRecords(
      transformed,
      dataset.name,
    );

    return { dataset: dataset.name, fetched: rawRecords.length, ...result };
  }

  private async importTransformedRecords(
    records: any[],
    datasetName: string,
  ): Promise<{ imported: number; skipped: number; failed: number }> {
    // Pre-load lookup data
    const [locations, categories, organizations] = await Promise.all([
      this.prisma.location.findMany({
        select: { id: true, name: true, slug: true },
      }),
      this.prisma.category.findMany({
        select: { id: true, name: true, slug: true },
      }),
      this.prisma.organization.findMany({
        select: { id: true, name: true },
      }),
    ]);

    const locationMap = new Map(
      locations.flatMap((l) => [
        [l.name.toLowerCase(), l.id],
        [l.slug.toLowerCase(), l.id],
      ]),
    );

    const categoryMap = new Map(
      categories.flatMap((c) => [
        [c.name.toLowerCase(), c.id],
        [c.slug.toLowerCase(), c.id],
      ]),
    );

    const orgMap = new Map(
      organizations.map((o) => [o.name.toLowerCase(), o.id]),
    );

    // Get existing titles for duplicate detection
    const existing = await this.prisma.developmentRecord.findMany({
      select: { title: true, locationId: true },
    });
    const existingSet = new Set(
      existing.map((r) => `${r.title.toLowerCase()}::${r.locationId}`),
    );

    // Upsert data source for this dataset
    const dataSource = await this.prisma.dataSource.upsert({
      where: { name: `data.gov.in: ${datasetName}` },
      update: { updatedAt: new Date() },
      create: {
        name: `data.gov.in: ${datasetName}`,
        url: 'https://data.gov.in',
        description: `Automatically synced from data.gov.in dataset: ${datasetName}`,
      },
    });

    const toInsert: any[] = [];
    let skipped = 0;
    let failed = 0;

    for (const record of records) {
      // Resolve location
      const locationId = this.resolveLocation(record.rawLocation, locationMap);
      if (!locationId) {
        failed++;
        continue;
      }

      // Duplicate check
      const dupKey = `${record.title.toLowerCase()}::${locationId}`;
      if (existingSet.has(dupKey)) {
        skipped++;
        continue;
      }

      // Resolve category
      const categoryId = this.resolveCategory(record.rawCategory, categoryMap);
      if (!categoryId) {
        failed++;
        continue;
      }

      // Resolve organization (optional)
      const organizationId = record.rawOrganization
        ? this.resolveOrganization(record.rawOrganization, orgMap)
        : null;

      toInsert.push({
        title: record.title,
        description: record.description,
        status: record.status,
        budget: record.budget,
        startDate: record.startDate,
        endDate: record.endDate,
        locationId,
        categoryId,
        organizationId,
        dataSourceId: dataSource.id,
      });

      existingSet.add(dupKey);
    }

    let imported = 0;
    if (toInsert.length > 0) {
      const result = await this.prisma.developmentRecord.createMany({
        data: toInsert,
        skipDuplicates: true,
      });
      imported = result.count;
    }

    return { imported, skipped, failed };
  }

  // Same resolution helpers as CsvImportService
  private resolveLocation(
    raw: string | null,
    map: Map<string, string>,
  ): string | null {
    if (!raw) return null;
    const cleaned = raw.toLowerCase().trim();
    if (map.has(cleaned)) return map.get(cleaned)!;
    for (const [key, id] of map) {
      if (cleaned.includes(key) || key.includes(cleaned)) return id;
    }
    return null;
  }

  private resolveCategory(
    raw: string | null,
    map: Map<string, string>,
  ): string | null {
    if (!raw) return null;
    const cleaned = raw.toLowerCase().trim();
    if (map.has(cleaned)) return map.get(cleaned)!;
    for (const [key, id] of map) {
      if (cleaned.includes(key) || key.includes(cleaned)) return id;
    }
    return null;
  }

  private resolveOrganization(
    raw: string,
    map: Map<string, string>,
  ): string | null {
    const cleaned = raw.toLowerCase().trim();
    if (map.has(cleaned)) return map.get(cleaned)!;
    for (const [key, id] of map) {
      if (cleaned.includes(key) || key.includes(cleaned)) return id;
    }
    return null;
  }

  /**
   * Sync data from the Smart Cities Mission portal via web scraping.
   * Separate from syncAll() (API sync) since scraping is slower and
   * more failure-prone — admins may want to trigger it independently.
   */
  async syncSmartCities(): Promise<SyncResult> {
    this.logger.log('Starting Smart Cities Mission scrape');

    const scraped = await this.smartCitiesScraper.scrapeAll();

    if (scraped.length === 0) {
      this.logger.warn(
        'Smart Cities scraper returned 0 records — ' +
          'site structure may have changed, check selectors',
      );
      return {
        dataset: 'Smart Cities Mission (scraped)',
        fetched: 0,
        imported: 0,
        skipped: 0,
        failed: 0,
      };
    }

    const transformed = this.smartCitiesTransformer.transform(scraped);

    // Map to the shape importTransformedRecords expects
    const mapped = transformed.map((t) => ({
      title: t.title,
      description: t.description,
      status: t.status,
      budget: t.budget,
      startDate: null,
      endDate: null,
      rawLocation: t.locationSlug,
      rawCategory: 'Government Initiative', // Smart Cities projects default here
      rawOrganization: 'Smart Cities Mission',
    }));

    const result = await this.importTransformedRecords(
      mapped,
      'Smart Cities Mission (scraped)',
    );

    await this.cache.delByPattern('search:*');
    await this.cache.delByPattern('ai:*');

    this.logger.log(
      `Smart Cities scrape complete: ${result.imported} imported, ` +
        `${result.skipped} skipped, ${result.failed} failed`,
    );

    return {
      dataset: 'Smart Cities Mission (scraped)',
      fetched: scraped.length,
      ...result,
    };
  }
}
