import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SubscriptionsService, PAYMENT_PROVIDER } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { RazorpayPaymentProvider } from './providers/razorpay-payment.provider';
import { QUEUES } from '../../infrastructure/queue/queue.constants';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUES.NOTIFICATIONS })],
  controllers: [SubscriptionsController],
  providers: [
    SubscriptionsService,
    RazorpayPaymentProvider,
    { provide: PAYMENT_PROVIDER, useClass: RazorpayPaymentProvider },
  ],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}