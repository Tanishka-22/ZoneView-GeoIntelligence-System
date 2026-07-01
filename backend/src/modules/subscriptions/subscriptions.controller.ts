import { Controller, Get, UseGuards } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '@prisma/client';

@Controller()
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  /** Public — pricing page */
  @Get('plans')
  async getPlans() {
    const plans = await this.subscriptionsService.getPlans();
    return {
      success: true,
      message: 'Plans fetched successfully',
      data: { plans },
    };
  }

  /** Protected — current user's subscription */
  @Get('subscription')
  @UseGuards(JwtAuthGuard)
  async getSubscription(
    @CurrentUser() user: Omit<User, 'passwordHash'>,
  ) {
    const subscription =
      await this.subscriptionsService.getCurrentSubscription(user.id);

    return {
      success: true,
      message: 'Subscription fetched successfully',
      data: { subscription },
    };
  }
}