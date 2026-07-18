import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Logger, OnModuleInit } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { IngestionService } from '../modules/admin/ingestion/ingestion.service';
import { QUEUES, JOBS } from '../infrastructure/queue/queue.constants';

/**
 * Data Sync Worker
 *
 * Runs the nightly data sync from data.gov.in.
 * Registers a repeatable BullMQ job on startup so the sync
 * runs automatically without any manual triggering.
 *
 * Schedule: 2:00 AM daily (configurable via DATA_SYNC_CRON env var)
 */
@Processor(QUEUES.DATA_SYNC)
export class DataSyncWorker extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(DataSyncWorker.name);

  constructor(
    private readonly ingestionService: IngestionService,
    private readonly configService: ConfigService,
    @InjectQueue(QUEUES.DATA_SYNC)
    private readonly dataSyncQueue: Queue,
  ) {
    super();
  }

  /**
   * Register the repeatable sync job when the worker starts.
   * BullMQ stores this in Redis — it survives server restarts.
   */
  async onModuleInit() {
    const syncEnabled = this.configService.get<boolean>('ingestion.syncEnabled');

    if (!syncEnabled) {
      this.logger.log('Automated data sync is disabled (DATA_SYNC_ENABLED != true)');
      return;
    }

    const cronExpression = this.configService.get<string>(
      'ingestion.syncCronExpression',
    ) || '0 2 * * *';

    // Remove existing repeatable jobs to avoid duplicates on restart
    const repeatableJobs = await this.dataSyncQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      if (job.name === JOBS.DATA_SYNC.FULL_SYNC) {
        await this.dataSyncQueue.removeRepeatableByKey(job.key);
      }
    }

    // Register the new repeatable job
    await this.dataSyncQueue.add(
      JOBS.DATA_SYNC.FULL_SYNC,
      { triggeredBy: 'scheduler' },
      {
        repeat: { pattern: cronExpression },
        jobId: 'nightly-data-sync', // stable ID prevents duplicates
      },
    );

    this.logger.log(
      `Nightly data sync scheduled: ${cronExpression} (Asia/Kolkata)`,
    );
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing job: ${job.name} (id: ${job.id})`);

    switch (job.name) {
      case JOBS.DATA_SYNC.FULL_SYNC:
        await this.handleFullSync(job);
        break;
      default:
        this.logger.warn(`Unknown job type: ${job.name}`);
    }
  }

  private async handleFullSync(job: Job): Promise<void> {
    try {
      await job.updateProgress(10);
      this.logger.log('Starting nightly data sync...');

      const result = await this.ingestionService.syncAll();

      await job.updateProgress(100);

      this.logger.log(
        `Nightly sync complete: ${result.totalImported} imported, ` +
        `${result.totalSkipped} skipped in ${result.duration}`,
      );

    } catch (err) {
      this.logger.error(`Nightly sync failed: ${(err as Error).message}`);
      throw err; // re-throw for BullMQ retry
    }
  }
}