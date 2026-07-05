import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { LocationsModule } from './modules/locations/locations.module';
import { DevelopmentRecordsModule } from './modules/development-records/development-records.module';
import { SearchModule } from './modules/search/search.module';
import { AdminDevelopmentRecordsModule } from './modules/admin/development-records/admin-development-records.module';
import { AIModule } from './modules/ai/ai.module';
import { QueueModule } from './infrastructure/queue/queue.module';
import { WorkersModule } from './workers.module';
import { ReportsModule } from './modules/reports/reports.module';
import { UsageModule } from './modules/usage/usage.module';
import { CommonModule } from './common/common.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

import { envValidationSchema } from './config/env.validation';
import appConfig from './config/app.config';
import authConfig from './config/auth.config';
import databaseConfig from './config/database.config';
import redisConfig from './config/redis.config';
import aiConfig from './config/ai.config';
import { CacheModule } from './infrastructure/cache/cache.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { WinstonModule } from 'nest-winston';
import { loggerConfig } from './config/logger.config';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      load: [appConfig, authConfig, databaseConfig, redisConfig, aiConfig],
      validationOptions: {
        abortEarly: true,
      },
    }),
    WinstonModule.forRoot(loggerConfig()),
    DatabaseModule,
    CommonModule,
    UsersModule,
    AuthModule,
    CacheModule,
    SearchModule,
    AdminDevelopmentRecordsModule,
    AIModule,
    LocationsModule,
    DevelopmentRecordsModule,
    QueueModule,
    WorkersModule,
    ReportsModule,
    SubscriptionsModule,
    UsageModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
