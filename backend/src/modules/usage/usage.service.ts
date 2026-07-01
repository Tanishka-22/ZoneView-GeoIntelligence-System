import { Injectable } from '@nestjs/common';
import { UsageFeature } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { getCurrentBillingCycle } from '../../common/constants/plan-limits.constants';

@Injectable()
export class UsageService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get the current usage count for a feature in this billing cycle.
   * Returns 0 if no usage recorded yet this cycle.
   */
  async getCurrentUsage(
    userId: string,
    feature: UsageFeature,
  ): Promise<number> {
    const record = await this.prisma.usageRecord.findUnique({
      where: {
        userId_feature_billingCycle: {
          userId,
          feature,
          billingCycle: getCurrentBillingCycle(),
        },
      },
    });

    return record?.count ?? 0;
  }

  /**
   * Increment usage count for a feature by 1.
   * Uses upsert — creates the row on first use, increments on subsequent uses.
   * The @@unique constraint ensures exactly one row per user/feature/cycle.
   */
  async incrementUsage(
    userId: string,
    feature: UsageFeature,
  ): Promise<void> {
    await this.prisma.usageRecord.upsert({
      where: {
        userId_feature_billingCycle: {
          userId,
          feature,
          billingCycle: getCurrentBillingCycle(),
        },
      },
      update: {
        count: { increment: 1 },
      },
      create: {
        userId,
        feature,
        billingCycle: getCurrentBillingCycle(),
        count: 1,
      },
    });
  }

  /**
   * Get all usage records for the current billing cycle.
   * Used by GET /usage endpoint.
   */
  async getUserUsage(userId: string) {
    const cycle = getCurrentBillingCycle();

    const records = await this.prisma.usageRecord.findMany({
      where: { userId, billingCycle: cycle },
    });

    return {
      billingCycle: cycle,
      usage: records.map((r) => ({
        feature: r.feature,
        count: r.count,
      })),
    };
  }

  /**
   * Get full usage history across all billing cycles.
   */
  async getUserUsageHistory(userId: string) {
    return this.prisma.usageRecord.findMany({
      where: { userId },
      orderBy: { billingCycle: 'desc' },
    });
  }
}