import { registerAs } from '@nestjs/config';

export default registerAs('ingestion', () => ({
  dataGovApiKey: process.env.DATA_GOV_API_KEY,
  syncEnabled: process.env.DATA_SYNC_ENABLED === 'true',
  syncCronExpression: process.env.DATA_SYNC_CRON || '0 2 * * *', // 2 AM daily
}));