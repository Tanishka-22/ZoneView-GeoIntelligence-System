import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QUEUES } from './queue.constants';

/**
 * Registers all BullMQ queues and makes them available globally.
 *
 * @Global() means any module can inject a Queue without importing
 * QueueModule — same pattern as DatabaseModule and CacheModule.
 *
 * BullModule.forRootAsync connects BullMQ to our Redis instance
 * using the same REDIS_URL we configured in Sprint 0.
 */
@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: extractRedisHost(configService.get<string>('redis.url')!),
          port: extractRedisPort(configService.get<string>('redis.url')!),
        },
        defaultJobOptions: {
          attempts: 3,            // retry failed jobs up to 3 times
          backoff: {
            type: 'exponential',  // wait longer between each retry
            delay: 2000,          // start with 2 second delay
          },
          removeOnComplete: 100,  // keep last 100 completed jobs for debugging
          removeOnFail: 200,      // keep last 200 failed jobs for investigation
        },
      }),
    }),
    // Register each queue — workers and producers reference these by name
    BullModule.registerQueue(
      { name: QUEUES.REPORTS },
      { name: QUEUES.NOTIFICATIONS },
      { name: QUEUES.AI_GENERATION },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}

// ─── Helpers ──────────────────────────────────────────────────

/**
 * Parse Redis URL (redis://host:port) into host/port components.
 * BullMQ needs host and port separately, not a connection URL.
 */
function extractRedisHost(redisUrl: string): string {
  try {
    const url = new URL(redisUrl);
    return url.hostname;
  } catch {
    return 'localhost';
  }
}

function extractRedisPort(redisUrl: string): number {
  try {
    const url = new URL(redisUrl);
    return parseInt(url.port || '6379', 10);
  } catch {
    return 6379;
  }
}