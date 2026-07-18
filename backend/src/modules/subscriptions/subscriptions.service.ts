import { Injectable, HttpStatus, Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../database/prisma.service';
import { AppException } from '../../common/exceptions/app.exception';
import { PlanType, Subscription, SubscriptionStatus } from '@prisma/client';
import { PLAN_PRICES } from '../../common/constants/plan-pricing.constants';
import type {
  PaymentProvider,
  CreateOrderResult,
} from './interfaces/payment-provider.interface';
import { QUEUES, JOBS } from '../../infrastructure/queue/queue.constants';
import { SendNotificationPayload } from '../../infrastructure/queue/interfaces/job-payload.interface';

export const PAYMENT_PROVIDER = 'PAYMENT_PROVIDER';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_PROVIDER) private readonly paymentProvider: PaymentProvider,
    @InjectQueue(QUEUES.NOTIFICATIONS)
    private readonly notificationsQueue: Queue,
  ) {}

  async assignFreePlan(userId: string): Promise<Subscription> {
    const freePlan = await this.prisma.plan.findUnique({
      where: { type: PlanType.FREE },
    });
    if (!freePlan) {
      throw new AppException(
        'Free plan not found',
        'PLAN_NOT_FOUND',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return this.prisma.subscription.create({
      data: { userId, planId: freePlan.id, status: SubscriptionStatus.ACTIVE },
    });
  }

  async getActiveSubscription(userId: string) {
    return this.prisma.subscription.findFirst({
      where: { userId, status: SubscriptionStatus.ACTIVE },
      include: { plan: true },
    });
  }

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

  /**
   * Step 1 of the upgrade flow — creates a Razorpay order.
   * No plan change happens yet. The frontend uses this to open Checkout.
   */
  async createUpgradeOrder(
    userId: string,
    planType: PlanType,
  ): Promise<CreateOrderResult & { planType: PlanType }> {
    const targetPlan = await this.prisma.plan.findUnique({
      where: { type: planType },
    });
    if (!targetPlan) {
      throw new AppException(
        'Plan not found',
        'PLAN_NOT_FOUND',
        HttpStatus.NOT_FOUND,
      );
    }

    const currentSubscription = await this.getCurrentSubscription(userId);
    if (currentSubscription.planId === targetPlan.id) {
      throw new AppException(
        `You are already on the ${targetPlan.name} plan`,
        'ALREADY_ON_PLAN',
        HttpStatus.CONFLICT,
      );
    }

    const price = PLAN_PRICES[planType];
    if (price === 0) {
      throw new AppException(
        'Free plan does not require payment',
        'NO_PAYMENT_NEEDED',
        HttpStatus.BAD_REQUEST,
      );
    }

    const order = await this.paymentProvider.createOrder(
      price,
      `upgrade_${userId}_${planType}_${Date.now()}`,
    );

    return { ...order, planType };
  }

  /**
   * Step 2 of the upgrade flow — verifies the payment Razorpay sent back
   * and only THEN updates the subscription. This is the point of no return.
   */
  async verifyAndUpgrade(
    userId: string,
    planType: PlanType,
    orderId: string,
    paymentId: string,
    signature: string,
  ): Promise<Subscription> {
    const isValid = await this.paymentProvider.verifyPayment({
      orderId,
      paymentId,
      signature,
    });

    if (!isValid) {
      throw new AppException(
        'Payment verification failed. If money was deducted, it will be refunded automatically.',
        'PAYMENT_VERIFICATION_FAILED',
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    const targetPlan = await this.prisma.plan.findUnique({
      where: { type: planType },
    });
    if (!targetPlan) {
      throw new AppException(
        'Plan not found',
        'PLAN_NOT_FOUND',
        HttpStatus.NOT_FOUND,
      );
    }

    const currentSubscription = await this.getCurrentSubscription(userId);

    const updatedSubscription = await this.prisma.subscription.update({
      where: { id: currentSubscription.id },
      data: {
        planId: targetPlan.id,
        status: SubscriptionStatus.ACTIVE,
        startDate: new Date(),
        endDate: null,
      },
      include: { plan: true },
    });

    await this.notificationsQueue.add(JOBS.NOTIFICATION.SEND, {
      userId,
      title: 'Plan upgraded successfully',
      message: `Payment confirmed. You are now on the ${targetPlan.name} plan.`,
    } satisfies SendNotificationPayload);

    return updatedSubscription;
  }
}
