import { Module } from '@nestjs/common';
import { IngestionService } from './ingestion.service';
import { IngestionController } from './ingestion.controller';
import { GovernmentModule } from '../../../integrations/government/government.module';
import { CsvImportModule } from '../import/csv-import.module';

@Module({
  imports: [GovernmentModule, CsvImportModule],
  controllers: [IngestionController],
  providers: [IngestionService],
  exports: [IngestionService],
})
export class IngestionModule {}