import { Injectable, Logger } from '@nestjs/common';
import { parse } from 'csv-parse';
import { Readable } from 'stream';
import { PrismaService } from '../../../database/prisma.service';
import { ImportResult, ImportError } from './dto/import-result.dto';
import { RecordStatus } from '@prisma/client';

/**
 * Expected CSV column headers (case-insensitive).
 * Government CSVs use varying header names — we map common variants.
 */
const HEADER_MAP: Record<string, string> = {
  // title variants
  'project name': 'title',
  'project title': 'title',
  'name of project': 'title',
  'scheme name': 'title',
  'work name': 'title',
  title: 'title',

  // description variants
  description: 'description',
  details: 'description',
  'project details': 'description',
  remarks: 'description',

  // location variants
  location: 'location',
  city: 'location',
  district: 'location',
  'city/district': 'location',
  'location/city': 'location',

  // status variants
  status: 'status',
  'project status': 'status',
  'current status': 'status',
  'work status': 'status',

  // budget variants
  budget: 'budget',
  'project cost': 'budget',
  'estimated cost': 'budget',
  'total cost': 'budget',
  'cost (cr)': 'budget',
  'cost (crore)': 'budget',
  'amount (lakhs)': 'budget_lakhs',

  // category variants
  category: 'category',
  sector: 'category',
  'project type': 'category',
  type: 'category',
  domain: 'category',

  // organization variants
  organization: 'organization',
  agency: 'organization',
  'implementing agency': 'organization',
  department: 'organization',
  'nodal agency': 'organization',

  // date variants
  'start date': 'startDate',
  'commencement date': 'startDate',
  'date of commencement': 'startDate',
  'end date': 'endDate',
  'completion date': 'endDate',
  'expected completion': 'endDate',
};

/**
 * Keywords used to auto-classify records into categories.
 * Order matters — more specific keywords should come first.
 */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Transportation: [
    'road', 'highway', 'bridge', 'flyover', 'metro', 'railway', 'bus',
    'transport', 'traffic', 'airport', 'underpass', 'overpass', 'brt',
    'corridor', 'expressway', 'nhai', 'pwd road',
  ],
  Healthcare: [
    'hospital', 'health', 'medical', 'clinic', 'dispensary', 'aiims',
    'ayushman', 'wellness', 'doctor', 'nursing', 'pharmacy', 'healthcare',
  ],
  Education: [
    'school', 'college', 'university', 'education', 'library', 'skill',
    'training center', 'polytechnic', 'iit', 'institute', 'vidyalaya',
  ],
  Environment: [
    'park', 'garden', 'green', 'tree', 'environment', 'lake', 'river',
    'narmada', 'waterfront', 'pollution', 'waste', 'sewage', 'drainage',
    'solar', 'renewable', 'eco',
  ],
  Utilities: [
    'water supply', 'electricity', 'power', 'street light', 'sewage',
    'drainage', 'pipeline', 'gas', 'wifi', 'broadband', 'telecom',
    'smart meter', 'water treatment',
  ],
  'Government Initiative': [
    'smart city', 'digital', 'e-governance', 'command', 'control centre',
    'surveillance', 'cctv', 'iccc', 'pm awas', 'pmay', 'amrut',
    'swachh bharat', 'ayushman', 'scheme', 'mission', 'yojana',
  ],
  Housing: [
    'housing', 'residential', 'flat', 'apartment', 'colony', 'awas',
    'township', 'rera', 'affordable housing',
  ],
  Commercial: [
    'market', 'mall', 'commercial', 'industrial', 'sez', 'trade',
    'business park', 'warehouse', 'logistics',
  ],
};

@Injectable()
export class CsvImportService {
  private readonly logger = new Logger(CsvImportService.name);

  constructor(private readonly prisma: PrismaService) {}

  async importFromBuffer(
    buffer: Buffer,
    filename: string,
  ): Promise<ImportResult> {
    const startTime = Date.now();
    this.logger.log(`Starting CSV import: ${filename}`);

    // Parse the CSV into raw rows
    const rows = await this.parseCSV(buffer);

    if (rows.length === 0) {
      return {
        imported: 0, skipped: 0, failed: 0, total: 0,
        errors: [{ row: 0, reason: 'CSV file is empty or has no valid rows' }],
        duration: '0ms',
      };
    }

    this.logger.log(`Parsed ${rows.length} rows from ${filename}`);

    // Pre-load lookup data once — avoids N+1 queries during import
    const [locations, categories, organizations] = await Promise.all([
      this.prisma.location.findMany({ select: { id: true, name: true, slug: true } }),
      this.prisma.category.findMany({ select: { id: true, name: true, slug: true } }),
      this.prisma.organization.findMany({ select: { id: true, name: true } }),
    ]);

    // Build lookup maps for O(1) access
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

    // Get existing titles to detect duplicates
    const existingRecords = await this.prisma.developmentRecord.findMany({
      select: { title: true, locationId: true },
    });

    const existingSet = new Set(
      existingRecords.map((r) => `${r.title.toLowerCase()}::${r.locationId}`),
    );

    // Create a default data source for CSV imports
    const csvDataSource = await this.prisma.dataSource.upsert({
      where: { name: `CSV Import: ${filename}` },
      update: {},
      create: {
        name: `CSV Import: ${filename}`,
        description: `Data imported from CSV file: ${filename}`,
      },
    });

    // Process each row
    const errors: ImportError[] = [];
    const toInsert: any[] = [];
    let skipped = 0;

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 2; // +2 because row 1 is header, and arrays are 0-indexed
      const raw = rows[i];

      try {
        // Validate required fields
        if (!raw.title?.trim()) {
          errors.push({ row: rowNum, reason: 'Missing required field: title' });
          continue;
        }

        // Resolve location
        const locationId = this.resolveLocation(raw.location, locationMap);
        if (!locationId) {
          errors.push({
            row: rowNum,
            title: raw.title,
            reason: `Location not found: "${raw.location || 'not specified'}". ` +
              `Available: ${[...locationMap.keys()].filter((_, i) => i % 2 === 0).join(', ')}`,
          });
          continue;
        }

        // Duplicate detection
        const dupKey = `${raw.title.toLowerCase().trim()}::${locationId}`;
        if (existingSet.has(dupKey)) {
          this.logger.debug(`Skipping duplicate: ${raw.title}`);
          skipped++;
          continue;
        }

        // Resolve or auto-detect category
        const categoryId = this.resolveCategory(raw.category, raw.title, raw.description, categoryMap);
        if (!categoryId) {
          errors.push({
            row: rowNum,
            title: raw.title,
            reason: `Could not classify into any category. ` +
              `Provide a "category" column with one of: ${[...categoryMap.keys()].filter((_, i) => i % 2 === 0).join(', ')}`,
          });
          continue;
        }

        // Resolve optional organization
        const organizationId = raw.organization
          ? this.resolveOrganization(raw.organization, orgMap)
          : null;

        // Parse budget — handle crore and lakh notation
        const budget = this.parseBudget(raw.budget, raw.budget_lakhs);

        // Parse status
        const status = this.parseStatus(raw.status);

        // Parse dates
        const startDate = this.parseDate(raw.startDate);
        const endDate = this.parseDate(raw.endDate);

        toInsert.push({
          title: raw.title.trim(),
          description: raw.description?.trim() || null,
          status,
          budget,
          startDate,
          endDate,
          locationId,
          categoryId,
          organizationId,
          dataSourceId: csvDataSource.id,
        });

        // Add to duplicate detection set to prevent intra-file duplicates
        existingSet.add(dupKey);

      } catch (err) {
        errors.push({
          row: rowNum,
          title: raw.title,
          reason: `Unexpected error: ${(err as Error).message}`,
        });
      }
    }

    // Bulk insert valid records
    let imported = 0;
    if (toInsert.length > 0) {
      const result = await this.prisma.developmentRecord.createMany({
        data: toInsert,
        skipDuplicates: true,
      });
      imported = result.count;
    }

    const duration = `${Date.now() - startTime}ms`;

    this.logger.log(
      `Import complete: ${imported} imported, ${skipped} skipped, ` +
      `${errors.length} failed in ${duration}`,
    );

    return {
      imported,
      skipped,
      failed: errors.length,
      total: rows.length,
      errors,
      duration,
    };
  }

  // ─── Private Helpers ──────────────────────────────────────────

  private async parseCSV(buffer: Buffer): Promise<Record<string, string>[]> {
    return new Promise((resolve, reject) => {
      const rows: Record<string, string>[] = [];

      const parser = parse({
        columns: (headers: string[]) =>
          headers.map((h) => this.normalizeHeader(h)),
        skip_empty_lines: true,
        trim: true,
        bom: true, // handle BOM in Excel-exported CSVs
      });

      parser.on('readable', () => {
        let row;
        while ((row = parser.read()) !== null) {
          rows.push(row);
        }
      });

      parser.on('error', reject);
      parser.on('end', () => resolve(rows));

      Readable.from(buffer).pipe(parser);
    });
  }

  private normalizeHeader(header: string): string {
    const cleaned = header.toLowerCase().trim().replace(/\s+/g, ' ');
    return HEADER_MAP[cleaned] ?? cleaned.replace(/\s+/g, '_');
  }

  private resolveLocation(
    locationStr: string | undefined,
    locationMap: Map<string, string>,
  ): string | null {
    if (!locationStr) return null;

    const cleaned = locationStr.toLowerCase().trim();

    // Exact match first
    if (locationMap.has(cleaned)) return locationMap.get(cleaned)!;

    // Partial match — "jabalpur district" → "jabalpur"
    for (const [key, id] of locationMap) {
      if (cleaned.includes(key) || key.includes(cleaned)) return id;
    }

    return null;
  }

  private resolveCategory(
    categoryStr: string | undefined,
    title: string,
    description: string | undefined,
    categoryMap: Map<string, string>,
  ): string | null {
    // Try explicit category field first
    if (categoryStr) {
      const cleaned = categoryStr.toLowerCase().trim();
      if (categoryMap.has(cleaned)) return categoryMap.get(cleaned)!;

      // Partial match
      for (const [key, id] of categoryMap) {
        if (cleaned.includes(key) || key.includes(cleaned)) return id;
      }
    }

    // Auto-classify from title and description
    const text = `${title} ${description ?? ''}`.toLowerCase();

    for (const [categoryName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          const id = categoryMap.get(categoryName.toLowerCase());
          if (id) return id;
        }
      }
    }

    return null;
  }

  private resolveOrganization(
    orgStr: string,
    orgMap: Map<string, string>,
  ): string | null {
    const cleaned = orgStr.toLowerCase().trim();

    if (orgMap.has(cleaned)) return orgMap.get(cleaned)!;

    for (const [key, id] of orgMap) {
      if (cleaned.includes(key) || key.includes(cleaned)) return id;
    }

    return null;
  }

  private parseBudget(
    budgetCrore?: string,
    budgetLakhs?: string,
  ): number | null {
    // Try crore value first
    if (budgetCrore) {
      const num = parseFloat(budgetCrore.replace(/[^0-9.]/g, ''));
      if (!isNaN(num)) return Math.round(num * 10000000); // crore → rupees
    }

    // Try lakh value
    if (budgetLakhs) {
      const num = parseFloat(budgetLakhs.replace(/[^0-9.]/g, ''));
      if (!isNaN(num)) return Math.round(num * 100000); // lakh → rupees
    }

    return null;
  }

  private parseStatus(statusStr?: string): RecordStatus {
    if (!statusStr) return RecordStatus.PLANNED;

    const s = statusStr.toLowerCase().trim();

    if (s.includes('complet') || s.includes('done') || s.includes('finish')) {
      return RecordStatus.COMPLETED;
    }
    if (
      s.includes('ongoing') || s.includes('progress') ||
      s.includes('under') || s.includes('active') || s.includes('running')
    ) {
      return RecordStatus.ONGOING;
    }
    if (s.includes('cancel') || s.includes('drop') || s.includes('abandon')) {
      return RecordStatus.CANCELLED;
    }

    return RecordStatus.PLANNED;
  }

  private parseDate(dateStr?: string): Date | null {
    if (!dateStr?.trim()) return null;

    // Try common Indian date formats
    const formats = [
      // DD/MM/YYYY or DD-MM-YYYY
      /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/,
      // YYYY-MM-DD (ISO)
      /^(\d{4})-(\d{2})-(\d{2})$/,
      // MM/YYYY or MM-YYYY
      /^(\d{1,2})[\/\-](\d{4})$/,
    ];

    for (const format of formats) {
      const match = dateStr.trim().match(format);
      if (match) {
        try {
          let date: Date;
          if (match.length === 4) {
            // DD/MM/YYYY
            if (match[3].length === 4) {
              date = new Date(`${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`);
            } else {
              // YYYY-MM-DD
              date = new Date(`${match[1]}-${match[2]}-${match[3]}`);
            }
          } else {
            // MM/YYYY — use first day of month
            date = new Date(`${match[2]}-${match[1].padStart(2, '0')}-01`);
          }

          if (!isNaN(date.getTime())) return date;
        } catch {
          continue;
        }
      }
    }

    // Try native Date parsing as last resort
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
}