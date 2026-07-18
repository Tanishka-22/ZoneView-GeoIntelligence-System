import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface DataGovResponse {
  success: boolean;
  count: number;
  total: number;
  records: Record<string, string>[];
}

@Injectable()
export class DataGovClient {
  private readonly logger = new Logger(DataGovClient.name);
  private readonly client: AxiosInstance;
  private readonly apiKey: string;
  private readonly BASE_URL = 'https://api.data.gov.in/resource';
  private readonly PAGE_SIZE = 100;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('ingestion.dataGovApiKey') || '';

    this.client = axios.create({
      baseURL: this.BASE_URL,
      timeout: 30000, // 30s timeout for slow government APIs
    });
  }

  /**
   * Fetch all records from a dataset, paginating through all pages.
   * data.gov.in returns max 100 records per request.
   */
  async fetchAllRecords(
    resourceId: string,
    filters: Record<string, string> = {},
  ): Promise<Record<string, string>[]> {
    if (!this.apiKey) {
      this.logger.warn('DATA_GOV_API_KEY not configured — skipping API fetch');
      return [];
    }

    const allRecords: Record<string, string>[] = [];
    let offset = 0;
    let total = Infinity;

    while (offset < total) {
      try {
        const params: Record<string, string | number> = {
          'api-key': this.apiKey,
          format: 'json',
          limit: this.PAGE_SIZE,
          offset,
          ...Object.fromEntries(
            Object.entries(filters).map(([k, v]) => [`filters[${k}]`, v]),
          ),
        };

        this.logger.debug(
          `Fetching ${resourceId} offset=${offset} (${allRecords.length}/${total === Infinity ? '?' : total})`,
        );

        const response = await this.client.get<DataGovResponse>(
          `/${resourceId}`,
          { params },
        );

        const data = response.data;

        if (!data.success) {
          this.logger.error(`API returned success=false for ${resourceId}`);
          break;
        }

        allRecords.push(...data.records);
        total = data.total;
        offset += this.PAGE_SIZE;

        // Rate limit — be polite to government servers
        if (offset < total) {
          await this.sleep(500); // 500ms between pages
        }

      } catch (err) {
        const error = err as any;
        if (error.response?.status === 429) {
          this.logger.warn('Rate limited by data.gov.in — waiting 5 seconds');
          await this.sleep(5000);
          continue; // retry same offset
        }

        if (error.response?.status === 401) {
          this.logger.error('Invalid data.gov.in API key');
          break;
        }

        this.logger.error(
          `Failed to fetch ${resourceId} at offset ${offset}: ${error.message}`,
        );
        break; // stop pagination on other errors
      }
    }

    this.logger.log(
      `Fetched ${allRecords.length} records from ${resourceId}`,
    );
    return allRecords;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}