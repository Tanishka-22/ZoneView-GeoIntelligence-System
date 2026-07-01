import { Module } from '@nestjs/common';
import { AdminDevelopmentRecordsService } from './admin-development-records.service';
import { AdminDevelopmentRecordsController } from './admin-development-records.controller';

@Module({
  controllers: [AdminDevelopmentRecordsController],
  providers: [AdminDevelopmentRecordsService],
})
export class AdminDevelopmentRecordsModule {}