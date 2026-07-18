import { Module } from '@nestjs/common';
import { DataGovClient } from './data-gov/data-gov.client';
import { DataGovTransformer } from './data-gov/data-gov.transformer';
import { SmartCitiesScraper } from './smart-cities/smart-cities.scraper';
import { SmartCitiesTransformer } from './smart-cities/smart-cities.transformer';

@Module({
  providers: [
    DataGovClient,
    DataGovTransformer,
    SmartCitiesScraper,
    SmartCitiesTransformer,
  ],
  exports: [
    DataGovClient,
    DataGovTransformer,
    SmartCitiesScraper,
    SmartCitiesTransformer,
  ],
})
export class GovernmentModule {}