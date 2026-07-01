import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { SubscriptionsService } from '../subscriptions.service';

/**
 * Verifies the authenticated user has an active subscription.
 * Must run after JwtAuthGuard (needs req.user populated).
 *
 * In ZoneView v1, every registered user has a Free subscription
 * (assigned at registration), so this guard mainly catches:
 * - Expired subscriptions
 * - Cancelled subscriptions
 * - Edge cases where subscription creation failed at registration
 */
@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { user } = context.switchToHttp().getRequest();

    const subscription =
      await this.subscriptionsService.getActiveSubscription(user.id);

    if (!subscription) {
      throw new ForbiddenException(
        'No active subscription. Please subscribe to access this feature.',
      );
    }

    // Attach subscription to request so UsageGuard and controllers
    // can access plan type without querying the database again
    const request = context.switchToHttp().getRequest();
    request.subscription = subscription;

    return true;
  }
}