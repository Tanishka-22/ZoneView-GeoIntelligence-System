import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../database/prisma.service';
import { QUEUES, JOBS } from '../infrastructure/queue/queue.constants';
import { SendNotificationPayload } from '../infrastructure/queue/interfaces/job-payload.interface';

/**
 * Notification Worker
 *
 * Processes jobs from the notifications queue.
 * Currently creates in-app notification records.
 * Future: send emails, push notifications.
 */
@Processor(QUEUES.NOTIFICATIONS)
export class NotificationWorker extends WorkerHost {
  private readonly logger = new Logger(NotificationWorker.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  /**
   * WorkerHost requires implementing the `process` method.
   * Route to the correct handler based on job name.
   */
  async process(job: Job): Promise<void> {
    this.logger.log(`Processing job: ${job.name} (id: ${job.id})`);

    switch (job.name) {
      case JOBS.NOTIFICATION.SEND:
        await this.handleSendNotification(
          job as Job<SendNotificationPayload>,
        );
        break;
      default:
        this.logger.warn(`Unknown job type: ${job.name}`);
    }
  }

  private async handleSendNotification(
    job: Job<SendNotificationPayload>,
  ): Promise<void> {
    const { userId, title, message } = job.data;

    await this.prisma.notification.create({
      data: {
        userId,
        title,
        message,
      },
    });

    this.logger.log(`Notification created for user ${userId}: ${title}`);
  }
}