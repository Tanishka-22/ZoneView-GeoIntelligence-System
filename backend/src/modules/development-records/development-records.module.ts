import { Module } from '@nestjs/common';
import { DevelopmentRecordsService } from './development-records.service';
import { DevelopmentRecordsController } from './development-records.controller';
import { AIModule } from '../ai/ai.module';

@Module({
  imports: [AIModule],
  controllers: [DevelopmentRecordsController],
  providers: [DevelopmentRecordsService],
  exports: [DevelopmentRecordsService],
})
export class DevelopmentRecordsModule {}
