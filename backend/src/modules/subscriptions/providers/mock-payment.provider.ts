import { Injectable, Logger } from '@nestjs/common';
import type {
  PaymentProvider,
  CreateOrderResult,
  VerifyPaymentInput,
} from '../interfaces/payment-provider.interface';

@Injectable()
export class MockPaymentProvider implements PaymentProvider {
  private readonly logger = new Logger(MockPaymentProvider.name);

  async createOrder(
    amountInRupees: number,
    receipt: string,
  ): Promise<CreateOrderResult> {
    this.logger.log(
      `[MOCK PAYMENT] Creating order for ₹${amountInRupees} (${receipt})`,
    );

    return {
      orderId: `mock_order_${Date.now()}`,
      amount: amountInRupees * 100, // convert rupees → paise
      currency: 'INR',
      keyId: 'rzp_test_mock_key',
    };
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<boolean> {
    this.logger.log(`[MOCK PAYMENT] Verifying payment ${input.paymentId}`);

    // Always succeed in mock mode
    return true;
  }
}
