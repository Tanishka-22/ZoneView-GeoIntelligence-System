import { Module } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
//import { PrismaModule } from '../../database/prisma.service';

@Module({
  //imports: [PrismaModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService], // SubscriptionGuard needs this
})
export class SubscriptionsModule {}