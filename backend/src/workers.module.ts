import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ReportWorker } from './workers/report.worker';
import { NotificationWorker } from './workers/notification.worker';
import { AIModule } from './modules/ai/ai.module';
import { DataSyncWorker } from './workers/data-sync.worker';
import { IngestionModule } from './modules/admin/ingestion/ingestion.module';
import { QUEUES } from './infrastructure/queue/queue.constants';

/**
 * WorkersModule registers all background job processors.
 *
 * Workers need:
 * 1. BullModule.registerQueue — to inject the Queue for adding jobs
 * 2. Any modules whose services they use (AIModule for ReportWorker)
 *
 * Note: Workers also need PrismaService — but since DatabaseModule
 * is @Global(), PrismaService is already available everywhere.
 */
@Module({
  imports: [
    // Workers need queue references to inject queues and register processors
    BullModule.registerQueue(
      { name: QUEUES.REPORTS },
      { name: QUEUES.NOTIFICATIONS },
      { name: QUEUES.DATA_SYNC },
    ),
    AIModule, // ReportWorker uses AIInsightService
    IngestionModule, // DataSyncWorker uses IngestionService
  ],
  providers: [ReportWorker, NotificationWorker, DataSyncWorker],
})
export class WorkersModule {}
