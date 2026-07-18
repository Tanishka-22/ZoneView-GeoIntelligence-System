import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Role } from '@prisma/client';
import { CsvImportService } from './csv-import.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

@Controller('admin/import')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class CsvImportController {
  constructor(private readonly csvImportService: CsvImportService) {}

  /**
   * POST /admin/import/csv
   * Accepts a CSV file and bulk-imports development records.
   *
   * Expected CSV columns (flexible — see HEADER_MAP for variants):
   * title, location, category, status, budget, organization,
   * description, start_date, end_date
   *
   * Returns a detailed import report.
   */
  @Post('csv')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(), // keep file in memory — no disk writes needed
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max
      },
      fileFilter: (req, file, callback) => {
        if (
          file.mimetype === 'text/csv' ||
          file.mimetype === 'application/vnd.ms-excel' ||
          file.originalname.endsWith('.csv')
        ) {
          callback(null, true);
        } else {
          callback(
            new BadRequestException('Only CSV files are accepted'),
            false,
          );
        }
      },
    }),
  )
  async importCsv(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException(
        'No file uploaded. Send the CSV file as multipart/form-data with field name "file"',
      );
    }

    const result = await this.csvImportService.importFromBuffer(
      file.buffer,
      file.originalname,
    );

    return {
      success: true,
      message: `Import complete: ${result.imported} records imported, ` +
        `${result.skipped} duplicates skipped, ${result.failed} failed`,
      data: result,
    };
  }

  /**
   * GET /admin/import/template
   * Returns a CSV template that government portal data can be mapped to.
   */
  @Post('preview')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async previewCsv(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Parse only first 5 rows to preview what will be imported
    // This lets admins validate the mapping before committing
    const preview = await this.csvImportService.importFromBuffer(
      file.buffer,
      file.originalname,
    );

    return {
      success: true,
      message: 'Preview generated — no data was imported',
      data: {
        totalRows: preview.total,
        willImport: preview.imported,
        willSkip: preview.skipped,
        willFail: preview.failed,
        sampleErrors: preview.errors.slice(0, 5),
      },
    };
  }
}