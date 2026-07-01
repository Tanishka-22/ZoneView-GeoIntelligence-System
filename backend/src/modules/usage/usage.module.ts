import { Module } from '@nestjs/common';
import { UsageService } from './usage.service';
import { UsageController } from './usage.controller';

@Module({
  controllers: [UsageController],
  providers: [UsageService],
  exports: [UsageService], // UsageGuard needs this
})
export class UsageModule {}
