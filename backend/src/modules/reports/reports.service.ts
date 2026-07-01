import { Injectable, HttpStatus } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Report, ReportStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AppException } from '../../common/exceptions/app.exception';
import { CreateReportDto } from './dto/create-report.dto';
import { QUEUES, JOBS } from '../../infrastructure/queue/queue.constants';
import { GenerateReportPayload } from '../../infrastructure/queue/interfaces/job-payload.interface';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUES.REPORTS) private readonly reportsQueue: Queue,
  ) {}

  /**
   * Create a report record and enqueue the generation job.
   *
   * We create the DB record BEFORE enqueuing the job — this ensures
   * the report always exists in the database, even if the queue add fails.
   * The worker updates the record as it progresses.
   */
  async create(
    userId: string,
    dto: CreateReportDto,
  ): Promise<{ report: Report; jobId: string }> {
    // Validate location exists before creating a report for it
    const location = await this.prisma.location.findUnique({
      where: { id: dto.locationId },
    });

    if (!location) {
      throw new AppException(
        'Location not found',
        'LOCATION_NOT_FOUND',
        HttpStatus.NOT_FOUND,
      );
    }

    // Create the report record immediately — PENDING status
    const report = await this.prisma.report.create({
      data: {
        title: dto.title ?? `${location.name} Intelligence Report`,
        status: ReportStatus.PENDING,
        userId,
        locationId: dto.locationId,
      },
    });

    // Enqueue the generation job
    const job = await this.reportsQueue.add(
      JOBS.REPORT.GENERATE,
      {
        reportId: report.id,
        locationId: dto.locationId,
        userId,
      } satisfies GenerateReportPayload,
      {
        jobId: `report-${report.id}`, // deterministic job ID — prevents duplicate jobs
      },
    );

    return { report, jobId: job.id! };
  }

  async findAllByUser(userId: string): Promise<Report[]> {
    return this.prisma.report.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        location: {
          select: { id: true, name: true, slug: true },
        },
      },
    });
  }

  async findById(reportId: string, userId: string): Promise<Report & {
    jobProgress?: number;
  }> {
    const report = await this.prisma.report.findFirst({
      where: {
        id: reportId,
        userId, // ownership check — users can only see their own reports
      },
      include: {
        location: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!report) {
      throw new AppException(
        'Report not found',
        'REPORT_NOT_FOUND',
        HttpStatus.NOT_FOUND,
      );
    }

    // If the report is currently being generated, fetch live job progress
    // from BullMQ so we can show a progress indicator to the user
    let jobProgress: number | undefined;
    if (report.status === ReportStatus.GENERATING) {
      const job = await this.reportsQueue.getJob(`report-${reportId}`);
      if (job) {
        jobProgress = job.progress as number;
      }
    }

    return { ...report, jobProgress };
  }

  async getDownloadUrl(
    reportId: string,
    userId: string,
  ): Promise<{ fileUrl: string; title: string }> {
    const report = await this.findById(reportId, userId);

    if (report.status !== ReportStatus.READY) {
      throw new AppException(
        `Report is not ready for download. Current status: ${report.status}`,
        'REPORT_NOT_READY',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!report.fileUrl) {
      throw new AppException(
        'Report file not found',
        'REPORT_FILE_NOT_FOUND',
        HttpStatus.NOT_FOUND,
      );
    }

    // In production: generate a pre-signed S3 URL with a short expiry
    // (e.g., 15 minutes) so the file is only temporarily accessible
    // and not permanently public.
    // For now, return the stored file path as-is.
    return {
      fileUrl: report.fileUrl,
      title: report.title,
    };
  }
}