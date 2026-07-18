import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { IngestionService } from './ingestion.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { MP_DATASETS } from '../../../integrations/government/data-gov/datasets.config';

@Controller('admin/ingestion')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  /**
   * POST /admin/ingestion/sync
   * Manually trigger a full sync of all configured datasets.
   * Also called by the nightly BullMQ worker.
   */
  @Post('sync')
  @HttpCode(HttpStatus.OK)
  async syncAll() {
    const result = await this.ingestionService.syncAll();

    return {
      success: true,
      message: `Sync complete: ${result.totalImported} records imported`,
      data: result,
    };
  }

  /**
   * POST /admin/ingestion/sync/smart-cities
   * Manually trigger the Smart Cities Mission scraper.
   */
  @Post('sync/smart-cities')
  @HttpCode(HttpStatus.OK)
  async syncSmartCities() {
    const result = await this.ingestionService.syncSmartCities();

    return {
      success: true,
      message: `Smart Cities sync complete: ${result.imported} imported`,
      data: result,
    };
  }

  /**
   * POST /admin/ingestion/sync/:index
   * Sync a single dataset by index.
   * Useful for testing individual data sources.
   */
  @Post('sync/:index')
  @HttpCode(HttpStatus.OK)
  async syncDataset(@Param('index') index: string) {
    const result = await this.ingestionService.syncDataset(parseInt(index, 10));

    return {
      success: true,
      message: `Dataset sync complete: ${result.imported} imported`,
      data: result,
    };
  }

  /**
   * GET /admin/ingestion/datasets
   * List all configured datasets with their indices.
   */
  @Get('datasets')
  // eslint-disable-next-line @typescript-eslint/require-await
  async listDatasets() {
    return {
      success: true,
      message: 'Configured datasets',
      data: {
        datasets: MP_DATASETS.map((d, i) => ({
          index: i,
          name: d.name,
          resourceId: d.resourceId,
          defaultCategory: d.defaultCategory,
        })),
      },
    };
  }
}
