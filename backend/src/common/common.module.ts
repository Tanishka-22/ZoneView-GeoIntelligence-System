import { Module, Global } from '@nestjs/common';
import { SubscriptionGuard } from '../modules/subscriptions/guards/subscription.guard';
import { UsageGuard } from '../modules/usage/guards/usage.guard';
import { RolesGuard } from './guards/roles.guard';
import { SubscriptionsModule } from '../modules/subscriptions/subscriptions.module';
import { UsageModule } from '../modules/usage/usage.module';

/**
 * CommonModule provides shared guards globally.
 * By making this @Global, guards can be injected anywhere
 * without each module needing to import SubscriptionsModule/UsageModule.
 */
@Global()
@Module({
  imports: [SubscriptionsModule, UsageModule],
  providers: [SubscriptionGuard, UsageGuard, RolesGuard],
  exports: [SubscriptionGuard, UsageGuard, RolesGuard],
})
export class CommonModule {}