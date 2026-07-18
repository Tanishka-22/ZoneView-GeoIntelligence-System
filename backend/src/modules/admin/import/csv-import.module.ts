import { Module } from '@nestjs/common';
import { CsvImportService } from './csv-import.service';
import { CsvImportController } from './csv-import.controller';

@Module({
  controllers: [CsvImportController],
  providers: [CsvImportService],
  exports: [CsvImportService],
})
export class CsvImportModule {}