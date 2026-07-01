import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { QUEUES } from '../../infrastructure/queue/queue.constants';

@Module({
  imports: [
    // ReportsService needs to inject the reports queue
    BullModule.registerQueue({ name: QUEUES.REPORTS }),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}