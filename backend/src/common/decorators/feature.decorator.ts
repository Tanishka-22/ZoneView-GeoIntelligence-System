import { SetMetadata } from '@nestjs/common';

export const FEATURE_KEY = 'feature';

/**
 * Marks a route as requiring a specific feature.
 * Read by UsageGuard to check and increment usage quota.
 *
 * Usage:
 * @Feature('AI_INSIGHT')
 * @UseGuards(JwtAuthGuard, SubscriptionGuard, UsageGuard)
 * @Post(':id/explain')
 * async explain() { ... }
 */
export const Feature = (featureName: string) =>
  SetMetadata(FEATURE_KEY, featureName);