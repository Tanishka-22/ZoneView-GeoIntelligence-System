import {
  Injectable,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsageFeature } from '@prisma/client';
import { UsageService } from '../usage.service';
import { FEATURE_KEY } from '../../../common/decorators/feature.decorator';
import {
  PLAN_LIMITS,
} from '../../../common/constants/plan-limits.constants';
import { AppException } from '../../../common/exceptions/app.exception';
import { HttpStatus } from '@nestjs/common';

@Injectable()
export class UsageGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly usageService: UsageService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Read which feature this route requires
    const featureName = this.reflector.getAllAndOverride<string>(
      FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No @Feature() decorator — no usage tracking needed
    if (!featureName) return true;

    const request = context.switchToHttp().getRequest();
    const { user, subscription } = request;

    // SubscriptionGuard must run before UsageGuard to populate req.subscription
    if (!subscription) return true;

    const planType = subscription.plan.type;
    const limit = PLAN_LIMITS[planType]?.[featureName];

    // -1 means unlimited (Pro/Team for searches)
    if (limit === -1) return true;

    // No limit defined for this feature on this plan
    if (limit === undefined) return true;

    // Check current usage against the limit
    const featureEnum = featureName as UsageFeature;
    const currentUsage = await this.usageService.getCurrentUsage(
      user.id,
      featureEnum,
    );

    if (currentUsage >= limit) {
      throw new AppException(
        `Monthly limit reached for ${featureName}. ` +
        `You have used ${currentUsage}/${limit} this billing cycle. ` +
        `Upgrade your plan for higher limits.`,
        'USAGE_LIMIT_EXCEEDED',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}