import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { SubscriptionGuard } from '../subscriptions/guards/subscription.guard';
import { UsageGuard } from '../usage/guards/usage.guard';
import { Feature } from '../../common/decorators/feature.decorator';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * POST /reports
   * Creates a report and enqueues generation — returns 202 Accepted immediately.
   * The report starts in PENDING status; the worker updates it to
   * GENERATING → READY (or FAILED).
   */
  @Post()
  @Feature('AI_REPORT')
  @UseGuards(JwtAuthGuard, SubscriptionGuard, UsageGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  async create(
    @CurrentUser() user: Omit<User, 'passwordHash'>,
    @Body() dto: CreateReportDto,
  ) {
    const { report, jobId } = await this.reportsService.create(user.id, dto);
    return {
      success: true,
      message: 'Report generation started. You will be notified when it is ready.',
      data: {
        report,
        jobId,
        statusUrl: `/api/v1/reports/${report.id}`,
      },
    };
  }

  /**
   * GET /reports
   * Lists all reports belonging to the current user.
   */
  @Get()
  async findAll(@CurrentUser() user: Omit<User, 'passwordHash'>) {
    const reports = await this.reportsService.findAllByUser(user.id);

    return {
      success: true,
      message: 'Reports fetched successfully',
      data: { reports },
    };
  }

  /**
   * GET /reports/:id
   * Returns a single report with live job progress if currently generating.
   * Poll this endpoint to track report generation progress.
   */
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: Omit<User, 'passwordHash'>,
  ) {
    const report = await this.reportsService.findById(id, user.id);

    return {
      success: true,
      message: 'Report fetched successfully',
      data: { report },
    };
  }

  /**
   * GET /reports/:id/download
   * Returns the download URL for a completed report.
   * Returns 400 if the report is not yet READY.
   */
  @Get(':id/download')
  async download(
    @Param('id') id: string,
    @CurrentUser() user: Omit<User, 'passwordHash'>,
  ) {
    const { fileUrl, title } = await this.reportsService.getDownloadUrl(
      id,
      user.id,
    );

    return {
      success: true,
      message: 'Download URL generated successfully',
      data: { fileUrl, title },
    };
  }
}