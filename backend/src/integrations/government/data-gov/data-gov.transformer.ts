import { Injectable, Logger } from '@nestjs/common';
import { DatasetConfig } from './datasets.config';
import { RecordStatus } from '@prisma/client';

export interface TransformedRecord {
  title: string;
  description: string | null;
  status: RecordStatus;
  budget: number | null;
  startDate: Date | null;
  endDate: Date | null;
  rawLocation: string | null; // resolved to locationId by ingestion service
  rawCategory: string | null; // resolved to categoryId by ingestion service
  rawOrganization: string | null; // resolved to organizationId by ingestion service
}

@Injectable()
export class DataGovTransformer {
  private readonly logger = new Logger(DataGovTransformer.name);

  transform(
    records: Record<string, string>[],
    config: DatasetConfig,
  ): TransformedRecord[] {
    const transformed: TransformedRecord[] = [];

    for (const record of records) {
      try {
        const title = this.extractField(record, config.titleField);

        // Skip records with no title — useless for ZoneView
        if (!title?.trim()) continue;

        transformed.push({
          title: this.cleanText(title) ?? title,
          description: config.descriptionField
            ? this.cleanText(this.extractField(record, config.descriptionField))
            : null,
          status: this.parseStatus(
            config.statusField ? record[config.statusField] : null,
          ),
          budget: this.parseBudget(
            config.budgetField ? record[config.budgetField] : null,
            config.budgetUnit ?? 'rupee',
          ),
          startDate: this.parseDate(
            config.startDateField ? record[config.startDateField] : null,
          ),
          endDate: this.parseDate(
            config.endDateField ? record[config.endDateField] : null,
          ),
          rawLocation: config.locationField
            ? (record[config.locationField] ?? null)
            : null,
          rawCategory: config.defaultCategory,
          rawOrganization: config.organizationField
            ? (record[config.organizationField] ?? null)
            : null,
        });
      } catch {
        this.logger.warn(
          `Failed to transform record: ${JSON.stringify(record).substring(0, 100)}`,
        );
      }
    }

    return transformed;
  }

  private extractField(
    record: Record<string, string>,
    fieldName: string,
  ): string | null {
    // Try exact match first, then case-insensitive
    if (record[fieldName]) return record[fieldName];

    const lower = fieldName.toLowerCase();
    for (const [key, value] of Object.entries(record)) {
      if (key.toLowerCase() === lower) return value;
    }

    return null;
  }

  private cleanText(text: string | null | undefined): string | null {
    if (!text) return null;
    return (
      text
        .trim()
        .replace(/\s+/g, ' ') // normalize whitespace
        .replace(/^["']|["']$/g, '') // remove surrounding quotes
        .substring(0, 500) || null
    ); // cap at 500 chars
  }

  private parseStatus(statusStr: string | null): RecordStatus {
    if (!statusStr) return RecordStatus.PLANNED;
    const s = statusStr.toLowerCase().trim();

    if (s.includes('complet') || s.includes('done') || s.includes('finish')) {
      return RecordStatus.COMPLETED;
    }
    if (
      s.includes('ongoing') ||
      s.includes('progress') ||
      s.includes('under') ||
      s.includes('active')
    ) {
      return RecordStatus.ONGOING;
    }
    if (s.includes('cancel') || s.includes('drop')) {
      return RecordStatus.CANCELLED;
    }
    return RecordStatus.PLANNED;
  }

  private parseBudget(
    value: string | null,
    unit: 'crore' | 'lakh' | 'rupee',
  ): number | null {
    if (!value) return null;

    const num = parseFloat(value.replace(/[^0-9.]/g, ''));
    if (isNaN(num) || num <= 0) return null;

    switch (unit) {
      case 'crore':
        return Math.round(num * 10_000_000);
      case 'lakh':
        return Math.round(num * 100_000);
      default:
        return Math.round(num);
    }
  }

  private parseDate(dateStr: string | null): Date | null {
    if (!dateStr?.trim()) return null;

    const formats = [
      /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/,
      /^(\d{4})-(\d{2})-(\d{2})$/,
      /^(\d{1,2})[\/\-](\d{4})$/,
    ];

    for (const format of formats) {
      const match = dateStr.trim().match(format);
      if (match) {
        try {
          let date: Date;
          if (match.length === 4 && match[3]?.length === 4) {
            date = new Date(
              `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`,
            );
          } else if (match.length === 4) {
            date = new Date(`${match[1]}-${match[2]}-${match[3]}`);
          } else {
            date = new Date(`${match[2]}-${match[1].padStart(2, '0')}-01`);
          }
          if (!isNaN(date.getTime())) return date;
        } catch {
          continue;
        }
      }
    }

    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
}
