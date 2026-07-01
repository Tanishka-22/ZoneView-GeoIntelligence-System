import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { ReportStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AIInsightService } from '../modules/ai/services/ai-insight.service';
import { QUEUES, JOBS } from '../infrastructure/queue/queue.constants';
import {
  GenerateReportPayload,
  SendNotificationPayload,
} from '../infrastructure/queue/interfaces/job-payload.interface';

/**
 * Report Worker
 *
 * Processes report generation jobs asynchronously.
 *
 * Flow for each job:
 * 1. Mark report as GENERATING
 * 2. Fetch location data
 * 3. Generate AI summary
 * 4. Simulate PDF creation (real PDF generation in a future sprint)
 * 5. Mark report as READY with file URL
 * 6. Enqueue notification for the user
 *
 * If any step fails:
 * - BullMQ retries the job (up to 3 times, exponential backoff)
 * - After max retries, marks report as FAILED
 */
@Processor(QUEUES.REPORTS)
export class ReportWorker extends WorkerHost {
  private readonly logger = new Logger(ReportWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiInsightService: AIInsightService,
    @InjectQueue(QUEUES.NOTIFICATIONS)
    private readonly notificationsQueue: Queue,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing job: ${job.name} (id: ${job.id})`);

    switch (job.name) {
      case JOBS.REPORT.GENERATE:
        await this.handleGenerateReport(job as Job<GenerateReportPayload>);
        break;
      default:
        this.logger.warn(`Unknown job type: ${job.name}`);
    }
  }

  private async handleGenerateReport(
    job: Job<GenerateReportPayload>,
  ): Promise<void> {
    const { reportId, locationId, userId } = job.data;

    try {
      // Step 1 — Mark as GENERATING so the frontend knows work has started
      await job.updateProgress(10);
      await this.prisma.report.update({
        where: { id: reportId },
        data: { status: ReportStatus.GENERATING },
      });

      // Step 2 — Fetch location details
      await job.updateProgress(20);
      const location = await this.prisma.location.findUnique({
        where: { id: locationId },
        include: {
          developmentRecords: {
            include: { category: true, organization: true },
          },
        },
      });

      if (!location) {
        throw new Error(`Location ${locationId} not found`);
      }

      // Step 3 — Generate AI summary for the report
      await job.updateProgress(40);
      this.logger.log(`Generating AI summary for report ${reportId}`);
      const insight = await this.aiInsightService.explainLocation(locationId);

      // Step 4 — Simulate PDF generation
      // In production: use a PDF library (puppeteer, pdfkit) to render
      // a real PDF from location data + AI summary + charts.
      // For now, we store a placeholder URL that represents where the
      // PDF would be stored in S3-compatible object storage.
      await job.updateProgress(70);
      this.logger.log(`Generating PDF for report ${reportId}`);

      await this.simulatePdfGeneration();

      const fileUrl = `reports/${userId}/${reportId}/report-${location.slug}.pdf`;

      // Step 5 — Mark report as READY
      await job.updateProgress(90);
      await this.prisma.report.update({
        where: { id: reportId },
        data: {
          status: ReportStatus.READY,
          fileUrl,
        },
      });

      this.logger.log(`Report ${reportId} ready: ${fileUrl}`);

      // Step 6 — Notify the user
      await this.notificationsQueue.add(
        JOBS.NOTIFICATION.SEND,
        {
          userId,
          title: 'Your report is ready',
          message: `Your regional intelligence report for ${location.name} has been generated and is ready to download.`,
        } satisfies SendNotificationPayload,
        { attempts: 2 },
      );

      await job.updateProgress(100);
      this.logger.log(`Report job ${job.id} completed successfully`);
    } catch (error) {
      // Mark the report as FAILED so the user knows something went wrong
      // rather than leaving it stuck in GENERATING forever.
      await this.prisma.report.update({
        where: { id: reportId },
        data: { status: ReportStatus.FAILED },
      });

      this.logger.error(
        `Report job ${job.id} failed: ${(error as Error).message}`,
      );

      // Re-throw so BullMQ knows the job failed and can retry
      throw error;
    }
  }

  private async simulatePdfGeneration(): Promise<void> {
    // Simulates the time real PDF generation would take
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
}