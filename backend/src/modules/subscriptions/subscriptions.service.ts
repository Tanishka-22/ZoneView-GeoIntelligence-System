import { Injectable, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AppException } from '../../common/exceptions/app.exception';
import { PlanType, Subscription, SubscriptionStatus } from '@prisma/client';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Assign the Free plan to a newly registered user.
   * Called from AuthService.register() after user creation.
   */
  async assignFreePlan(userId: string): Promise<Subscription> {
    const freePlan = await this.prisma.plan.findUnique({
      where: { type: PlanType.FREE },
    });

    if (!freePlan) {
      throw new AppException(
        'Free plan not found. Please run the database seed.',
        'PLAN_NOT_FOUND',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return this.prisma.subscription.create({
      data: {
        userId,
        planId: freePlan.id,
        status: SubscriptionStatus.ACTIVE,
      },
    });
  }

  /**
   * Get the current user's active subscription with plan details.
   */
  async getActiveSubscription(userId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
      },
      include: { plan: true },
    });

    return subscription;
  }

  /**
   * Get all available plans for the pricing page.
   */
  async getPlans() {
    return this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { type: 'asc' },
    });
  }

  async getCurrentSubscription(userId: string) {
    const subscription = await this.getActiveSubscription(userId);

    if (!subscription) {
      throw new AppException(
        'No active subscription found',
        'NO_ACTIVE_SUBSCRIPTION',
        HttpStatus.NOT_FOUND,
      );
    }

    return subscription;
  }
}